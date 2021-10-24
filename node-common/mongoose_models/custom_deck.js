const mongoose = require('mongoose');
const crypto = require('../crypto.js');

const customDeckSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true, index: true },
  lastModified: { type: Date, required: true },
  uniqueId: { type: String, required: true, index: true },
  public: { type: Boolean, default: false },
  description: { type: String, default: '' },
  score: { type: Number, default: 0, index: true },
  readWriteSecret: { type: String, required: false, index: false },
});

customDeckSchema.index({ name: 'text', description: 'text' });

function create(connection) {
  return connection.model('CustomDeck', customDeckSchema);
}

module.exports = create;
