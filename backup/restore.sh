#!/bin/bash

set -e
set -x

bucket_name=kotoba_backup_n
file_name=backup.tar.gz

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd $parent_path

cp -f ./../config/gcloud_key.json .

sudo docker run -v $parent_path:/var/backup gcr.io/google.com/cloudsdktool/google-cloud-cli:alpine /bin/bash -c "gcloud auth activate-service-account --key-file=/var/backup/gcloud_key.json && gsutil cp gs://$bucket_name/$file_name /var/backup"

rm -rf ./temp
mkdir temp
tar xzf $file_name -C ./temp

cd ..

sudo docker compose up -d mongo_readwrite
sudo docker exec -i $(sudo docker compose ps -q mongo_readwrite) sh -c ' exec mongorestore --drop --archive' < ./backup/temp/root/kotoba/backup/backup_out/mongo_dump.archive

sudo rm -rf ./user_data/bot/monochrome-persistence
sudo rm -rf ./user_data/bot/quiz_saves
sudo rm -rf ./user_data/shared_data/custom_decks
sudo mkdir -p ./user_data/bot/
sudo mkdir -p ./user_data/shared_data/
sudo mv -f ./backup/temp/root/kotoba/backup/backup_out/user_data/bot/* ./user_data/bot/
sudo mv -f ./backup/temp/root/kotoba/backup/backup_out/user_data/shared_data/* ./user_data/shared_data/

sudo rm -rf ./backup/temp
