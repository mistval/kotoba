const mongoose = require('mongoose');

const UserGlobalTotalSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true, unique: true },
  score: { type: Number, required: true, index: true, min: 1 },
  lastKnownUsername: { type: String, required: true, index: true },
});

const UserServerTotalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  score: { type: Number, required: true, index: true, min: 1 },
  lastKnownUsername: { type: String, required: true, index: true },
});

UserServerTotalSchema.index({ userId: 1, serverId: 1 }, { unique: true });

const UserGlobalDeckSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deckUniqueId: { type: String, required: true },
  score: { type: Number, required: true, index: true, min: 1 },
  lastKnownUsername: { type: String, required: true, index: true },
});

UserGlobalDeckSchema.index({ userId: 1, deckUniqueId: 1 }, { unique: true });

const UserServerDeckSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deckUniqueId: { type: String, required: true },
  serverId: { type: String, required: true },
  score: { type: Number, required: true, index: true, min: 1 },
  lastKnownUsername: { type: String, required: true, index: true },
});

UserServerDeckSchema.index({ userId: 1, deckUniqueId: 1, serverId: 1 }, { unique: true });

module.exports = {
  createUserGlobalTotalScoreModel: (connection) => {
    return connection.model('UserGlobalTotalScore', UserGlobalTotalSchema);
  },
  createUserServerTotalScoreModel: (connection) => {
    return connection.model('UserServerTotalScore', UserServerTotalSchema);
  },
  createUserGlobalDeckScoreModel: (connection) => {
    return connection.model('UserGlobalDeckScore', UserGlobalDeckSchema);
  },
  createUserServerDeckScoreModel: (connection) => {
    return connection.model('UserServerDeckScore', UserServerDeckSchema);
  },
};
