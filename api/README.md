# Kotobaweb API

This is the backend API for Kotobaweb.com. It has a REST API to handle user login and auth (via Discord OAuth2), getting quiz session reports, and getting/creating custom quiz decks. It also has a websocket API for the web versions of the quiz and shiritori features (that will be split into a separate project eventually).

## Configuration

1. If you want the contact form on the website to work, you need a gmail account and it must have "Less secure apps" enabled in your Google account settings. The API will use this account to send submitted contact forms.

2. In your [Discord application](https://discordapp.com/developers/applications/) you must add a **Redirect** in the OAuth2 section. For local development, this redirect should be **http://localhost/api/login/callback**.

3. In this directory, create a **config.js** file. It should look like this:

```js
const path = require('path');

module.exports = {
  mail: {
    senderGmailUsername: 'gmail username for account to send contact form mail from', // can be an empty string if you dont care about the contact form working
    senderGmailPassword: 'password for above account',
    recipientAddress: 'email address to which to send contact form mail',
  },
  auth: {
    discord: {
      clientId: 'your discord application client id from https://discordapp.com/developers/applications/',
      clientSecret: 'your discord application client secret from https://discordapp.com/developers/applications/',
      callbackRoute: '/api/login/callback', // You don't need to change this. I'll remove this from this file eventually because it doesn't really belong here. Just bear with me. It should match the route in the callbackUrl below.
      callbackUrl: `http://localhost/api/login/callback`, // The callback URL for Discord login. This must be added as a Redirect in your Discord application configuration at https://discordapp.com/developers/applications/.
    },
    adminDiscordIds: ['243703909166612480'], // Anyone with one of these Discord user IDs will be granted admin access to the API. They can view access logs and edit anyone's custom decks.
  },
  session: {
    secret: 'ewregmk3mgmlkermgkernlgnerrgnwlekrnglknerg', // Some random string. You can just type in a bunch of random characters. Make it long and unguessable.
  },
  logging: {
    logFilePath: path.join(__dirname, 'access_logs'), // You don't need to change this. This will also be removed as it doesn't really belong in the configuration.
  },
};
```

## Deploying

### Production (Docker)

To deploy for production, use **docker-compose**. In the directory above this one (the root directory of the repo) run `docker-compose up kotoba-api mongo-readwrite`.

### Development

1. Make sure you have MongoDB installed and listening on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/).

2. In this directory, run `npm run buildquiz && npm run buildshiritori`.

3. In this directory, run `npm run startdev_nix` or `npm run startdev_win`, depending on your operating system. This will start the API on port 3000.

4. Configure a reverse proxy server to proxy API requests to the API. You can use nginx for this. If using nginx, you can use this configuration:

```
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 80;

        location /api {
            client_max_body_size 4M;
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        location / {
            proxy_pass http://localhost:3001;
        }
    }
}
```

This will route API requests to the API on port 3000, and other HTTP requests to the React dev server on port 3001.
