FROM node:14.17.0

RUN apt-get update
RUN apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /var
COPY ./resources ./resources
COPY ./node-common ./node-common
COPY ./common ./common

WORKDIR /var/node-common
RUN npm ci

WORKDIR /var/app
COPY ./api .

RUN npm ci
RUN npm run buildresources

CMD ["npm", "start"]
