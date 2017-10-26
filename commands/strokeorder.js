'use strict'
const reload = require('require-reload')(require);
let strokeOrderLookup = reload('./../kotoba/stroke_order_lookup.js');

module.exports = {
  commandAliases: ['k!strokeorder', 'k!so'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'strokeorder303489',
  action(bot, msg, suffix) {
    return strokeOrderLookup(suffix, bot, msg);
  },
};
