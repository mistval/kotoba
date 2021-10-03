#!/bin/bash

bucket_name=kotoba_backup_n
file_name=backup.tar.gz
kotoba_directory=/root/kotoba

rm -rf $kotoba_directory/backup/backup_out
mkdir -p $kotoba_directory/backup/backup_out/user_data/bot

cd $kotoba_directory
docker-compose exec -T mongo_readwrite mongodump --archive=./mongo_dump.archive --db=kotoba --excludeCollection=gamereports --excludeCollection=userreviewdecks --excludeCollection=locationreviewdecks
docker-compose exec -T mongo_readwrite cat ./mongo_dump.archive > $kotoba_directory/backup/backup_out/mongo_dump.archive

cp -r $kotoba_directory/user_data/bot/quiz_saves $kotoba_directory/backup/backup_out/user_data/bot
cp -r $kotoba_directory/user_data/shared_data $kotoba_directory/backup/backup_out/user_data

rm -rf $kotoba_directory/backup/gsutil_volume
mkdir $kotoba_directory/backup/gsutil_volume
tar cvfz $kotoba_directory/backup/gsutil_volume/$file_name $kotoba_directory/backup/backup_out
cp -f $kotoba_directory/config/gcloud_key.json $kotoba_directory/backup/gsutil_volume

docker run -v $kotoba_directory/backup/gsutil_volume/:/var/backup google/cloud-sdk:alpine /bin/bash -c "gcloud auth activate-service-account --key-file=/var/backup/gcloud_key.json && gsutil cp /var/backup/$file_name gs://$bucket_name"

rm -rf $kotoba_directory/backup/gsutil_volume
rm -rf $kotoba_directory/backup/backup_out
