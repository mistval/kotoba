FROM node:12.16.1

WORKDIR /var
COPY ./resources/fonts ./resources/fonts
COPY ./node-common ./node-common
WORKDIR /var/node-common
RUN npm install

WORKDIR /var/app
COPY ./worker/package.json .
COPY ./worker/package-lock.json .
RUN npm install
RUN npm run buildfontcharactermap

COPY ./worker/src ./src

CMD npm start
