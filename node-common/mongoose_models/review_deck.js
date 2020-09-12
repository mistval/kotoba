const mongoose = require('mongoose');

const TWO_DAYS = 2 * 24 * 60 * 60;

const reviewDeckSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  created: { type: Date, required: true, index: true, expires: TWO_DAYS },
  cards: { type: Array, required: true },
});

function createUser(connection) {
  return connection.model('UserReviewDeck', reviewDeckSchema);
}

function createLocation(connection) {
  return connection.model('LocationReviewDeck', reviewDeckSchema);
}

module.exports = {
  createUser,
  createLocation,
};
