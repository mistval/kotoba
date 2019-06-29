
const assert = require('assert');
const globals = require('./../globals.js');
const dbConnection = require('kotoba-node-common').database.connection;
const scoreModels = require('kotoba-node-common').models.scores;
const { createCustomDeckModel } = require('kotoba-node-common').models;
const decksMetadata = require('./../../../generated/quiz/decks.json');

const SHIRITORI_DECK_ID = 'shiritori';
const DECK_NOT_FOUND_ERROR_CODE = 'ENODECK';

const UserGlobalTotalScoreModel = scoreModels.createUserGlobalTotalScoreModel(dbConnection);
const UserServerTotalScoreModel = scoreModels.createUserServerTotalScoreModel(dbConnection);
const UserGlobalDeckScoreModel = scoreModels.createUserGlobalDeckScoreModel(dbConnection);
const UserServerDeckScoreModel = scoreModels.createUserServerDeckScoreModel(dbConnection);
const CustomDeckModel = createCustomDeckModel(dbConnection);

const uniqueIdForDeckName = {};

Object.keys(decksMetadata).forEach((deckName) => {
  const { uniqueId } = decksMetadata[deckName];
  uniqueIdForDeckName[deckName.toLowerCase()] = uniqueId;
});

uniqueIdForDeckName[SHIRITORI_DECK_ID] = SHIRITORI_DECK_ID;

async function updateUserGlobalTotalScore(userId, score, userName) {
  if (Math.floor(score) === 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');

  let userGlobalTotalScore = await UserGlobalTotalScoreModel.findOne({ userId });
  if (!userGlobalTotalScore) {
    userGlobalTotalScore = new UserGlobalTotalScoreModel({ userId, score: 0 });
  }

  userGlobalTotalScore.score = Math.floor(userGlobalTotalScore.score + score);
  userGlobalTotalScore.lastKnownUsername = userName;

  return userGlobalTotalScore.save();
}

async function updateUserServerTotalScore(userId, serverId, score, userName) {
  if (Math.floor(score) === 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');
  assert(typeof serverId === typeof '', 'Bad serverId');

  let userServerTotalScore = await UserServerTotalScoreModel.findOne({ userId, serverId });
  if (!userServerTotalScore) {
    userServerTotalScore = new UserServerTotalScoreModel({ userId, serverId, score: 0 });
  }

  userServerTotalScore.score = Math.floor(userServerTotalScore.score + score);
  userServerTotalScore.lastKnownUsername = userName;

  return userServerTotalScore.save();
}

async function updateUserGlobalDeckScore(userId, deckUniqueId, score, userName) {
  if (Math.floor(score) === 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');
  assert(typeof deckUniqueId === typeof '', 'Bad deckUniqueId');

  let userGlobalDeckScore = await UserGlobalDeckScoreModel.findOne({ userId, deckUniqueId });
  if (!userGlobalDeckScore) {
    userGlobalDeckScore = new UserGlobalDeckScoreModel({ userId, deckUniqueId, score: 0 });
  }

  userGlobalDeckScore.score = Math.floor(userGlobalDeckScore.score + score);
  userGlobalDeckScore.lastKnownUsername = userName;

  return userGlobalDeckScore.save();
}

async function updateUserServerDeckScore(userId, serverId, deckUniqueId, score, userName) {
  if (Math.floor(score) === 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');
  assert(typeof serverId === typeof '', 'Bad serverId');
  assert(typeof deckUniqueId === typeof '', 'Bad deckUniqueId');

  let userServerDeckScore = await UserServerDeckScoreModel.findOne({ userId, serverId, deckUniqueId });
  if (!userServerDeckScore) {
    userServerDeckScore = new UserServerDeckScoreModel({ userId, serverId, deckUniqueId, score: 0 });
  }

  userServerDeckScore.score = Math.floor(userServerDeckScore.score + score);
  userServerDeckScore.lastKnownUsername = userName;

  return userServerDeckScore.save();
}

/* MONGO MIGRATION CODE START */

async function migrateRowToMongo(row, nameForUserId) {
  const { userId, score, deckId = 'unknown_deck', serverId } = row;
  const userName = nameForUserId[userId] || 'Unknown User';

  const deckIdString = typeof deckId === typeof '' ? deckId : deckId.toString();

  if (!score) {
    return;
  }

  if (!userId || !serverId || !score || !deckIdString || !userName) {
    throw new Error(`Invalid row: ${userId}, ${serverId}, ${score}, ${deckIdString}, ${userName}`);
  }

  const promises = [];

  if (deckIdString !== SHIRITORI_DECK_ID) {
    promises.push(updateUserGlobalTotalScore(userId, score, userName));
    promises.push(updateUserServerTotalScore(userId, serverId, score, userName));
  }

  promises.push(updateUserGlobalDeckScore(userId, deckIdString, score, userName));
  promises.push(updateUserServerDeckScore(userId, serverId, deckIdString, score, userName));

  await Promise.all(promises);
}

async function migrateScoresToMongo(quizScores, nameForUserId) {
  await Promise.all([
    UserGlobalTotalScoreModel.remove({}),
    UserServerTotalScoreModel.remove({}),
    UserGlobalDeckScoreModel.remove({}),
    UserServerDeckScoreModel.remove({}),
  ]);

  for (let rowIndex = 0; rowIndex < quizScores.length; rowIndex += 1) {
    const databaseRow = quizScores[rowIndex];
    console.log(`Migrating row ${rowIndex} of ${quizScores.length}`);
    await migrateRowToMongo(databaseRow, nameForUserId);
  }
}

setTimeout(() => {
  Promise.all([
    globals.persistence.getData('quizScores'),
    globals.persistence.getData('nameForUserId'),
  ]).then(([quizScores, nameForUserId]) => {
    if (quizScores) {
      globals.logger.logSuccess('SCORES', 'Migrating scores to Mongo');
      return migrateScoresToMongo(quizScores, nameForUserId);
    }
  }).then(() => {
    globals.logger.logSuccess('SCORES', 'Score migration complete.');
  }).catch((err) => {
    globals.logger.logFailure('SCORES', 'Error migrating scores.', err);
    process.exit(1);
  });
}, 3000);

/* MONGO MIGRATION CODE END */

class GlobalTotalScoreQuery {
  countUsers() {
    return UserGlobalTotalScoreModel.countDocuments({});
  }

  async countTotalScore() {
    const aggregate = await UserGlobalTotalScoreModel.aggregate([{
      $group: {
        _id: null,
        total: { $sum: '$score' },
      },
    }]);

    return aggregate[0] ? aggregate[0].total : 0;
  }

  getScores(startIndex, endIndex) {
    return UserGlobalTotalScoreModel
      .find({}, { lastKnownUsername: 1, score: 1, _id: 0 })
      .sort('-score')
      .skip(startIndex)
      .limit(endIndex - startIndex)
      .lean()
      .exec();
  }
}

class GlobalDeckScoreQuery {
  constructor(deckUniqueIds) {
    this.deckUniqueIds = deckUniqueIds;
  }

  async countUsers() {
    const userIds = await UserGlobalDeckScoreModel
      .distinct('userId', { deckUniqueId: { $in: this.deckUniqueIds }});

    return userIds.length;
  }

  async countTotalScore() {
    const aggregate = await UserGlobalDeckScoreModel.aggregate([{
      $match: { deckUniqueId: { $in: this.deckUniqueIds }},
    }, {
      $group: {
        _id: null,
        total: { $sum: '$score' },
      },
    }]);

    return aggregate[0] ? aggregate[0].total : 0;
  }

  getScores(startIndex, endIndex) {
    return UserGlobalDeckScoreModel.aggregate([{
        $match: { deckUniqueId: { $in: this.deckUniqueIds }},
      }, {
        $group: {
          _id: '$userId',
          score: { $sum: '$score' },
          lastKnownUsername: { $last: '$lastKnownUsername' },
        },
      }, {
        $sort: { score: -1 },
      }, {
        $skip: startIndex,
      }, {
        $limit: endIndex - startIndex,
      }, {
        $project: { _id: 0 },
      }]);
  }
}

class ServerTotalScoreQuery {
  constructor(serverId) {
    this.serverId = serverId;
  }

  countUsers() {
    return UserServerTotalScoreModel.countDocuments({ serverId: this.serverId });
  }

  async countTotalScore() {
    const aggregate = await UserServerTotalScoreModel.aggregate([{
      $match: { serverId: this.serverId },
    },{
      $group: {
        _id: null,
        total: { $sum: '$score' },
      },
    }]);

    return aggregate[0] ? aggregate[0].total : 0;
  }

  getScores(startIndex, endIndex) {
    return UserServerTotalScoreModel.aggregate([{
        $match: { serverId: this.serverId },
      }, {
        $group: {
          _id: '$userId',
          score: { $sum: '$score' },
          lastKnownUsername: { $last: '$lastKnownUsername' },
        },
      }, {
        $sort: { score: -1 },
      }, {
        $skip: startIndex,
      }, {
        $limit: endIndex - startIndex,
      }]);
  }
}

class ServerDeckScoreQuery {
  constructor(serverId, deckUniqueIds) {
    this.serverId = serverId;
    this.deckUniqueIds = deckUniqueIds;
  }

  async countUsers() {
    const userIds = await UserServerDeckScoreModel
      .distinct('userId', { deckUniqueId: { $in: this.deckUniqueIds }, serverId: this.serverId });

    return userIds.length;
  }

  async countTotalScore() {
    const aggregate = await UserServerDeckScoreModel.aggregate([{
      $match: { deckUniqueId: { $in: this.deckUniqueIds }, serverId: this.serverId },
    }, {
      $group: {
        _id: null,
        total: { $sum: '$score' },
      },
    }]);

    return aggregate[0] ? aggregate[0].total : 0;
  }

  getScores(startIndex, endIndex) {
    return UserServerDeckScoreModel.aggregate([{
        $match: { deckUniqueId: { $in: this.deckUniqueIds }, serverId: this.serverId },
      }, {
        $group: {
          _id: '$userId',
          score: { $sum: '$score' },
          lastKnownUsername: { $last: '$lastKnownUsername' },
        },
      }, {
        $sort: { score: -1 },
      }, {
        $skip: startIndex,
      }, {
        $limit: endIndex - startIndex,
      }, {
        $project: { _id: 0 },
      }]);
  }
}

async function getDeckUniqueIds(deckNames) {
  const promises = deckNames.map(deckName => deckName.toLowerCase()).map(async (deckName) => {
    if (uniqueIdForDeckName[deckName]) {
      return uniqueIdForDeckName[deckName];
    }

    if (Object.values(uniqueIdForDeckName).includes(deckName)) {
      return deckName;
    }

    const customDeck = await CustomDeckModel
      .findOne({ shortName: deckName }, { _id: 0, uniqueId: 1 })
      .lean().exec();

    if (customDeck) {
      return customDeck.uniqueId;
    }

    const deckNotFoundError = new Error('Deck not found');
    deckNotFoundError.code = DECK_NOT_FOUND_ERROR_CODE;
    deckNotFoundError.notFoundName = deckName;

    throw deckNotFoundError;
  });

  return Promise.all(promises);
}

async function getScores(serverId, deckNames = []) {
  const deckUniqueIds = await getDeckUniqueIds(deckNames);

  if (deckUniqueIds.length === 0) {
    if (serverId) {
      return new ServerTotalScoreQuery(serverId);
    } else {
      return new GlobalTotalScoreQuery();
    }
  }

  if (serverId) {
    return new ServerDeckScoreQuery(serverId, deckUniqueIds);
  }

  return new GlobalDeckScoreQuery(deckUniqueIds);
}

function addScores(serverId, scoresForUserId, usernameForUserId) {
  const promises = [];

  Object.entries(scoresForUserId).forEach(([userId, scoreForDeck]) => {
    const username = usernameForUserId[userId];
    let totalUserScore = 0;

    Object.entries(scoreForDeck).forEach(([deckId, score]) => {
      totalUserScore += score;
      promises.push(updateUserGlobalDeckScore(userId, deckId, score, username));

      if (serverId) {
        promises.push(updateUserServerDeckScore(userId, serverId, deckId, score, username));
      }
    });

    if (deckId !== SHIRITORI_DECK_ID) {
      promises.push(updateUserGlobalTotalScore(userId, totalUserScore, username));

      if (serverId) {
        promises.push(updateUserServerTotalScore(userId, serverId, totalUserScore, username));
      }
    }
  });

  return Promise.all(promises);
}

function getGlobalScores(deckNames) {
  return getScores(undefined, deckNames);
}

function getServerScores(serverId, deckNames) {
  return getScores(serverId, deckNames);
}

module.exports = {
  addScores,
  getGlobalScores,
  getServerScores,
  DECK_NOT_FOUND_ERROR_CODE,
};
