const mongoose = require('mongoose');

const DISCORD_EPOCH_MS = 1420070400000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const IMAGE_CARDS_SCORE_THRESHOLD = 1_000;

function calculateDiscordSnowflakeDate(snowflake) {
  const snowFlakeInt = BigInt(snowflake);
  const bitDivisor = BigInt(Math.pow(2,22));
  const msSinceDiscordEpoch = parseInt(snowFlakeInt / bitDivisor);
  const timestamp = DISCORD_EPOCH_MS + msSinceDiscordEpoch;

  return new Date(timestamp);
}

const DiscordAccountSchema = new mongoose.Schema({
  username: { type: String, required: true },
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
  privileges: { type: [Object], required: false, default: [] },
  antiPrivileges: { type: [Object], required: false, default: [] },
});

UserSchema.virtual('canCreateDecks').get(function() {
  if (!this.discordUser) {
    return false;
  }

  if (this.antiPrivileges?.some?.(p => p.id === 'create_decks')) {
    return false;
  }

  if (this.privileges?.some?.(p => p.id === 'create_decks')) {
    return true;
  }

  const timeAgo = new Date(Date.now() - ONE_WEEK_MS);
  return this.discordUser.createdAt < timeAgo;
});

UserSchema.method('canCreateImageCards', async function(UserGlobalTotalScoresModel) {
  if (!this.discordUser) {
    return false;
  }

  if (this.antiPrivileges?.some?.(p => p.id === 'image_cards')) {
    return false;
  }

  if (this.privileges?.some?.(p => p.id === 'image_cards')) {
    return true;
  }

  const count = await UserGlobalTotalScoresModel.count(
    { userId: this.discordUser.id, score: { $gte: IMAGE_CARDS_SCORE_THRESHOLD } },
  );

  return Boolean(count);
});

UserSchema.method('getPrivileges', async function({ UserGlobalTotalScoresModel }) {
  return [{
    id: 'create_decks',
    value: this.canCreateDecks,
  }, {
    id: 'image_cards',
    value: await this.canCreateImageCards(UserGlobalTotalScoresModel),
  }];
});

function create(connection) {
  return connection.model('User', UserSchema);
}

module.exports = create;
