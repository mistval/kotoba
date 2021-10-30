const mongoose = require('mongoose');

const UserGlobalTotalSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true, unique: true },
  score: { type: Number, required: true, index: true, min: 1 },
  lastKnownUsername: { type: String, required: true },
});

const UserServerTotalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  score: { type: Number, required: true, min: 1 },
  lastKnownUsername: { type: String, required: true },
});

UserServerTotalSchema.index({ serverId: 1, userId: 1 }, { unique: true });

const UserGlobalDeckSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deckUniqueId: { type: String, required: true },
  score: { type: Number, required: true, min: 1 },
  lastKnownUsername: { type: String, required: true },
});

UserGlobalDeckSchema.index({ deckUniqueId: 1, userId: 1 }, { unique: true });

const UserServerDeckSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deckUniqueId: { type: String, required: true },
  serverId: { type: String, required: true },
  score: { type: Number, required: true, min: 1 },
  lastKnownUsername: { type: String, required: true },
});

UserServerDeckSchema.index({ serverId: 1, deckUniqueId: 1, userId: 1 }, { unique: true });

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
