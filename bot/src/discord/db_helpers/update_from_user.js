const dbConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const request = require('request-promise');
const globals = require('./../../common/globals.js');

async function updateDbFromUser(user, admin = false) {
  let userRecord = await UserModel.findOne({ 'discordUser.id': user.id });

  if (!userRecord) {
    userRecord = new UserModel({ discordUser: { id: user.id }, admin });
  }

  if (userRecord.discordUser.avatar !== user.avatar) {
    try {
      userRecord.discordUser.avatarBytes = await request({ encoding: null, uri: user.staticAvatarURL });
      userRecord.discordUser.avatar = user.avatar;
    } catch (err) {
      globals.logger.logFailure('DATABASE', 'Couldn\'t download avatar for user', err);
    }
  }

  userRecord.discordUser.username = user.username;
  userRecord.discordUser.discriminator = user.discriminator;
  
  return userRecord.save();
}

module.exports = updateDbFromUser;
