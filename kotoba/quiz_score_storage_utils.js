'use strict'
const persistence = require('./../core/persistence.js');

class Score {
  constructor(discordUserId, score) {
    this.discordUserId = discordUserId;
    this.score = score;
  }
}

function getScores(serverId) {
  return persistence.getGlobalData().then(data => {
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

      let aggregatedRow = aggregatedRows.find(row => {
        return row.userId === databaseRow.userId;
      });

      if (aggregatedRow) {
        aggregatedRow.score += databaseRow.score;
      } else {
        aggregatedRows.push({userId: databaseRow.userId, score: databaseRow.score, username: data.nameForUser[databaseRow.userId]});
      }
    }

    return aggregatedRows;
  });
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
          rowForScore.score += score;
        }
      }

      return data;
    });
  }

  static getGlobalScores() {
    return getScores();
  }

  static getServerScores(discordServerId) {
    return getScores(discordServerId);
  }
}

module.exports = QuizScoreStorageUtils;
