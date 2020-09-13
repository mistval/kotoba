const dbConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const removeUndefined = require('../../common/util/remove_undefined_values.js');

async function updateDbFromUser(user, options = {}) {
  const update = removeUndefined({
    'discordUser.id': user.id,
    'discordUser.avatar': user.avatar,
    'discordUser.username': user.username,
    'discordUser.discriminator': user.discriminator,
  });

  if (options.banReason) {
    update.ban = { reason: options.banReason };
  } else if (options.unBan) {
    update.ban = undefined;
  }

  return UserModel.findOneAndUpdate(
    { 'discordUser.id': user.id },
    update,
    { upsert: true, new: true },
  ).lean();
}

module.exports = updateDbFromUser;
