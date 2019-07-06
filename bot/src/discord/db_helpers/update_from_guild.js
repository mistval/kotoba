const dbConnection = require('kotoba-node-common').database.connection;
const GuildModel = require('kotoba-node-common').models.createGuildModel(dbConnection);
const request = require('request-promise');
const globals = require('./../../common/globals.js');

async function updateDbFromGuild(guild) {
  let guildRecord = await GuildModel.findOne({ id: guild.id });
  if (!guildRecord) {
    guildRecord = new GuildModel({ id: guild.id });
  }

  if (guildRecord.icon !== guild.icon) {
    try {
      const iconBytes = await request({ encoding: null, uri: guild.iconURL });
      guildRecord.iconBytes = iconBytes;
      guildRecord.icon = guild.icon;
    } catch (err) {
      globals.logger.logFailure('DATABASE', 'Couldn\'t download icon for guild', err);
    }
  }

  guildRecord.createdAt = guild.createdAt;
  guildRecord.botJoinedAt = guild.joinedAt;
  guildRecord.memberCount = guild.memberCount;
  guildRecord.name = guild.name;
  guildRecord.ownerId = guild.ownerID;
  
  return guildRecord.save();
}

module.exports = updateDbFromGuild;
