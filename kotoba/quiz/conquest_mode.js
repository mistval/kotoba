'use strict'
const reload = require('require-reload')(require);
const SettingsOverride = reload('./settings_override.js');
const persistence = reload('monochrome-bot').persistence;

const TIMES_CORRECT_BASE_REINSERTION_INDEX_MODIFIER = 12;
const PERCENT_CORRECT_FOR_MASTERY = .70;
const CARD_CORRECT = 1;
const CARD_INCORRECT = 0;

function overrideDeckTitle(originalTitle) {
  return originalTitle + ' (Inferno Mode)';
}

function calculatePercentCorrect(card) {
  let numberCorrect = card.answerHistory.reduce((a, b) => b ? a + 1 : a , 0);
  let percentCorrect = numberCorrect / card.answerHistory.length;
  return percentCorrect;
}

function calculateReinsertionIndex(card, arraySize, numDecks) {
  let numberOfLastXCorrect = 0;
  let foundIncorrect = false;
  for (let i = card.answerHistory.length - 1; i > card.answerHistory.length - 6; --i) {
    if (card.answerHistory[i]) {
      ++numberOfLastXCorrect;
    } else {
      break;
    }
  }

  let percentCorrect = calculatePercentCorrect(card);
  let randomFactor = Math.random() * .70 + .30;
  let newDistanceFromFront = Math.floor(TIMES_CORRECT_BASE_REINSERTION_INDEX_MODIFIER * (numberOfLastXCorrect + 1) * randomFactor * 1 / numDecks);
  newDistanceFromFront = Math.min(newDistanceFromFront, arraySize - 1);
  let index = arraySize - 1 - newDistanceFromFront;

  if (index === 0) {
    index = Math.floor(arraySize * Math.random());
  }

  return index;
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
  return persistence.editGlobalData(data => {
    data.conquestModeQuizScores = data.conquestModeQuizScores || {};
    data.conquestModeQuizScores[deckId] = data.conquestModeQuizScores[deckId] || [];
    data.conquestModeQuizScores[deckId].push({questionsAnswered: questionsAnswered, deckDepleted: deckDepleted, userIds: scorersInOrder, completionTimeInMs: completionTimeInMs});
    return data;
  });
}

function updateAnswerTimeLimitForUnansweredQuestion(currentTime, gameModeSettings) {
  return Math.max(currentTime - gameModeSettings.timeoutReductionPerWrongAnswer, 2500);
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
  newQuestionDelayAfterUnansweredOverride: new SettingsOverride(5000, true, false, 0, 120000),
  newQuestionDelayAfterAnsweredOverride: new SettingsOverride(2500, true, false, 0, 120000),
  additionalAnswerWaitTimeOverride: new SettingsOverride(2150, true, false, 0, 120000),
  onlyOwnerOrAdminCanStop: true,
  recycleCard: recycleCard,
  overrideDeckTitle: overrideDeckTitle,
  updateGameModeLeaderboardForSessionEnded: updateConquestModeLeaderboard,
  isConquestMode: true,
  updateAnswerTimeLimitForUnansweredQuestion: updateAnswerTimeLimitForUnansweredQuestion,
  parseUserOverrides: parseUserOverrides,
};
