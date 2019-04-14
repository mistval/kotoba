FROM node
WORKDIR '/var/app'

RUN apt-get update
RUN apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev mongodb

COPY . .
RUN mv ./fonts/truetype/* /usr/share/fonts/truetype
RUN mv ./fonts/opentype/* /usr/share/fonts/opentype

RUN npm install
RUN npm run buildquiz
RUN service mongodb start && npm run buildshiritori

RUN chmod +x ./start.sh
CMD ./start.sh
