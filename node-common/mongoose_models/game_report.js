const mongoose = require('mongoose');

const gameReportSchema = new mongoose.Schema({
  sessionName: { type: String, required: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  participants: { type: [mongoose.Schema.Types.ObjectId], required: true, ref: 'User', index: true },
  discordServerIconUri: { type: String, required: true },
  discordServerName: { type: String, required: true },
  discordChannelName: { type: String, required: true },
  questions: [{
    dictionaryLinkStrategy: { type: String, required: true },
    question: { type: String, required: true },
    answers: { type: [String], required: true },
    comment: { type: String, default: '' },
    canCopyToCustomDeck: { type: Boolean, default: false },
    correctAnswerers: [{ type: [mongoose.Schema.Types.ObjectId], required: true }],
  }],
});

function create(connection) {
  return connection.model('GameReport', gameReportSchema);
}

module.exports = create;
