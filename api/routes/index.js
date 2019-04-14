const express = require('express');
const contact = require('./contact.js');
const users = require('./users.js');
const decks = require('./decks.js');
const logs = require('./logs.js');

const router = express.Router();

router.use('/contact', contact);
router.use('/users', users);
router.use('/decks', decks);
router.use('/logs', logs);

module.exports = router;
