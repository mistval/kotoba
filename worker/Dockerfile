FROM node:12.10.0

WORKDIR /var
COPY ./node-common ./node-common

WORKDIR /var/app
COPY ./worker/package.json .
COPY ./worker/package-lock.json .

RUN npm install
COPY ./worker/src ./src

CMD npm start
