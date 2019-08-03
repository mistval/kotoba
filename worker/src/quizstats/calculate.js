const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const render = require('./render.js');
const mongoose = require('mongoose');

const cachedStatsForUserId = {};

async function calculateStats(workerPool, userId) {
  // Find the user's ID in mongo, if a Discord user ID was given.
  // If no ID can be resolved, return undefined.
  let mongoUserId;
  try {
    mongoUserId = mongoose.Types.ObjectId(userId);
  } catch (err) {
    const userRecord = await UserModel.findOne({ 'discordUser.id': userId })
      .select('_id')
      .lean()
      .exec();

    if (userRecord) {
      mongoUserId = userRecord._id;
    } else {
      return undefined;
    }
  }

  const mongoUserIdStr = mongoUserId.toString();
  const cachedStats = cachedStatsForUserId[mongoUserIdStr];

  if (cachedStats) {
    const mostRecentReport = await GameReportModel
      .find({ participants: mongoUserId })
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

  const stats = await workerPool.doWork('calculateStats', mongoUserIdStr);
  if (!stats) {
    return undefined;
  }

  // TODO: Canvas doesn't support worker threads, RIP
  // https://github.com/Automattic/node-canvas/issues/1394
  stats.charts = await render(stats);

  cachedStatsForUserId[mongoUserIdStr] = stats;

  return stats;
}

module.exports = calculateStats;
