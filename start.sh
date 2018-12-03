#!/bin/bash
service mongodb start
exec node . >> ./latest_log/logs.log 2>&1
