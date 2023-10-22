FROM arm64v8/node:18.18.2

RUN apt-get update
RUN apt-get -y install ffmpeg build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /var
COPY ./node-common ./node-common
COPY ./common ./common
WORKDIR /var/node-common
RUN npm ci

WORKDIR /var/app

COPY ./bot/package.json .
COPY ./bot/package-lock.json .
RUN npm ci

COPY ./resources ./../resources
RUN npm run buildresources

RUN mkdir data

COPY ./bot/src ./src

CMD ["npm", "start"]
