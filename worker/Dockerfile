FROM node:12.20.0

WORKDIR /var
COPY ./resources/fonts ./resources/fonts
COPY ./node-common ./node-common
WORKDIR /var/node-common
RUN npm ci --no-optional

WORKDIR /var/app
COPY ./worker/package.json .
COPY ./worker/package-lock.json .
RUN npm ci
RUN npm run buildfontcharactermap

COPY ./worker/src ./src

CMD npm start
