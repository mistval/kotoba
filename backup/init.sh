#!/bin/bash

echo "0 9,21 * * * root /root/kotoba/backup/backup.sh" > /etc/cron.d/kotoba_backup
