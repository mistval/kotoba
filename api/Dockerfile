FROM node:10.15.0
WORKDIR /var/app

RUN apt-get update
RUN apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev mongodb

WORKDIR /var
COPY ./node-common ./node-common
COPY ./common ./common

WORKDIR /var/node-common
RUN npm link

WORKDIR /var/common
RUN npm link

WORKDIR /var/app

COPY ./api .
RUN mv ./fonts/truetype/* /usr/share/fonts/truetype
RUN mv ./fonts/opentype/* /usr/share/fonts/opentype

RUN npm ci
RUN npm link kotoba-node-common
RUN npm link kotoba-common
RUN npm run buildquiz
RUN service mongodb start && npm run buildshiritori

RUN chmod +x ./start.sh
CMD ./start.sh
