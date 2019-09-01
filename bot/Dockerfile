FROM node:12.9.0

RUN apt-get update
RUN apt-get -y install ffmpeg mongodb

WORKDIR /var
COPY ./node-common ./node-common
WORKDIR /var/node-common
RUN npm ci

WORKDIR /var/app

COPY ./bot/package.json .
COPY ./bot/package-lock.json .
RUN npm ci

COPY ./bot/src/common/pronunciation_db.js ./src/common/pronunciation_db.js
COPY ./bot/src/common/mongo_connect.js ./src/common/mongo_connect.js
COPY ./bot/resources/dictionaries ./resources/dictionaries
COPY ./bot/src/build ./src/build
RUN service mongodb start ; npm run buildpronunciation && npm run buildshiritori

COPY ./bot/fonts ./fonts
COPY ./bot/src/common/font_helper.js ./src/common/font_helper.js
RUN npm run buildfontcharactermap

COPY ./bot/resources ./resources
RUN npm run buildquiz

RUN mkdir latest_log data

COPY ./bot/start.sh ./start.sh
COPY ./bot/src ./src

COPY ./config.js ./gcloud_key.json* ./../

RUN chmod +x ./start.sh
CMD ["./start.sh"]
