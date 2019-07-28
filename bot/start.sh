#!/bin/bash
service mongodb start
exec npm start >> ./latest_log/logs.log 2>&1
