const fetch = require('node-fetch');
const routes = require('express').Router();
const { contactWebhookAddress } = require('./../../config/config.js').api;
const rateLimit = require('express-slow-down');

const limiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  delayAfter: 2,
  delayMs: 3 * 60 * 1000, // 3 minutes
});

routes.post('/', limiter, async (req, res, next) => {
  try {
    const { email, message } = req.body;

    await fetch(
      contactWebhookAddress,
      {
        method: 'POST',
        body: JSON.stringify({
          embeds: [{
            title: 'Contact received',
            fields: [
              { name: 'Sender', value: email },
              { name: 'Message', value: message },
            ],
          }],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = routes;
