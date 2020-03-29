FROM node:12.16.1

RUN apt-get update
RUN apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev mongodb

WORKDIR /var
COPY ./resources/fonts ./resources/fonts
COPY ./node-common ./node-common
COPY ./common ./common

WORKDIR /var/node-common
RUN npm ci

WORKDIR /var/app

COPY ./api .
RUN mkdir -p /usr/share/fonts/opentype
RUN mkdir -p /usr/share/fonts/truetype
RUN mv ./fonts/truetype/* /usr/share/fonts/truetype
RUN mv ./fonts/opentype/* /usr/share/fonts/opentype

RUN npm ci
RUN npm run buildquiz
RUN service mongodb start ; sleep 15 && npm run buildshiritori

RUN chmod +x ./start.sh
CMD ./start.sh
