const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const render = require('./render.js');
const mongoose = require('mongoose');
const calculate = require('./calculate_stats_worker.js');

const CACHE_EMPTY_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

let cachedStatsForUserId = {};

setInterval(() => {
  cachedStatsForUserId = {};
}, CACHE_EMPTY_INTERVAL_MS);

async function calculateStats(userId) {
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

  // If there are no new reports since this user's stats were last
  // cached, return the cached stats.
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

  // Calculate stats
  const stats = await calculate(mongoUserIdStr);
  if (!stats) {
    return undefined;
  }

  // Render and cache the stats

  // TODO: Canvas doesn't support worker threads, RIP
  // https://github.com/Automattic/node-canvas/issues/1394
  stats.charts = await render(stats);

  cachedStatsForUserId[mongoUserIdStr] = stats;

  return stats;
}

module.exports = calculateStats;
