'use strict'
const reload = require('require-reload')(require);
const persistence = reload('monochrome-bot').persistence;
const logger = reload('monochrome-bot').logger;
const decksMetadata = reload('./../../objects/quiz/decks.json');

const SHIRITORI_DECK_ID = 'shiritori';

const uniqueIdForDeckName = {};

Object.keys(decksMetadata).forEach((deckName) => {
  const uniqueId = decksMetadata[deckName].uniqueId;
  uniqueIdForDeckName[deckName.toLowerCase()] = uniqueId;
});

uniqueIdForDeckName[SHIRITORI_DECK_ID] = SHIRITORI_DECK_ID;

class Score {
  constructor(discordUserId, score) {
    this.discordUserId = discordUserId;
    this.score = score;
  }
}

async function getScores(serverId, deckName) {
  let deckUniqueId = uniqueIdForDeckName[deckName];

  if (deckName && !deckUniqueId) {
    return undefined;
  }

  const data = await persistence.getGlobalData();
  console.time('calculate scores');

  if (!data.quizScores) {
    return [];
  }
  if (!data.nameForUser) {
    data.nameForUser = {};
  }

  let aggregatedRows = [];
  let databaseRows = data.quizScores;
  while (databaseRows.length > 0) {
    let databaseRow = databaseRows.pop();

    if (serverId && databaseRow.serverId !== serverId) {
      continue;
    }
    if (deckUniqueId && databaseRow.deckId !== deckUniqueId) {
      continue;
    }
    if (!deckUniqueId && databaseRow.deckId === SHIRITORI_DECK_ID) {
      continue;
    }

    let aggregatedRow = aggregatedRows.find(row => {
      return row.userId === databaseRow.userId;
    });

    if (aggregatedRow) {
      aggregatedRow.score += databaseRow.score;
    } else {
      aggregatedRows.push({userId: databaseRow.userId, score: databaseRow.score, username: data.nameForUser[databaseRow.userId]});
    }
  }

  console.timeEnd('calculate scores');

  return aggregatedRows;
}

class QuizScoreStorageUtils {
  static addScores(discordServerId, deckId, scoreForUserId, nameForUserId) {
    return persistence.editGlobalData(data => {
      if (!data.quizScores) {
        data.quizScores = [];
      }
      if (!data.nameForUser) {
        data.nameForUser = {};
      }
      for (let userId of Object.keys(scoreForUserId)) {
        let score = scoreForUserId[userId];
        if (!score) {
          logger.logFailure('QUIZ SCORES', 'User has a falsy score. Skipping them, but this suggests a bug.');
          continue;
        }
        let name = nameForUserId[userId];
        data.nameForUser[userId] = name;
        let rowForScore = data.quizScores.find(row => {
          return row.userId === userId && row.serverId === discordServerId && row.deckId === deckId;
        });

        if (!rowForScore) {
          rowForScore = {
            userId: userId,
            serverId: discordServerId,
            deckId: deckId,
            score: score
          };
          data.quizScores.push(rowForScore);
        } else {
          // Some (very few) people have NaN scores in the database because of a bug.
          // So set them to 0 so that they can start increasing again.
          if (!rowForScore.score) {
            rowForScore.score = 0;
          }
          rowForScore.score += score;
        }
      }

      return data;
    });
  }

  static getGlobalScores(deckName) {
    return getScores(undefined, deckName);
  }

  static getServerScores(discordServerId, deckName) {
    return getScores(discordServerId, deckName);
  }
}

module.exports = QuizScoreStorageUtils;
