const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);
const render = require('./render.js');

const cachedStatsForUserId = {};

async function calculateStats(workerPool, userId) {
  const cachedStats = cachedStatsForUserId[userId];

  if (cachedStats) {
    const mostRecentReport = await GameReportModel
      .find({ participants: userId })
      .sort({ startTime: -1 })
      .limit(1)
      .select('_id')
      .lean()
      .exec();

    const canUseCachedStats = mostRecentReport.length > 0
      && mostRecentReport[0]._id.toString() === cachedStats.mostRecentlyProcessedReportId;

    if (canUseCachedStats) {
      return cachedStats;
    }
  }

  const stats = await workerPool.doWork('calculateStats', userId);

  // TODO: Canvas doesn't support worker threads, RIP
  stats.charts = await render(stats);

  cachedStatsForUserId[userId] = stats;

  return stats;
}

module.exports = calculateStats;
