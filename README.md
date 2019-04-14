## Installation

You must have **cairo** and **pango** installed (for image rendering). You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages). These must be installed before you run npm install. If you already ran npm install, just delete your node_modules.

You must also have CJK font(s) installed. At least one is provided in this repository's /font directory.

Then:

```
npm install
npm run build
```

Create a **config.js** file in the react-frontend directory. It should look like this:

```js
module.exports = {
  googleAnalyticsTrackingID: '',
};
```

Create a **config.js** in the api directory. it should look like this:

```js
module.exports = {
  backendPort: 3002, // If using the react dev server (npm start) this must be the same as the port in the react project's package.json's "proxy" field.
  mail: {
    senderGmailUsername: 'gmailUsernameForAccountToSendContactFormMailFrom',
    senderGmailPassword: 'passwordForAboveAccount',
    recipientAddress: 'emailAddressToWhichToSendContactFormMail',
  },
};
```
