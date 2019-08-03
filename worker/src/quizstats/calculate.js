const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);

const cachedStatsForUserId = {};

async function calculateStats(workerPool, userId) {
  const cachedStats = cachedStatsForUserId[userId];
  
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

  const stats = await workerPool.doWork('calculateStats', userId);
  cachedStatsForUserId[userId] = stats;

  return stats;
}

module.exports = calculateStats;
