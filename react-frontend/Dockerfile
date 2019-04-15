FROM node:alpine as reactBuilder

WORKDIR /var
COPY ./common ./common

WORKDIR /var/app
COPY ./react-frontend .
RUN npm ci
RUN npm run build

FROM nginx
COPY --from=reactBuilder /var/app/build /usr/share/nginx/html
COPY ./react-frontend/nginx.conf /etc/nginx/conf.d/default.conf
