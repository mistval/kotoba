const dbConnection = require('kotoba-node-common').database.connection;
const GuildModel = require('kotoba-node-common').models.createGuildModel(dbConnection);
const axios = require('axios').create({ timeout: 10000 });
const globals = require('./../../common/globals.js');

async function updateDbFromGuild(guild) {
  let guildRecord = await GuildModel.findOne({ id: guild.id });
  if (!guildRecord) {
    guildRecord = new GuildModel({ id: guild.id });
  }

  if (guildRecord.icon !== guild.icon && guild.icon) {
    try {
      const response = await axios.get(guild.iconURL, { responseType: 'arraybuffer' });
      guildRecord.iconBytes = Buffer.from(response.data);
      guildRecord.icon = guild.icon;
    } catch (err) {
      globals.logger.error({
        event: 'FAILED TO DOWNLOAD GUILD ICON',
        err,
        guild,
      });
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
