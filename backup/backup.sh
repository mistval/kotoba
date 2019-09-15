#!/bin/bash

bucket_name=kotoba_backup_n

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd $parent_path/..

rm -rf ./backup_out
mkdir -p ./backup_out/user_data/bot
docker-compose exec -T mongo_readwrite mongodump --archive=./mongo_dump.archive
docker-compose exec -T mongo_readwrite cat ./mongo_dump.archive > ./backup_out/mongo_dump.archive

cp -r ./user_data/bot/monochrome-persistence ./backup_out/user_data/bot
cp -r ./user_data/bot/quiz_saves ./backup_out/user_data/bot
cp -r ./user_data/shared_data ./backup_out/user_data

now=$(date +"%m-%d-%Y-%H-%M")
object_name="backup_$now"
file_name="$object_name.tar.gz"

rm -rf ./gsutil_volume
mkdir ./gsutil_volume
tar cvfz ./gsutil_volume/$file_name ./backup_out

docker run -v $parent_path/../gsutil_volume/:/var/backup -v $parent_path/../backup:/var/gcloud_key google/cloud-sdk /bin/bash -c "gcloud auth activate-service-account --key-file=/var/gcloud_key/gcloud_key.json && gsutil cp /var/backup/* gs://$bucket_name"
