const mongoose = require('mongoose');

const cacheSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  expires: { type: Date, required: true, expires: 0 },
}, { versionKey: false });

function create(connection) {
  return connection.model('CachedKvp', cacheSchema);
}

module.exports = create;
