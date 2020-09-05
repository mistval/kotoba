const mongoose = require('mongoose');

const customDeckSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true, index: true },
  lastModified: { type: Date, required: true },
  uniqueId: { type: String, required: true, index: true },
  public: { type: Boolean, index: true, default: false },
  description: { type: String, default: '' },
  score: { type: Number, default: 0, index: true },
});

customDeckSchema.index({ name: 'text', description: 'text' });

function create(connection) {
  return connection.model('CustomDeck', customDeckSchema);
}

module.exports = create;
