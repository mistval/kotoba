const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
  createdAt: { type: Date, required: true },
  icon: { type: String },
  iconBytes: { type: Buffer },
  iconType: { type: String },
  id: { type: String, index: true },
  botJoinedAt: { type: Date, required: true },
  memberCount: { type: Number, required: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
}, { versionKey: false });

function create(connection) {
  return connection.model('Guild', GuildSchema);
}

module.exports = create;
