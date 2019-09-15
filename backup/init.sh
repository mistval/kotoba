#!/bin/bash

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

docker pull google/cloud-sdk

echo "0 9,21 * * * root sh $parent_path/backup.sh" > /etc/cron.d/kotoba_backup
