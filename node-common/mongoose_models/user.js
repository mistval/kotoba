const mongoose = require('mongoose');

const DISCORD_EPOCH_MS = 1420070400000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function calculateDiscordSnowflakeDate(snowflake) {
  const snowFlakeInt = BigInt(snowflake);
  const bitDivisor = BigInt(Math.pow(2,22));
  const msSinceDiscordEpoch = parseInt(snowFlakeInt / bitDivisor);
  const timestamp = DISCORD_EPOCH_MS + msSinceDiscordEpoch;

  return new Date(timestamp);
}

const DiscordAccountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  discriminator: { type: String, required: true },
  avatar: { type: String, required: false },
  id: { type: String, required: true, index: true },
  email: { type: String, required: false },
  _id: false,
}, { versionKey: false });

DiscordAccountSchema.virtual('createdAt').get(function() {
  return calculateDiscordSnowflakeDate(this.id);
});

const BanInfoSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  _id: false,
});

const UserSchema = new mongoose.Schema({
  discordUser: { type: DiscordAccountSchema, required: true },
  admin: { type: Boolean, required: false, default: false },
  ban: { type: BanInfoSchema, required: false, default: undefined },
  canCreateDecksOverride: { type: Boolean, required: false },
});

UserSchema.virtual('canCreateDecks').get(function() {
  if (!this.discordUser) {
    return false;
  }

  if (this.canCreateDecksOverride !== undefined) {
    return this.canCreateDecksOverride;
  }

  const timeAgo = new Date(Date.now() - ONE_WEEK_MS);
  return this.discordUser.createdAt < timeAgo;
});

function create(connection) {
  return connection.model('User', UserSchema);
}

module.exports = create;
