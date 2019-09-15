parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd $parent_path

compressed_backup=$parent_path/$(ls backup_*.tar.gz)

echo Restoring from $compressed_backup

rm -rf ./temp
mkdir temp
tar xzf $compressed_backup -C ./temp

cd ..

docker-compose up -d mongo_readwrite
docker exec -i $(docker-compose ps -q mongo_readwrite) sh -c ' exec mongorestore --drop --archive' < ./backup/temp/backup_out/mongo_dump.archive

rm -rf ./user_data/bot/monochrome-persistence
rm -rf ./user_data/bot/quiz_saves
rm -rf ./user_data/shared_data/custom_decks
mv -f ./backup/temp/backup_out/user_data/bot/* ./user_data/bot/
mv -f ./backup/temp/backup_out/user_data/shared_data/* ./user_data/shared_data/

rm -rf ./temp
