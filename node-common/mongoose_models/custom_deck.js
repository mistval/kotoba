const mongoose = require('mongoose');

const customDeckSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true, index: true },
  lastModified: { type: Date, required: true },
  uniqueId: { type: String, required: true, index: true },
});

function create(connection) {
  return connection.model('CustomDeck', customDeckSchema);
}

module.exports = create;
