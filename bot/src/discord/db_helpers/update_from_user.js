const dbConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const axios = require('axios').create({ timeout: 10000 });
const globals = require('./../../common/globals.js');

async function updateDbFromUser(user, options = {}) {
  let userRecord = await UserModel.findOne({ 'discordUser.id': user.id });

  if (!userRecord) {
    userRecord = new UserModel({ discordUser: { id: user.id } });
  }

  const recordHasAvatarType = !!userRecord.discordUser.avatarType;
  const avatarHasChanged = userRecord.discordUser.avatar !== user.avatar;
  if (user.avatar && (avatarHasChanged || !recordHasAvatarType)) {
    try {
      const response = await axios.get(user.staticAvatarURL, { responseType: 'arraybuffer' });
      userRecord.discordUser.avatarBytes = Buffer.from(response.data);
      userRecord.discordUser.avatar = user.avatar;
      userRecord.discordUser.avatarType = response.headers['content-type'];
    } catch (err) {
      globals.logger.warn({
        event: 'FAILED TO DOWNLOAD USER AVATAR',
        err,
        user,
      });
    }
  }

  userRecord.discordUser.username = user.username
    || userRecord.discordUser.username;
  userRecord.discordUser.discriminator = user.discriminator
    || userRecord.discordUser.discriminator;

  if (options.banReason) {
    userRecord.ban = { reason: options.banReason };
  } else if (options.unBan) {
    userRecord.ban = undefined;
  }

  return userRecord.save();
}

module.exports = updateDbFromUser;
