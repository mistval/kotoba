
const assert = require('assert');
const globals = require('../globals.js');
const dbConnection = require('kotoba-node-common').database.connection;
const scoreModels = require('kotoba-node-common').models.scores;
const { createCustomDeckModel } = require('kotoba-node-common').models;

const SHIRITORI_DECK_ID = 'shiritori';
const DECK_NOT_FOUND_ERROR_CODE = 'ENODECK';

const UserGlobalTotalScoreModel = scoreModels.createUserGlobalTotalScoreModel(dbConnection);
const UserServerTotalScoreModel = scoreModels.createUserServerTotalScoreModel(dbConnection);
const UserGlobalDeckScoreModel = scoreModels.createUserGlobalDeckScoreModel(dbConnection);
const UserServerDeckScoreModel = scoreModels.createUserServerDeckScoreModel(dbConnection);
const CustomDeckModel = createCustomDeckModel(dbConnection);

function updateUserGlobalTotalScore(userId, score, userName) {
  if (Math.floor(score) <= 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');

  return UserGlobalTotalScoreModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        lastKnownUsername: userName,
      },
      $inc: {
        score: Math.floor(score),
      },
    },
    { upsert: true },
  );
}

async function updateUserServerTotalScore(userId, serverId, score, userName) {
  if (Math.floor(score) <= 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');
  assert(typeof serverId === typeof '', 'Bad serverId');

  return UserServerTotalScoreModel.findOneAndUpdate(
    { userId, serverId },
    {
      $set: {
        serverId,
        userId,
        lastKnownUsername: userName,
      },
      $inc: {
        score: Math.floor(score),
      },
    },
    { upsert: true },
  );
}

function updateUserGlobalDeckScore(userId, deckUniqueId, score, userName) {
  if (Math.floor(score) <= 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');
  assert(typeof deckUniqueId === typeof '', 'Bad deckUniqueId');

  return UserGlobalDeckScoreModel.findOneAndUpdate(
    { userId, deckUniqueId },
    {
      $set: {
        userId,
        deckUniqueId,
        lastKnownUsername: userName,
      },
      $inc: {
        score: Math.floor(score),
      },
    },
    { upsert: true },
  );
}

async function updateUserServerDeckScore(userId, serverId, deckUniqueId, score, userName) {
  if (Math.floor(score) <= 0) {
    return;
  }

  assert(typeof userId === typeof '', 'Bad userId');
  assert(typeof serverId === typeof '', 'Bad serverId');
  assert(typeof deckUniqueId === typeof '', 'Bad deckUniqueId');

  return UserServerDeckScoreModel.findOneAndUpdate(
    { userId, serverId, deckUniqueId },
    {
      $set: {
        userId,
        serverId,
        deckUniqueId,
        lastKnownUsername: userName,
      },
      $inc: {
        score: Math.floor(score),
      },
    },
    { upsert: true },
  );
}

class GlobalTotalScoreQuery {
  countUsers() {
    return UserGlobalTotalScoreModel.countDocuments({}).exec();
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

  async getUserRankAndScore(userId) {
    const userRecord = await UserGlobalTotalScoreModel.findOne({ userId });
    if (!userRecord) {
      return undefined;
    }

    const { score } = userRecord;
    const numHigherScorers = await UserGlobalTotalScoreModel.countDocuments({ score: { $gt: score } }).exec();

    return { rank: numHigherScorers, score };
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
      }],
    );

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
        $project: {
          _id: 0,
        },
      }],
    );
  }

  async getUserRankAndScore(userId) {
    const scoreAggregate = await UserGlobalDeckScoreModel.aggregate([{
        $match: { deckUniqueId: { $in: this.deckUniqueIds }, userId },
      }, {
        $group: {
          _id: null,
          score: { $sum: '$score' },
        },
      }],
    );

    if (!scoreAggregate[0]) {
      return undefined;
    }

    const { score } = scoreAggregate[0];

    const higherScorersAggregate = await UserGlobalDeckScoreModel.aggregate([{
        $match: { deckUniqueId: { $in: this.deckUniqueIds }},
      }, {
        $group: {
          _id: '$userId',
          score: { $sum: '$score' },
        },
      }, {
        $match: { score: { $gt: score } },
      }, {
        $count: 'count',
      }],
    );

    const rank = higherScorersAggregate[0] ? higherScorersAggregate[0].count : 0;

    return { rank, score };
  }
}

class ServerTotalScoreQuery {
  constructor(serverId) {
    this.serverId = serverId;
  }

  countUsers() {
    return UserServerTotalScoreModel.countDocuments({ serverId: this.serverId }).exec();
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
      }, {
        $project: {
          _id: 0,
        },
      }]);
  }

  async getUserRankAndScore(userId) {
    const userRecord = await UserServerTotalScoreModel.findOne({
      userId,
      serverId: this.serverId
    });

    if (!userRecord) {
      return undefined;
    }

    const { score } = userRecord;
    const numHigherScorers = await UserServerTotalScoreModel.countDocuments({
      score: { $gt: score },
      serverId: this.serverId,
    }).exec();

    return { rank: numHigherScorers, score };
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
        $project: {
          _id: 0,
        },
      }]);
  }

  async getUserRankAndScore(userId) {
    const scoreAggregate = await UserServerDeckScoreModel.aggregate([{
        $match: { deckUniqueId: { $in: this.deckUniqueIds }, serverId: this.serverId, userId },
      }, {
        $group: {
          _id: null,
          score: { $sum: '$score' },
        },
      }],
    );

    if (!scoreAggregate[0]) {
      return undefined;
    }

    const { score } = scoreAggregate[0];

    const higherScorersAggregate = await UserServerDeckScoreModel.aggregate([{
        $match: { deckUniqueId: { $in: this.deckUniqueIds }, serverId: this.serverId },
      }, {
        $group: {
          _id: '$userId',
          score: { $sum: '$score' },
        },
      }, {
        $match: { score: { $gt: score } },
      }, {
        $count: 'count',
      }],
    );

    const rank = higherScorersAggregate[0] ? higherScorersAggregate[0].count : 0;

    return { rank, score };
  }
}

async function getDeckUniqueIds(deckNames) {
  const promises = deckNames.map(deckName => deckName.toLowerCase()).map(async (deckName) => {
    if (deckName === SHIRITORI_DECK_ID) {
      return SHIRITORI_DECK_ID;
    }

    const deckMeta = globals.resourceDatabase.getQuizDeckMeta(deckName);

    if (deckMeta) {
      return deckMeta.uniqueId;
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
    if (!scoreForDeck) {
      return;
    }

    const username = usernameForUserId[userId];
    let totalUserScore = 0;

    Object.entries(scoreForDeck).forEach(([deckId, score]) => {
      assert(typeof score === typeof 1, 'Score isn\'t a number');
      assert(score >= 0, 'Score is negative');

      if (deckId !== SHIRITORI_DECK_ID) {
        totalUserScore += score;
      }

      promises.push(updateUserGlobalDeckScore(userId, deckId, score, username));

      if (serverId) {
        promises.push(updateUserServerDeckScore(userId, serverId, deckId, score, username));
      }
    });

    promises.push(updateUserGlobalTotalScore(userId, totalUserScore, username));

    if (serverId) {
      promises.push(updateUserServerTotalScore(userId, serverId, totalUserScore, username));
    }
  });

  return Promise.all(promises);
}

function clearServerScores(serverId, userId) {
  const filter = userId
    ? { serverId, userId }
    : { serverId };

  return Promise.all([
    UserServerTotalScoreModel.deleteMany(filter),
    UserServerDeckScoreModel.deleteMany(filter),
  ]);
}

function getGlobalScores(deckNames) {
  return getScores(undefined, deckNames);
}

function getServerScores(serverId, deckNames) {
  return getScores(serverId, deckNames);
}

function clearUserScores(userId) {
  return Promise.all([
    UserServerTotalScoreModel.deleteMany({ userId }).exec(),
    UserServerDeckScoreModel.deleteMany({ userId }).exec(),
    UserGlobalDeckScoreModel.deleteMany({ userId }).exec(),
    UserGlobalDeckScoreModel.deleteMany({ userId }).exec(),
  ]);
}

module.exports = {
  addScores,
  getGlobalScores,
  getServerScores,
  clearServerScores,
  clearUserScores,
  DECK_NOT_FOUND_ERROR_CODE,
};
