FROM node:14.17.3

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
