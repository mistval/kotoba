const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const UserModel = require('kotoba-node-common').models.createUserModel(mongoConnection);
const CustomDeckVoteModel = require('kotoba-node-common').models.createCustomDeckVoteModel(mongoConnection);

async function search(searchTerm = '') {
  const results = await CustomDeckModel
    .find(searchTerm.trim() ? { $text: { $search: searchTerm }, public: true } : {})
    .sort({ score: -1 })
    .limit(100)
    .select('shortName name score')
    .populate('owner', 'discordUser.username discordUser.discriminator');

  return results.filter(r => r.owner);
}

async function voteForDiscordUser(discordUserId, deckUniqueId, vote) {
  const [user, deck] = await Promise.all([
    UserModel.find({ 'discordUser.id': discordUserId }),
    CustomDeckModel.find({ uniqueId: deckUniqueId }),
  ]);

  if (!user) {
    throw new Error(`Could not find user ${discordUserId}`);
  }

  if (!deck) {
    throw new Error(`Could not find deck: ${deckUniqueId}`);
  }

  const updateInfo = await CustomDeckVoteModel.findOneAndUpdate(
    { voter: user._id, deck: deck._id },
    { vote },
    { new: true, upsert: true, rawResult: true },
  );

  debugger;

  // If there was no vote...
  // If there was a vote and it wasnt changed...
  // If there was a vote and it was switched to true...
  // If there was a vote and it was switched to false...
}

module.exports = {
  search,
  voteForDiscordUser,
};
