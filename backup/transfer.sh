#!/bin/bash

set -e

ip=$1

if [ -z "$ip" ]
then
  echo "Must provide a destination IP"
  exit 2
fi

ssh root@$1 "docker -v && docker-compose -v"
rsync -rtv ~/kotoba root@$ip:~/
ssh root@$1 "cd kotoba && docker-compose pull"
