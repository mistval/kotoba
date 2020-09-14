const dbConnection = require('kotoba-node-common').database.connection;
const GuildModel = require('kotoba-node-common').models.createGuildModel(dbConnection);

function updateDbFromGuild(guild) {
  const update = {
    id: guild.id,
    icon: guild.icon,
    name: guild.name,
  };

  return GuildModel.findOneAndUpdate(
    { id: guild.id },
    update,
    { upsert: true, new: true },
  ).lean();
}

module.exports = updateDbFromGuild;
