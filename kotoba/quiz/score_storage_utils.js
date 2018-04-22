const reload = require('require-reload')(require);

const { persistence, logger } = reload('monochrome-bot');
const decksMetadata = reload('./../../objects/quiz/decks.json');

const SHIRITORI_DECK_ID = 'shiritori';

const uniqueIdForDeckName = {};

Object.keys(decksMetadata).forEach((deckName) => {
  const { uniqueId } = decksMetadata[deckName];
  uniqueIdForDeckName[deckName.toLowerCase()] = uniqueId;
});

uniqueIdForDeckName[SHIRITORI_DECK_ID] = SHIRITORI_DECK_ID;

async function getScores(serverId, deckName) {
  const deckUniqueId = uniqueIdForDeckName[deckName];

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

  const aggregatedRows = [];
  const databaseRows = data.quizScores;

  while (databaseRows.length > 0) {
    const databaseRow = databaseRows.pop();

    if (serverId && databaseRow.serverId !== serverId) {
      // NOOP
    } else if (deckUniqueId && databaseRow.deckId !== deckUniqueId) {
      // NOOP
    } else if (!deckUniqueId && databaseRow.deckId === SHIRITORI_DECK_ID) {
      // NOOP
    } else {
      const aggregatedRow = aggregatedRows.find(row => row.userId === databaseRow.userId);

      if (aggregatedRow) {
        aggregatedRow.score += databaseRow.score;
      } else {
        aggregatedRows.push({
          userId: databaseRow.userId,
          score: databaseRow.score,
          username: data.nameForUser[databaseRow.userId],
        });
      }
    }
  }

  console.timeEnd('calculate scores');

  return aggregatedRows;
}

class QuizScoreStorageUtils {
  static addScores(discordServerId, deckId, scoreForUserId, nameForUserId) {
    return persistence.editGlobalData((data) => {
      if (!data.quizScores) {
        // Hotspot. Don't want to copy.
        // eslint-disable-next-line no-param-reassign
        data.quizScores = [];
      }
      if (!data.nameForUser) {
        // Hotspot. Don't want to copy.
        // eslint-disable-next-line no-param-reassign
        data.nameForUser = {};
      }

      Object.keys(scoreForUserId).forEach((userId) => {
        const score = scoreForUserId[userId];
        if (!score) {
          logger.logFailure('QUIZ SCORES', 'User has a falsy score. Skipping them, but this suggests a bug.');
        } else {
          const name = nameForUserId[userId];

          // Hotspot. Don't want to copy.
          // eslint-disable-next-line no-param-reassign
          data.nameForUser[userId] = name;
          let rowForScore = data.quizScores.find(row =>
            row.userId === userId && row.serverId === discordServerId && row.deckId === deckId);

          if (!rowForScore) {
            rowForScore = {
              userId,
              serverId: discordServerId,
              deckId,
              score,
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
      });


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
