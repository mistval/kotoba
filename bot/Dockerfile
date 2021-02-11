FROM node:12.20.2

RUN apt-get update
RUN apt-get -y install ffmpeg

WORKDIR /var
COPY ./node-common ./node-common
COPY ./common ./common
WORKDIR /var/node-common
RUN npm ci

WORKDIR /var/app

COPY ./bot/package.json .
COPY ./bot/package-lock.json .
RUN npm ci

COPY ./resources/dictionaries ./../resources/dictionaries
COPY ./bot/src/build ./src/build

COPY ./resources/quiz_audio ./../resources/quiz_audio

COPY ./resources/fonts ./../resources/fonts
RUN npm run buildfontcharactermap

COPY ./resources/quiz_data ./../resources/quiz_data
RUN npm run buildquiz

COPY ./resources ./../resources
RUN npm run buildresources

RUN mkdir data

COPY ./bot/src ./src

CMD ["npm", "start"]
