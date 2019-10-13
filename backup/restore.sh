#!/bin/bash

bucket_name=kotoba_backup_n
file_name=backup.tar.gz

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd $parent_path

cp -f ./../config/gcloud_key.json .

docker run -v $parent_path:/var/backup google/cloud-sdk:alpine /bin/bash -c "gcloud auth activate-service-account --key-file=/var/backup/gcloud_key.json && gsutil cp gs://$bucket_name/$file_name /var/backup"

rm -rf ./temp
mkdir temp
tar xzf $file_name -C ./temp

cd ..

docker-compose up -d mongo_readwrite
docker exec -i $(docker-compose ps -q mongo_readwrite) sh -c ' exec mongorestore --drop --archive' < ./backup/temp/backup_out/mongo_dump.archive

rm -rf ./user_data/bot/monochrome-persistence
rm -rf ./user_data/bot/quiz_saves
rm -rf ./user_data/shared_data/custom_decks
mv -f ./backup/temp/backup_out/user_data/bot/* ./user_data/bot/
mv -f ./backup/temp/backup_out/user_data/shared_data/* ./user_data/shared_data/

rm -rf ./backup/temp
