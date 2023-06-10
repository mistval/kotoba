const dbConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const removeUndefined = require('../../common/util/remove_undefined_values.js');

async function updateDbFromUser(user, options = {}) {
  const update = removeUndefined({
    'discordUser.id': user.id,
    'discordUser.avatar': user.avatar,
    'discordUser.username': user.username,
  });

  const $set = update;
  const $unset = {};

  if (options.banReason) {
    $set.ban = { reason: options.banReason };
  } else if (options.unBan) {
    $unset.ban = '';
  }

  return UserModel.findOneAndUpdate(
    { 'discordUser.id': user.id },
    { $set, $unset },
    { upsert: true, new: true },
  ).lean();
}

module.exports = updateDbFromUser;
