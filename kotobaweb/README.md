# Kotobaweb React frontend

This is the React frontend for Kotobaweb.com.

## Configuration

1. In the **src** directory below this one, create a **config.js** file. It should look like this:

```js
module.exports = {
  googleAnalyticsTrackingID: '',
};
```

You can leave it as an empty string, unless you want to hook up Google analytics.

## Deploying

### Production (Docker)

First make sure you have followed the **Configuration** instructions above and also for [the API](https://github.com/mistval/kotoba/tree/master/api). (unless you really want to run the frontend without the backend, which would be kind of silly in production but I'm sure you have your reasons).

To deploy for production, use **docker-compose**. In the directory above this one (the root directory of the repo) run `docker-compose up nginx kotoba-api mongo-readwrite kotoba-web`. You *can* omit **kotoba-api mongo-readwrite** if you don't want to launch the API.

### Development

Run `npm start`.

The React development server will launch on port 3001. After it finishes launching it will automatically open the site in your web browser. You can also navigate to it manually at http://localhost:3001.

Depending on what changes you want to make, you may also need to start the API. Follow the **Configuration** and **Deploying #Development** steps there. After configuring nginx, navigate to http://localhost.

Note that the frontend and backend will not work together properly if you access the site on port 3001 (http://localhost:3001). You must access the site on port 80 (http://localhost or http://localhost:80) if you're also running the API. The React dev server still likes to open your browser automatically to the site on port 3001, so if requests to the API are failing, check the port in your address bar and make sure you're accessing the site on port 80 (which will send your requests to the reverse proxy instead of directly to the React dev server).
