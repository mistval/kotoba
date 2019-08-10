const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(dbConnection);

const MS_PER_DAY = 86400000;
const WMA_PERIOD = 5;

async function getShortNameForUniqueId(uniqueId) {
  const customDeck = await CustomDeckModel.findOne({ uniqueId });
  if (customDeck) {
    return customDeck.shortName;
  }

  return uniqueId;
}

async function getShortNamesForUniqueIds(uniqueIds) {
  const shortNamePromises = uniqueIds.map(uniqueId => getShortNameForUniqueId(uniqueId));
  const shortNames = await Promise.all(shortNamePromises);

  const shortNameForUniqueId = {};
  uniqueIds.forEach((uniqueId, i) => {
    shortNameForUniqueId[uniqueId] = shortNames[i];
  });

  return shortNameForUniqueId;
}

function createEmptyDay(dateInt) {
  return {
    dateInt,
    questionsAnsweredPerDeck: {},
    questionsSeenPerDeck: {},
    questionsSeen: 0,
    questionsAnswered: 0,
    percentCorrect: 0,
  };
}

function addEmptyDays(dailyStats, untilAndIncluding) {
  const hasPreviousDays = dailyStats.length !== 0;
  if (hasPreviousDays) {
    const previousDay = dailyStats[dailyStats.length - 1];
    const numEmptyDays = ((untilAndIncluding - previousDay.dateInt) / MS_PER_DAY);
    for (let i = 0; i < numEmptyDays; i += 1) {
      dailyStats.push(createEmptyDay(previousDay.dateInt + (MS_PER_DAY * (i + 1))));
    }
  } else {
    dailyStats.push(createEmptyDay(untilAndIncluding));
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
      dailyStats.questionsAnswered += 1;
    }

    dailyStats.questionsSeenPerDeck[deckUniqueId] += 1;
    dailyStats.questionsSeen += 1;
  }
}

function calculateWMA(dailyValues) {
  let lastNonZeroDailyValue = 0;
  return dailyValues.map((dailyValue, dailyIndex) => {
    if (dailyValue !== 0) {
      lastNonZeroDailyValue = dailyValue;
    }

    const wmaPeriod = Math.min(WMA_PERIOD, dailyIndex + 1);
    let periodIndex = (dailyIndex - wmaPeriod) + 1;
    let periodMultiplier = wmaPeriod - (dailyIndex - periodIndex);
    let wmaNumerator = 0;
    let wmaDenominator = 0;
    for (; periodIndex <= dailyIndex; periodIndex += 1, periodMultiplier += 1) {
      wmaNumerator += (dailyValues[periodIndex] || lastNonZeroDailyValue) * periodMultiplier;
      wmaDenominator += periodMultiplier;
    }
    return wmaNumerator / wmaDenominator;
  });
}

async function addAggregateStats(statsIn) {
  const stats = {
    ...statsIn,
    questionsAnsweredPerDeck: {},
    questionsSeenPerDeck: {},
    percentCorrectPerDeckWMA: {},
  };

  const allSeenDeckUniqueIds = {};

  // Loop over the stats for each day
  stats.dailyStats = stats.dailyStats.map((dailyStatsIn) => {
    const dailyStats = {
      ...dailyStatsIn,
      percentCorrectPerDeck: {},
    };

    // Loop over each deck in the stats for this day
    Object.keys(dailyStats.questionsSeenPerDeck).forEach((deckUniqueId) => {
      if (!stats.questionsSeenPerDeck[deckUniqueId]) {
        stats.questionsSeenPerDeck[deckUniqueId] = 0;
      }

      if (!stats.questionsAnsweredPerDeck[deckUniqueId]) {
        stats.questionsAnsweredPerDeck[deckUniqueId] = 0;
      }

      allSeenDeckUniqueIds[deckUniqueId] = true;
      const questionsSeen = dailyStats.questionsSeenPerDeck[deckUniqueId];
      const questionsAnswered = dailyStats.questionsAnsweredPerDeck[deckUniqueId] || 0;

      // Add today's questions seen/answered deck stats to the aggregate's total deck stats.
      stats.questionsSeenPerDeck[deckUniqueId] += questionsSeen;
      stats.questionsAnsweredPerDeck[deckUniqueId] += questionsAnswered;

      // Calculate the percent correct for this deck today.
      dailyStats.percentCorrectPerDeck[deckUniqueId] = (questionsAnswered / questionsSeen) * 100;
    });

    // Calculate the overall percent correct for today.
    if (!dailyStats.questionsSeen) {
      dailyStats.percentCorrect = 0;
    } else {
      dailyStats.percentCorrect = (dailyStats.questionsAnswered / dailyStats.questionsSeen) * 100;
    }

    return dailyStats;
  });

  // Calculate percent correct WMA
  stats.percentCorrectWMA = calculateWMA(stats.dailyStats.map(s => s.percentCorrect));

  // For each deck, calculate the percent correct WMA
  const allDecks = Object.keys(stats.questionsSeenPerDeck);
  allDecks.forEach((deckUniqueId) => {
    const dailyPercentCorrect = stats.dailyStats
      .map(d => d.percentCorrectPerDeck[deckUniqueId] || 0);

    stats.percentCorrectPerDeckWMA[deckUniqueId] = calculateWMA(dailyPercentCorrect);
  });

  stats.deckShortNameForUniqueId = await getShortNamesForUniqueIds(
    Object.keys(allSeenDeckUniqueIds),
  );

  return stats;
}

async function calculateStats(userId) {
  const gameReports = await GameReportModel
    .find({ participants: userId })
    .sort({ startTime: 1 })
    .lean()
    .exec();

  if (gameReports.length === 0) {
    return undefined;
  }

  let stats = {
    mostRecentlyProcessedReportId: gameReports[gameReports.length - 1]._id.toString(),
    dailyStats: [],
  };

  gameReports.forEach((gameReport) => {
    addGameReport(userId, stats, gameReport);
  });

  addEmptyDays(stats.dailyStats, Date.now() - (Date.now() % MS_PER_DAY));
  stats = await addAggregateStats(stats);

  return stats;
}

module.exports = calculateStats;
