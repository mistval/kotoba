
const assert = require('assert');
const globals = require('./../globals.js');

const decksMetadata = require('./../../../generated/quiz/decks.json');

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
  console.time('calculate scores');

  const [quizScores, nameForUser] = await Promise.all([
    globals.persistence.getData('quizScores'),
    globals.persistence.getData('nameForUserId'),
  ]);

  const didSpecifyDecks = deckNames.length > 0;
  const deckUniqueIds = [];
  for (let i = 0; i < deckNames.length; i += 1) {
    const deckName = deckNames[i];
    if (!uniqueIdForDeckName[deckName]) {
      return createUnfoundDeckResult(deckName);
    }

    deckUniqueIds.push(uniqueIdForDeckName[deckName]);
  }

  const aggregateRowForUser = {};

  for (let rowIndex = 0; rowIndex < quizScores.length; rowIndex += 1) {
    const databaseRow = quizScores[rowIndex];

    if (serverId && databaseRow.serverId !== serverId) {
      // NOOP
    } else if (didSpecifyDecks && deckUniqueIds.indexOf(databaseRow.deckId) === -1) {
      // NOOP
    } else if (!didSpecifyDecks && databaseRow.deckId === SHIRITORI_DECK_ID) {
      // NOOP
    } else {
      const aggregatedRow = aggregateRowForUser[databaseRow.userId];

      if (aggregatedRow) {
        aggregatedRow.score += Math.floor(databaseRow.score);
      } else {
        aggregateRowForUser[databaseRow.userId] = {
          userId: databaseRow.userId,
          score: Math.floor(databaseRow.score),
          username: nameForUser[databaseRow.userId],
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

function updateScores(serverId, scoresForUserId) {
  return globals.persistence.editData('quizScores', (quizScores) => {
    const newQuizScores = Array.isArray(quizScores) ? quizScores.slice() : [];

    Object.keys(scoresForUserId).forEach((userId) => {
      assert(typeof userId === 'string', 'userId is not string');
      const rowsForUserAndServer = getRows(newQuizScores, userId, serverId);
      const scoreForDeck = scoresForUserId[userId] || {};
      const deckIds = Object.keys(scoreForDeck);

      if (deckIds.length === 0) {
        return;
      }

      const foundMatchingRowForDeckId = {};
      rowsForUserAndServer.forEach((row) => {
        if (scoreForDeck[row.deckId]) {
          if (foundMatchingRowForDeckId[row.deckId]) {
            globals.logger.logFailure('SCORES', 'It looks like we already added that score. There should\'t be more than one matching row but there is...');
          } else {
            // Some (very few) people have NaN scores in the database because of a bug.
            // So set them to 0 so that they can start increasing again.
            if (!row.score) {
              row.score = 0;
            }

            assert(typeof scoreForDeck[row.deckId] === 'number', 'Score for a deck is not a number');

            row.score += scoreForDeck[row.deckId];
            row.score = Math.floor(row.score);
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
            score: Math.floor(scoreForDeck[deckId]),
          };

          newQuizScores.push(newRow);
        }
      });
    });

    return newQuizScores;
  });
}

function updateNames(nameForUserId) {
  return globals.persistence.editData(
    'nameForUserId',
    oldNameForUserId => ({ ...oldNameForUserId, ...nameForUserId }),
  );
}

function addScores(serverId, scoresForUserId, nameForUserId) {
  assert(typeof serverId === 'string', 'serverId is not string');
  assert(typeof scoresForUserId === 'object', 'scoresForUserId is not object');
  assert(typeof nameForUserId === 'object', 'nameForUserId is not object');

  return Promise.all([
    updateScores(serverId, scoresForUserId),
    updateNames(nameForUserId),
  ]);
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
};
