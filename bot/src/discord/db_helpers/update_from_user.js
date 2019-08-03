const dbConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const axios = require('axios').create({ timeout: 10000 });
const globals = require('./../../common/globals.js');

async function updateDbFromUser(user, admin = false) {
  let userRecord = await UserModel.findOne({ 'discordUser.id': user.id });

  if (!userRecord) {
    userRecord = new UserModel({ discordUser: { id: user.id }, admin });
  }

  const recordHasAvatarBytes = !!userRecord.discordUser.avatarBytes;
  const avatarHasChanged = userRecord.discordUser.avatar !== user.avatar;
  if (user.avatar && (!recordHasAvatarBytes || avatarHasChanged)) {
    try {
      const response = await axios.get(user.staticAvatarURL, { responseType: 'arraybuffer' });
      userRecord.discordUser.avatarBytes = Buffer.from(response.data);
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
