FROM node
WORKDIR /var/app

RUN apt-get update
RUN apt-get -y install ffmpeg build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev mongodb

COPY ./fonts ./fonts
RUN mv ./fonts/truetype/* /usr/share/fonts/truetype
RUN mv ./fonts/opentype/* /usr/share/fonts/opentype

COPY ./package.json .
COPY ./package-lock.json .
RUN npm ci

COPY ./src/common/pronunciation_db.js ./src/common/pronunciation_db.js
COPY ./src/common/mongo_connect.js ./src/common/mongo_connect.js
COPY ./src/build ./src/build
COPY ./resources ./resources
RUN service mongodb start && npm run buildall

RUN mkdir latest_log data

COPY ./start.sh ./start.sh
COPY ./src ./src
COPY ./config.json ./config.json
COPY ./api_keys.json ./api_keys.json
RUN chmod +x ./start.sh
CMD ["./start.sh"]
