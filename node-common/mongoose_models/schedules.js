const mongoose = require('mongoose');

const WordScheduleSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // channel ID
  serverId: { type: String, required: true }, // server ID
  frequency: { type: Number, required: true },
  start: { type: Number, required: true },
  lastSent: { type: Date, required: false, index: true },
  level: { type: String, required: false },
  status: { type: String, required: false, default: 'running' },
});

function create(connection) {
  return connection.model('ServerSchedule', WordScheduleSchema);
}

module.exports = create;