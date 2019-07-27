const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);

async function calculateStats({ userId, cachedStats }) {
  if (cachedStats) {
    const mostRecentlyProcessedReport = await GameReportModel
      .find({ participants: userId })
      .sort({ startTime: -1 })
      .limit(1)
      .select('_id')
      .lean()
      .exec();
    
    const canUseCachedStats = mostRecentlyProcessedReport
      && mostRecentlyProcessedReport._id === cachedStats.mostRecentlyProcessedReportId;
    
    if (canUseCachedStats) {
      return cachedStats;
    }
  }

  const gameReports = await GameReportModel
    .find({ participants: userId })
    .sort({ startTime: -1 })
    .lean()
    .exec();
  
  return { len: gameReports.length };
}

module.exports = calculateStats;
