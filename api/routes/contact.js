const routes = require('express').Router();
const nodemailer = require('nodemailer');
const config = require('./../config.js').mail;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.senderGmailUsername,
    pass: config.senderGmailPassword,
  },
});

routes.post('/', async (req, res, next) => {
  const { email, message } = req.body;

  const mailOptions = {
    from: config.senderGmailUsername,
    to: config.recipientAddress,
    subject: 'Message via kotobaweb.com',
    html: `From ${email}: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    res.json({
      success: false,
      email: config.recipientAddress,
    });

    next(err);
  }
});

module.exports = routes;
