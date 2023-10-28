FROM arm64v8/node:20.9.0 as reactBuilder

WORKDIR /var
COPY ./common ./common

WORKDIR /var/app
COPY ./kotobaweb .
RUN mkdir ./../config
COPY ./config/frontend_config.js ./../config/
COPY ./resources/fonts/ ../resources/fonts/
RUN npm ci
RUN npm run build

FROM nginx:1.25.3
COPY --from=reactBuilder /var/app/build /usr/share/nginx/html
COPY ./kotobaweb/nginx.conf /etc/nginx/conf.d/default.conf
