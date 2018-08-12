const reload = require('require-reload')(require);
const state = require('./static_state.js');

// Piggyback on the quiz scores for now.
const quizScoreStorageUtils = reload('./quiz/score_storage_utils.js');

if (!state.scoreManager) {
  state.scoreManager = {
    scoresForLocationId: {},
    nameForUserId: {},
    scoreScopeIdForLocationId: {},
    scoreMultipliersForLocationId: {},
  };
}

const scoresForLocationId = state.scoreManager.scoresForLocationId;
const nameForUserId = state.scoreManager.nameForUserId;
const scoreScopeIdForLocationId = state.scoreManager.scoreScopeIdForLocationId;
const scoreMultipliersForLocationId = state.scoreManager.scoreMultipliersForLocationId;

function registerUsernameForUserId(userId, userName) {
  nameForUserId[userId] = userName;
}

function registerScoreScopeIdForLocationId(locationId, scoreScopeId) {
  scoreScopeIdForLocationId[locationId] = scoreScopeId;
}

function registerScoreMultiplier(locationId, userId, multiplyer) {
  scoreMultipliersForLocationId[locationId] = scoreMultipliersForLocationId[locationId] || {};
  const scoreMultiplierForUserId = scoreMultipliersForLocationId[locationId];
  scoreMultiplierForUserId[userId] = multiplyer;
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

function getScoresForLocationId(locationId) {
  const scoreMultiplierForUserId = scoreMultipliersForLocationId[locationId] || {};
  const unmultipliedScoreForUserId = scoresForLocationId[locationId] || {};
  const multipliedScoreForUserId = {};

  Object.keys(unmultipliedScoreForUserId).forEach(userId => {
    const multiplier = scoreMultiplierForUserId[userId] || 1;
    const unmultipliedScore = unmultipliedScoreForUserId[userId];
    const multipliedScore = Math.floor(unmultipliedScore * multiplier);
    multipliedScoreForUserId[userId] = multipliedScore;
  });

  return multipliedScoreForUserId;
}

function commitAndClearScores(locationId) {
  const scoreForUserId = getScoresForLocationId(locationId);

  checkScoreScopeIdRegisteredForLocationId(locationId);
  delete scoresForLocationId[locationId];
  delete scoreMultipliersForLocationId[locationId];

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

module.exports = {
  addScore,
  commitAndClearScores,
  getScoresForLocationId,
  registerUsernameForUserId,
  registerScoreScopeIdForLocationId,
  registerScoreMultiplier,
};
