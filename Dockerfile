FROM node
WORKDIR /var/app

RUN apt-get update
RUN apt-get -y install ffmpeg build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev mongodb

COPY ./package.json .
COPY ./package-lock.json .
RUN npm ci

COPY . .

RUN mv ./fonts/truetype/* /usr/share/fonts/truetype
RUN mv ./fonts/opentype/* /usr/share/fonts/opentype

RUN service mongodb start && npm run buildall

RUN mkdir latest_log

RUN chmod +x ./start.sh
CMD ./start.sh
