const escapeStringRegexp = require('escape-string-regexp');
const globals = require('../globals.js');
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const UserModel = require('kotoba-node-common').models.createUserModel(mongoConnection);
const CustomDeckVoteModel = require('kotoba-node-common').models.createCustomDeckVoteModel(mongoConnection);

async function searchCustomFullText(
  searchTerm = '',
  { populateOwner = false, limit = 100 } = {},
) {
  const filter = searchTerm.trim()
    ? { $text: { $search: searchTerm }, public: true }
    : { public: true };

  let query = CustomDeckModel
    .find(filter)
    .sort({ score: -1 })
    .limit(limit)
    .select('shortName name score');

  if (populateOwner) {
    query = query.populate('owner', 'discordUser.username discordUser.discriminator');
  }

  const results = await query.lean().exec();

  return results;
}

async function searchCustomPrefix(searchTerm, { limit = 100 } = {}) {
  if (!searchTerm) {
    return searchCustomFullText('', { limit, populateOwner: false });
  }

  const results = await CustomDeckModel.find({
    shortName: { $regex: `^${escapeStringRegexp(searchTerm.toLowerCase())}` },
    public: true,
  })
    .sort({ score: -1 })
    .limit(limit)
    .select('shortName name score')
    .lean()
    .exec();

  return results;
}

function searchBuiltInPrefix(searchTerm, { limit = 100 } = {}) {
  return globals.resourceDatabase.prefixSearchQuizDeckShortNames(searchTerm, limit);
}

function searchBuiltInFullText(searchTerm, { limit = 100 } = {}) {
  return globals.resourceDatabase.fullTextSearchQuizDecks(searchTerm, limit);
}

async function getUserAndDeck(discordUserId, deckUniqueId) {
  const [user, deck] = await Promise.all([
    UserModel.findOne({ 'discordUser.id': discordUserId }).select('_id').lean().exec(),
    CustomDeckModel.findOne({ uniqueId: deckUniqueId }).select('_id public').lean().exec(),
  ]);

  if (!user) {
    throw new Error(`Could not find user ${discordUserId}`);
  }

  if (!deck) {
    throw new Error(`Could not find deck: ${deckUniqueId}`);
  }

  return [user, deck];
}

async function voteForDiscordUser(discordUserId, deckUniqueId, vote) {
  const [user, deck] = await getUserAndDeck(discordUserId, deckUniqueId);

  const updateInfo = await CustomDeckVoteModel.findOneAndUpdate(
    { voter: user._id, deck: deck._id },
    { vote },
    { upsert: true, rawResult: true },
  );

  let scoreChange = 0;
  if (updateInfo.lastErrorObject.updatedExisting) {
    if (updateInfo.value.vote && !vote) {
      scoreChange = -1;
    } else if (!updateInfo.value.vote && vote) {
      scoreChange = 1;
    }
  } else {
    scoreChange = vote ? 1 : 0;
  }

  if (scoreChange) {
    await CustomDeckModel.findOneAndUpdate(
      { _id: deck._id },
      { $inc: { score: scoreChange } },
    );
  }
}

async function discordUserCanVote(discordUserId, deckUniqueId) {
  const [user, deck] = await getUserAndDeck(discordUserId, deckUniqueId);
  if (!deck.public) {
    return false;
  }

  const voteRecord = await CustomDeckVoteModel
    .findOne({ voter: user._id, deck: deck._id })
    .select('_id')
    .lean()
    .exec();

  return !voteRecord;
}

module.exports = {
  searchCustomFullText,
  searchCustomPrefix,
  searchBuiltInPrefix,
  searchBuiltInFullText,
  voteForDiscordUser,
  discordUserCanVote,
};
