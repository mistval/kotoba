FROM node@sha256:2c6c59cf4d34d4f937ddfcf33bab9d8bbad8658d1b9de7b97622566a52167f2b as reactBuilder

WORKDIR /var
COPY ./common ./common

WORKDIR /var/app
COPY ./kotobaweb .
RUN mkdir ./../config
COPY ./config/frontend_config.js ./../config/
COPY ./resources/fonts/ ../resources/fonts/
RUN npm ci
RUN npm run build

FROM nginx:1.23.4-bullseye
COPY --from=reactBuilder /var/app/build /usr/share/nginx/html
COPY ./kotobaweb/nginx.conf /etc/nginx/conf.d/default.conf
