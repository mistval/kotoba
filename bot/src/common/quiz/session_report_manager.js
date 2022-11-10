const dbConnection = require('kotoba-node-common').database.connection;
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);
const globals = require('./../globals.js');
const updateDbFromUser = require('../../discord/db_helpers/update_from_user.js');
const updateDbFromGuild = require('../../discord/db_helpers/update_from_guild.js');
const { safeSetTimeout } = require('kotoba-common').safeTimers;

const pendingReportForLocationId = {};

function calculateCanCopyToCustomDeck(card) {
  if (card.answerTimeLimitStrategy === 'ANAGRAMS') {
    return false;
  }

  if (card.scoreAnswerStrategy === 'MULTIPLE_ANSWERS_POSITION_POINTS') {
    return false;
  }

  if (card.questionCreationStrategy === 'IMAGE_URI' || card.questionCreationStrategy === 'FORVO_AUDIO_FILE') {
    return false;
  }

  if (card.options) {
    return false;
  }

  return true;
}

function notifyStarting(
  rawStartCommand,
  locationId,
  serverId,
  quizName,
  settings,
  deckInfo,
  isLoaded,
) {
  try {
    if (pendingReportForLocationId[locationId]) {
      globals.logger.warn({
        event: 'PENDING REPORT ALREADY EXISTS',
        detail: locationId,
      });
    }

    const report = { quizName, cards: [], startTime: Date.now(), serverId, settings, deckInfo, isLoaded, rawStartCommand };
    pendingReportForLocationId[locationId] = report;
  } catch (err) {
    globals.logger.error({
      event: 'ERROR STARTING SESSION REPORT',
      err,
    });
    delete pendingReportForLocationId[locationId];
  }
}

function notifyAnswered(locationId, card, answerers) {
  try {
    const report = pendingReportForLocationId[locationId];
    if (!report) {
      globals.logger.warn({
        event: 'ANSWER RECEIVED BUT NOT PENDING REPORT',
        detail: locationId,
      });
      return;
    }

    const reportCard = {
      question: card.question.replace('/var/app/', ''), // hack...
      answers: card.answer,
      comment: card.meaning,
      uri: card.dictionaryLink,
      linkQuestion: card.dictionaryLinkStrategy.indexOf('QUESTION') !== -1, // Epic hack...
      answererDiscordIds: answerers,
      questionCreationStrategy: card.questionCreationStrategy === 'IMAGE' ? 'IMAGE' : 'TEXT', // ..... epic hack
      instructions: card.instructions,
      canCopyToCustomDeck: calculateCanCopyToCustomDeck(card),
      deckUniqueId: card.deckId,
    };

    report.cards.push(reportCard);
  } catch (err) {
    globals.logger.error({
      event: 'ERROR ADDING ANSWER TO SESSION REPORT',
      err,
    });
    delete pendingReportForLocationId[locationId];
  }
}

function registerUser(user) {
  if (!user) {
    return;
  }

  return updateDbFromUser(user);
}

async function notifyStopped(locationId, scores) {
  try {
    const report = pendingReportForLocationId[locationId];
    if (!report) {
      globals.logger.warn({
        event: 'STOP EVENT RECEIVED BUT NO PENDING REPORT',
        detail: locationId,
      });
      return;
    }

    report.scores = scores;
  } catch (err) {
    globals.logger.error({
      event: 'ERROR STOPPING AND FINISHING REPORT',
      err,
    });
    delete pendingReportForLocationId[locationId];
  }
}

function timeout() {
  return new Promise((fulfill) => {
    safeSetTimeout(fulfill, 5000);
  });
}

async function processPendingReportForLocation(channel) {
  try {
    const bot = globals.monochrome.getErisBot();
    const guild = channel.guild;

    const report = pendingReportForLocationId[channel.id];
    delete pendingReportForLocationId[channel.id];
    if (!report || report.cards.length === 0) {
      return;
    }

    const allAnswererDiscordIdsNonUnique = report.cards
      .map(card => card.answererDiscordIds)
      .reduce((allIds, x) => allIds.concat(x), []);

    if (allAnswererDiscordIdsNonUnique.length === 0) {
      return;
    }

    const allAnswererDiscordIdsUnique = allAnswererDiscordIdsNonUnique
      .filter((x, i) => allAnswererDiscordIdsNonUnique.indexOf(x) === i);

    const registerUserPromises = allAnswererDiscordIdsUnique.map(id => {
      const user = bot.users.get(id);
      return registerUser(user);
    });

    if (guild) {
      const allPromises = [...registerUserPromises, updateDbFromGuild(guild)];
      await Promise.all(allPromises);
    }

    const userModels = await Promise.all(registerUserPromises);

    const userModelForId = {};
    allAnswererDiscordIdsUnique.forEach(id => {
      userModelForId[id] = userModels.find(userModel => userModel.discordUser.id === id);
    });

    const scores = report.scores.map(score => ({
      user: userModelForId[score.userId],
      score: score.totalScore,
    })).filter(scoreInfo => scoreInfo.user);

    const reportModel = new GameReportModel({
      rawStartCommand: report.rawStartCommand,
      sessionName: report.quizName,
      startTime: report.startTime,
      endTime: Date.now(),
      participants: userModels,
      discordServerIconUri: guild ? guild.iconURL : undefined,
      discordServerName: guild ? guild.name : undefined,
      discordChannelName: guild ? channel.name : 'DM',
      scores,
      settings: report.settings,
      decks: report.deckInfo,
      isLoaded: report.isLoaded || false,
      questions: report.cards.map((card) => ({
        ...card,
        correctAnswerers: card.answererDiscordIds.map(id => userModelForId[id]),
      })),
    });

    await reportModel.save();
    return `https://kotobaweb.com/dashboard/game_reports/${reportModel._id}`;
  } catch (err) {
    globals.logger.error({
      event: 'ERROR STOPPING AND FINISHING REPORT',
      err,
    });
    delete pendingReportForLocationId[channel.id];
  }
}

async function getReportUriForLocation(channel) {
  return Promise.race([processPendingReportForLocation(channel), timeout()]);
}

module.exports = {
  notifyStarting,
  notifyAnswered,
  notifyStopped,
  getReportUriForLocation,
};
