const mongoose = require('mongoose');

const DiscordAccountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  discriminator: { type: String, required: true },
  avatar: { type: String },
  avatarBytes: { type: Buffer },
  avatarType: { type: String },
  id: { type: String, required: true, index: true },
  email: { type: String, required: false },
  _id: false,
});

const BanInfoSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  _id: false,
});

const UserSchema = new mongoose.Schema({
  discordUser: { type: DiscordAccountSchema, required: true },
  admin: { type: Boolean, required: false, default: false },
  ban: { type: BanInfoSchema, required: false, default: undefined },
});

function create(connection) {
  return connection.model('User', UserSchema);
}

module.exports = create;
