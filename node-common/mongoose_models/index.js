const createCustomDeckModel = require('./custom_deck.js');
const createGameReportModel = require('./game_report.js');
const createUserModel = require('./user.js');
const createGuildModel = require('./guild.js');
const createCustomDeckVoteModel = require('./custom_deck_vote.js');
const scores = require('./scores.js');
const reviewDeck = require('./review_deck.js');
const createWordSchedulesModel = require('./schedules.js');

module.exports = {
  createCustomDeckModel,
  createGameReportModel,
  createUserModel,
  createGuildModel,
  createCustomDeckVoteModel,
  scores,
  reviewDeck,
  createWordSchedulesModel,
};
