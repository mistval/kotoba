FROM node:10.15.3-alpine as reactBuilder

WORKDIR /var
COPY ./common ./common

WORKDIR /var/app
COPY ./kotobaweb .
COPY ./config.js ./..
RUN npm ci
RUN npm run build

FROM nginx
COPY --from=reactBuilder /var/app/build /usr/share/nginx/html
COPY ./kotobaweb/nginx.conf /etc/nginx/conf.d/default.conf
