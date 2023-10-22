FROM arm64v8/node:18.18.2

RUN apt-get update
RUN apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /var
COPY ./resources/fonts ./resources/fonts
COPY ./resources/dictionaries ./resources/dictionaries
COPY ./resources/quiz_data ./resources/quiz_data
COPY ./node-common ./node-common
WORKDIR /var/node-common
RUN npm ci --no-optional

WORKDIR /var/app
COPY ./worker/package.json .
COPY ./worker/package-lock.json .
RUN npm ci
RUN npm run buildresources

COPY ./worker/src ./src

CMD npm start
