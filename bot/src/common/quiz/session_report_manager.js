const dbConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(dbConnection);
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(dbConnection);
const globals = require('./../globals.js');

const LOGGER_TITLE = 'SESSION REPORT MANAGER';

const pendingReportForLocationId = {};
const mostRecentReportIdForLocationId = {};

let finishUpdatingDb = Promise.resolve();

function calculateCanCopyToCustomDeck(card) {
  if (card.answerTimeLimitStrategy === 'ANAGRAMS') {
    return false;
  }
  
  if (card.scoreAnswerStrategy === 'MULTIPLE_ANSWERS_POSITION_POINTS') {
    return false;
  }

  if (card.questionCreationStrategy === 'IMAGE_URI') {
    return false;
  }

  if (card.options) {
    return false;
  }

  return true;
}

function notifyStarting(locationId, serverId, quizName) {
  try {
    if (pendingReportForLocationId[locationId]) {
      globals.logger.logFailure(LOGGER_TITLE, `There was already a report pending at ${locationId}. Weird.`);
    }
  
    const report = { quizName, cards: [], startTime: Date.now(), serverId };
    pendingReportForLocationId[locationId] = report;
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Error starting', err);
    delete pendingReportForLocationId[locationId];
  }
}

function notifyAnswered(locationId, card, answerers) {
  try {
    const report = pendingReportForLocationId[locationId];
    if (!report) {
      globals.logger.logFailure('Quiz', `Got an answered event at ${locationId}, but no pending report. Weird.`);
      return;
    }

    const reportCard = {
      question: card.question,
      answers: card.answer,
      comment: card.meaning,
      uri: card.dictionaryLink,
      linkQuestion: card.dictionaryLinkStrategy.indexOf('QUESTION') !== -1, // Epic hack...
      answererDiscordIds: answerers,
      questionCreationStrategy: card.questionCreationStrategy === 'IMAGE' ? 'IMAGE' : 'TEXT', // ..... epic hack
      instructions: card.instructions,
      canCopyToCustomDeck: calculateCanCopyToCustomDeck(card),
    };

    report.cards.push(reportCard);
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Error recording answer', err);
    delete pendingReportForLocationId[locationId];
  }
}

async function registerUser(user) {
  if (!user) {
    return;
  }

  let userModel;
  const registeredUserModel = await UserModel.findOne({ 'discordUser.id': user.id });

  if (registeredUserModel) {
    userModel = registeredUserModel;
  } else {
    userModel = new UserModel({ discordUser: {}, admin: false });
  }

  userModel.discordUser.username = user.username;
  userModel.discordUser.discriminator = user.discriminator;
  userModel.discordUser.id = user.id;
  userModel.discordUser.avatar = user.avatar;

  await userModel.save();
  return userModel;
}

async function notifyStopped(locationId, scores) {
  try {
    const report = pendingReportForLocationId[locationId];
    if (!report) {
      globals.logger.logFailure('Quiz', `Got a stopped event at ${locationId}, but no pending report. Weird.`);
      return;
    }

    if (report.cards.length === 0) {
      delete pendingReportForLocationId[locationId];
      delete mostRecentReportIdForLocationId[locationId];
      return;
    }

    delete pendingReportForLocationId[locationId];
    const allAnswererDiscordIdsNonUnique = report.cards
      .map(card => card.answererDiscordIds)
      .reduce((allIds, x) => allIds.concat(x), []);
    
    if (allAnswererDiscordIdsNonUnique.length === 0) {
      delete pendingReportForLocationId[locationId];
      return;
    }
    
    const allAnswererDiscordIds = allAnswererDiscordIdsNonUnique.filter((x, i) => allAnswererDiscordIdsNonUnique.indexOf(x) === i);
    const registerUserPromises = allAnswererDiscordIds.map(id => {
      const user = globals.monochrome.getErisBot().users.get(id);
      return registerUser(user);
    });

    const generateReportPromise = Promise.all(registerUserPromises).then((userModels) => {
      const userModelForId = {};
      allAnswererDiscordIdsNonUnique.forEach(id => {
        userModelForId[id] = userModels.find(userModel => userModel.discordUser.id === id);
      });

      const guild = globals.monochrome.getErisBot().guilds.get(report.serverId);

      const reportModel = new GameReportModel({
        sessionName: report.quizName,
        startTime: report.startTime,
        endTime: Date.now(),
        participants: userModels,
        discordServerIconUri: guild ? guild.iconURL : undefined,
        discordServerName: guild ? guild.name : undefined,
        discordChannelName: guild ? guild.channels.get(locationId).name : 'DM',
        scores: scores.map(score => ({ user: userModelForId[score.userId], score: score.totalScore })),
        questions: report.cards.map((card) => ({
          question: card.question,
          answers: card.answers,
          comment: card.comment,
          linkQuestion: card.linkQuestion,
          questionCreationStrategy: card.questionCreationStrategy,
          instructions: card.instructions,
          uri: card.uri,
          correctAnswerers: card.answererDiscordIds.map(id => userModelForId[id]),
          canCopyToCustomDeck: card.canCopyToCustomDeck,
        }))
      });

      return reportModel.save().then(() => {
        mostRecentReportIdForLocationId[locationId] = reportModel._id;
      });
    });

    finishUpdatingDb = Promise.all([finishUpdatingDb, registerUserPromises, generateReportPromise]);
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Error stopping and finishing report', err);
    delete pendingReportForLocationId[locationId];
    delete mostRecentReportIdForLocationId[locationId];
  }
}

function registerUserInfoFromMsg(msg) {
  if (usersToRegister[msg.author.id]) {
    return;
  }

  usersToRegister[msg.author.id] = {
    username: msg.author.username,
    discriminator: msg.author.discriminator,
    avatar: msg.author.avatar,
  };
}

async function getMostRecentReportUriForLocation(locationId) {
  await finishUpdatingDb;
  
  const reportId = mostRecentReportIdForLocationId[locationId];
  if (reportId) {
    return `https://kotobaweb.com/dashboard/game_reports/${mostRecentReportIdForLocationId[locationId]}`;
  }
}

module.exports = {
  notifyStarting,
  notifyAnswered,
  notifyStopped,
  registerUserInfoFromMsg,
  getMostRecentReportUriForLocation,
};
