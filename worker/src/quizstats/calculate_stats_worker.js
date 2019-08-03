const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);

const MS_PER_DAY = 86400000;

function addEmptyDays(dailyStats, untilAndIncluding) {
  const hasPreviousDays = dailyStats.length !== 0;
  if (hasPreviousDays) {
    const previousDay = dailyStats[dailyStats.length - 1];
    const numEmptyDays = ((untilAndIncluding - previousDay.dateInt) / MS_PER_DAY);
    for (let i = 0; i < numEmptyDays; i += 1) {
      dailyStats.push({
        dateInt: previousDay.dateInt + (MS_PER_DAY * (i + 1)),
        questionsAnsweredPerDeck: {},
        questionsSeenPerDeck: {},
      });
    }
  } else {
    dailyStats.push({
      dateInt: untilAndIncluding,
      questionsAnsweredPerDeck: {},
      questionsSeenPerDeck: {},
    });
  }
}

function addGameReport(userId, stats, gameReport) {
  if (!gameReport.questions[0].deckUniqueId) {
    // This game report doesn't have the information necessary. It's too old.
    return;
  }

  const dateInt = gameReport.startTime - (gameReport.startTime % MS_PER_DAY);
  addEmptyDays(stats.dailyStats, dateInt);

  const dailyStats = stats.dailyStats[stats.dailyStats.length - 1];

  for (let i = 0; i < gameReport.questions.length; i += 1) {
    const question = gameReport.questions[i];
    const { deckUniqueId, correctAnswerers } = question;

    if (dailyStats.questionsAnsweredPerDeck[deckUniqueId] === undefined) {
      dailyStats.questionsAnsweredPerDeck[deckUniqueId] = 0;
      dailyStats.questionsSeenPerDeck[deckUniqueId] = 0;
    }

    if (correctAnswerers.map(x => x.toString()).indexOf(userId) !== -1) {
      dailyStats.questionsAnsweredPerDeck[deckUniqueId] += 1;
    }

    dailyStats.questionsSeenPerDeck[deckUniqueId] += 1;
  }
}

function addAggregateStats(stats) {
  stats.questionsAnsweredPerDeck = {};
  stats.questionsSeenPerDeck = {};

  stats.dailyStats.forEach((dailyStats) => {
    Object.entries(dailyStats.questionsSeenPerDeck).forEach(([deckUniqueId, questionsSeen]) => {
      if (!stats.questionsSeenPerDeck[deckUniqueId]) {
        stats.questionsSeenPerDeck[deckUniqueId] = 0;
      }

      stats.questionsSeenPerDeck[deckUniqueId] += questionsSeen;
    });

    Object.entries(dailyStats.questionsAnsweredPerDeck).forEach(([deckUniqueId, questionsAnswered]) => {
      if (!stats.questionsAnsweredPerDeck[deckUniqueId]) {
        stats.questionsAnsweredPerDeck[deckUniqueId] = 0;
      }

      stats.questionsAnsweredPerDeck[deckUniqueId] += questionsAnswered;
    });
  });
}

async function calculateStats(userId) {
  const d = Date.now();
  const gameReports = await GameReportModel
    .find({ participants: userId })
    .sort({ startTime: 1 })
    .lean()
    .exec();

  if (gameReports.length === 0) {
    return undefined;
  }

  const stats = {
    mostRecentlyProcessedReportId: gameReports[0]._id.toString(),
    dailyStats: [],
  };

  gameReports.forEach((gameReport) => {
    addGameReport(userId, stats, gameReport);
  });

  addAggregateStats(stats);
  addEmptyDays(stats.dailyStats, Date.now() - (Date.now() % MS_PER_DAY));

  stats.timeMs = Date.now() - d;

  return stats;
}

module.exports = calculateStats;
