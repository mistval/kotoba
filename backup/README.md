# Backup

Periodically back up user data to Google Cloud Storage.

## Setup

Create a Cloud Storage bucket and enter its name in the top section of ./backup.sh

Create a GCP service account and save its json key into this directory as gcloud_key.json.

Run `sh ./init.sh` to initialize a cron job to backup twice per day at 9:00 and 21:00 UTC.

## Manual backup

`sh ./backup.sh`
