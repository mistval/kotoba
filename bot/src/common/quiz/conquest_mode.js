'use strict'

const globals = require('./../globals.js');
const SettingsOverride = require('./settings_override.js');

const TIMES_CORRECT_BASE_REINSERTION_INDEX_MODIFIER = 12;

function overrideDeckTitle(originalTitle) {
  return originalTitle + ' (Inferno Mode)';
}

function recycleCard(card, upcomingCardsIndexArray, numDecks) {
  if (!card.answerHistory[card.answerHistory.length - 1] && Math.random() < .25) {
    let reinsertionIndex = Math.floor(Math.random() * upcomingCardsIndexArray.length);
    upcomingCardsIndexArray.splice(reinsertionIndex, 0, card.cardIndex);
    return true;
  }
  return false;
}

function updateConquestModeLeaderboard(deckId, finalScoreForUser, sessionStartTime, questionsAnswered, deckDepleted, gameModeSettings) {
  if (deckId === -1 || !gameModeSettings.eligibleForLeaderboard) {
    return Promise.resolve();
  }

  let scorersInOrder = Object.keys(finalScoreForUser).map(key => {
    return {
      userId: key,
      score: finalScoreForUser[key],
    };
  }).sort((a, b) => {
    return b.score - a.score;
  }).map(pair => {
    return pair.userId;
  });

  let completionTimeInMs = Date.now() - sessionStartTime;
  return globals.persistence.editGlobalData(data => {
    data.conquestModeQuizScores = data.conquestModeQuizScores || {};
    data.conquestModeQuizScores[deckId] = data.conquestModeQuizScores[deckId] || [];
    data.conquestModeQuizScores[deckId].push({questionsAnswered: questionsAnswered, deckDepleted: deckDepleted, userIds: scorersInOrder, completionTimeInMs: completionTimeInMs});
    return data;
  });
}

function updateAnswerTimeLimitForUnansweredQuestion(currentTime, gameModeSettings) {
  return Math.max(currentTime - gameModeSettings.timeoutReductionPerWrongAnswer, 2000);
}

function parseUserOverrides(settingsOverrides) {
  let userTimeoutReductionPerWrongAnswerOverride = settingsOverrides[0] * 1000;
  let userTimeoutOverrideInMs = settingsOverrides[1] * 1000;
  let userTimeBetweenQuestionsOverrideInMs = settingsOverrides[2] * 1000;

  userTimeoutReductionPerWrongAnswerOverride = Math.max(userTimeoutReductionPerWrongAnswerOverride, 0);
  let timeoutReductionOverridden = !Number.isNaN(userTimeoutReductionPerWrongAnswerOverride);
  let eligibleForLeaderboard = !timeoutReductionOverridden && Number.isNaN(userTimeoutOverrideInMs);

  let gameModeSettings = {
    timeoutReductionPerWrongAnswer: timeoutReductionOverridden ? userTimeoutReductionPerWrongAnswerOverride : 1750,
    eligibleForLeaderboard: eligibleForLeaderboard,
  };

  return {
    userTimeBetweenQuestionsOverrideInMs,
    userTimeoutOverrideInMs,
    gameModeSettings,
  };
}

module.exports = {
  serializationIdentifier: 'CONQUEST',
  questionLimitOverride: new SettingsOverride(Number.MAX_SAFE_INTEGER, true, true),
  unansweredQuestionLimitOverride: new SettingsOverride(5, true, true),
  answerTimeLimitOverride: new SettingsOverride(16000, true, false, 4000, 120000),
  newQuestionDelayAfterUnansweredOverride: new SettingsOverride(5000, false, false, 0, 120000),
  newQuestionDelayAfterAnsweredOverride: new SettingsOverride(2500, false, false, 0, 120000),
  additionalAnswerWaitTimeOverride: new SettingsOverride(2150, false, false, 0, 120000),
  onlyOwnerOrAdminCanStop: true,
  recycleCard: recycleCard,
  overrideDeckTitle: overrideDeckTitle,
  updateGameModeLeaderboardForSessionEnded: updateConquestModeLeaderboard,
  isConquestMode: true,
  updateAnswerTimeLimitForUnansweredQuestion: updateAnswerTimeLimitForUnansweredQuestion,
  parseUserOverrides: parseUserOverrides,
};
