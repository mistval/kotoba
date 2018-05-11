const reload = require('require-reload')(require);
const state = require('./static_state.js');
const persistence = reload('monochrome-bot').persistence;

// Piggyback on the quiz scores for now.
const quizScoreStorageUtils = reload('./quiz/score_storage_utils.js');

if (!state.scoreManager) {
  state.scoreManager = {
    scoresForLocationId: {},
    nameForUserId: {},
    scoreScopeIdForLocationId: {},
  };
}

const scoresForLocationId = state.scoreManager.scoresForLocationId;
const nameForUserId = state.scoreManager.nameForUserId;
const scoreScopeIdForLocationId = state.scoreManager.scoreScopeIdForLocationId;

function registerUsernameForUserId(userId, userName) {
  nameForUserId[userId] = userName;
}

function registerScoreScopeIdForLocationId(locationId, scoreScopeId) {
  scoreScopeIdForLocationId[locationId] = scoreScopeId;
}

function checkUsernameRegisteredForUserId(userId) {
  if (!nameForUserId[userId]) {
    throw new Error(`No username has been registered for that user ID`);
  }
}

function checkScoreScopeIdRegisteredForLocationId(locationId) {
  if (!scoreScopeIdForLocationId[locationId]) {
    throw new Error(`No score scope ID has been registed for that location ID`);
  }
}

function addScore(locationId, userId, score) {
  checkUsernameRegisteredForUserId(userId);
  checkScoreScopeIdRegisteredForLocationId(locationId);

  if (!scoresForLocationId[locationId]) {
    scoresForLocationId[locationId] = {};
  }

  let scoreForUser = scoresForLocationId[locationId];
  if (!scoreForUser[userId]) {
    scoreForUser[userId] = 0;
  }

  scoreForUser[userId] += score;
}

function commitAndClearScores(locationId, deckId) {
  let scoreForUserId = scoresForLocationId[locationId];
  if (!scoreForUserId) {
    return Promise.resolve();
  }

  checkScoreScopeIdRegisteredForLocationId(locationId);
  delete scoresForLocationId[locationId];

  const scoreForDeckForUserId = {};
  Object.keys(scoreForUserId).forEach((userId) => {
    scoreForDeckForUserId[userId] = {
      shiritori: scoreForUserId[userId],
    };
  });

  return quizScoreStorageUtils.addScores(
    scoreScopeIdForLocationId[locationId],
    scoreForDeckForUserId,
    nameForUserId,
  );
}

function getScoresForLocationId(locationId) {
  return scoresForLocationId[locationId] || {};
}

module.exports = {
  addScore,
  commitAndClearScores,
  getScoresForLocationId,
  registerUsernameForUserId,
  registerScoreScopeIdForLocationId,
};
