const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);

async function calculateStats(userId) {
  const gameReports = await GameReportModel
    .find({ participants: userId })
    .sort({ startTime: -1 })
    .lean()
    .exec();

  return { len: gameReports.length };
}

module.exports = calculateStats;
