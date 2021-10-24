const mongoose = require('mongoose');

const customDeckVoteSchema = new mongoose.Schema({
  voter: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  deck: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'CustomDeck', index: true },
  vote: { type: Boolean, default: false },
});

function create(connection) {
  return connection.model('CustomDeckVote', customDeckVoteSchema);
}

module.exports = create;
