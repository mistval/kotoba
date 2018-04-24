const reload = require('require-reload')(require);
const assert = require('assert');

const { persistence, logger } = reload('monochrome-bot');
const decksMetadata = reload('./../../objects/quiz/decks.json');

const SHIRITORI_DECK_ID = 'shiritori';

const uniqueIdForDeckName = {};

Object.keys(decksMetadata).forEach((deckName) => {
  const { uniqueId } = decksMetadata[deckName];
  uniqueIdForDeckName[deckName.toLowerCase()] = uniqueId;
});

uniqueIdForDeckName[SHIRITORI_DECK_ID] = SHIRITORI_DECK_ID;

function createUnfoundDeckResult(unfoundDeckName) {
  return {
    unfoundDeckName,
  };
}

function createOkayResult(rows) {
  return {
    rows,
  };
}

async function getScores(serverId, deckNames) {
  const data = await persistence.getGlobalData();
  console.time('calculate scores');

  const didSpecifyDecks = deckNames.length > 0;
  const deckUniqueIds = [];
  for (let i = 0; i < deckNames.length; i += 1) {
    const deckName = deckNames[i];
    if (!uniqueIdForDeckName[deckName]) {
      return createUnfoundDeckResult(deckName);
    }

    deckUniqueIds.push(uniqueIdForDeckName[deckName]);
  }

  if (!data.quizScores) {
    return createOkayResult([]);
  }

  if (!data.nameForUser) {
    data.nameForUser = {};
  }

  const aggregateRowForUser = {};
  const databaseRows = data.quizScores;

  for (let rowIndex = 0; rowIndex < databaseRows.length; rowIndex += 1) {
    const databaseRow = databaseRows[rowIndex];

    if (serverId && databaseRow.serverId !== serverId) {
      // NOOP
    } else if (didSpecifyDecks && deckUniqueIds.indexOf(databaseRow.deckId) === -1) {
      // NOOP
    } else if (!didSpecifyDecks && databaseRow.deckId === SHIRITORI_DECK_ID) {
      // NOOP
    } else {
      const aggregatedRow = aggregateRowForUser[databaseRow.userId];

      if (aggregatedRow) {
        aggregatedRow.score += databaseRow.score;
      } else {
        aggregateRowForUser[databaseRow.userId] = {
          userId: databaseRow.userId,
          score: databaseRow.score,
          username: data.nameForUser[databaseRow.userId],
          deckId: databaseRow.deckId,
        };
      }
    }
  }

  const aggregatedRows = Object.keys(aggregateRowForUser)
    .map(userId => aggregateRowForUser[userId]);

  console.timeEnd('calculate scores');

  return createOkayResult(aggregatedRows);
}

function getRows(allRows, userId, serverId) {
  const rowsForUser = [];
  for (let i = 0; i < allRows.length; i += 1) {
    if (allRows[i].userId === userId && allRows[i].serverId === serverId) {
      rowsForUser.push(allRows[i]);
    }
  }

  return rowsForUser;
}

class QuizScoreStorageUtils {
  static addScores(serverId, scoresForUserId, nameForUserId) {
    assert(typeof serverId === 'string', 'serverId is not string');
    assert(typeof scoresForUserId === 'object', 'scoresForUserId is not object');
    assert(typeof nameForUserId === 'object', 'nameForUserId is not object');

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

      Object.keys(scoresForUserId).forEach((userId) => {
        assert(typeof userId === 'string', 'userId is not string');
        const rowsForUserAndServer = getRows(data.quizScores, userId, serverId);
        const scoreForDeck = scoresForUserId[userId];
        const deckIds = Object.keys(scoreForDeck);

        const foundMatchingRowForDeckId = {};
        rowsForUserAndServer.forEach((row) => {
          if (scoreForDeck[row.deckId]) {
            if (foundMatchingRowForDeckId[row.deckId]) {
              logger.logFailure('SCORES', 'It looks like we already added that score. There should\'t be more than one matching row but there is...');
            } else {
              // Some (very few) people have NaN scores in the database because of a bug.
              // So set them to 0 so that they can start increasing again.
              if (!row.score) {
                // eslint-disable-next-line no-param-reassign
                row.score = 0;
              }

              assert(typeof scoreForDeck[row.deckId] === 'number', 'Score for a deck is not a number');

              // eslint-disable-next-line no-param-reassign
              row.score += Math.floor(scoreForDeck[row.deckId]);
              foundMatchingRowForDeckId[row.deckId] = true;
            }
          }
        });

        deckIds.forEach((deckId) => {
          if (!foundMatchingRowForDeckId[deckId]) {
            const newRow = {
              userId,
              serverId,
              deckId,
              score: scoreForDeck[deckId],
            };
            data.quizScores.push(newRow);
          }
        });

        const name = nameForUserId[userId];

        // Hotspot. Don't want to copy.
        // eslint-disable-next-line no-param-reassign
        data.nameForUser[userId] = name;
      });


      return data;
    });
  }

  static getGlobalScores(deckNames) {
    return getScores(undefined, deckNames);
  }

  static getServerScores(serverId, deckNames) {
    return getScores(serverId, deckNames);
  }
}

module.exports = QuizScoreStorageUtils;
