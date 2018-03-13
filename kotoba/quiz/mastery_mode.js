'use strict'
const reload = require('require-reload')(require);
const SettingsOverride = reload('./settings_override.js');
const persistence = reload('monochrome-bot').persistence;

const TIMES_CORRECT_BASE_REINSERTION_INDEX_MODIFIER = 12;
const PERCENT_CORRECT_FOR_MASTERY = .75;
const CARD_CORRECT = 1;
const CARD_INCORRECT = 0;

const IndexTopForTimesCorrect = {
  0: 12,
  1: 24,
  2: 36,
  3: 48,
  4: 60,
  5: 90,
  6: 130,
};

function overrideDeckTitle(originalTitle) {
  return originalTitle + ' (Conquest Mode)';
}

function calculatePercentCorrect(card) {
  let numberCorrect = card.answerHistory.reduce((a, b) => b ? a + 1 : a , 0);
  let percentCorrect = numberCorrect / card.answerHistory.length;
  return percentCorrect;
}

function recycleCard(card, upcomingCardsIndexArray, numDecks) {
  if (calculatePercentCorrect(card) >= PERCENT_CORRECT_FOR_MASTERY) {
    return false;
  }

  let numberOfLastXCorrect = 0;
  for (let i = card.answerHistory.length - 1; i > card.answerHistory.length - 6; --i) {
    if (card.answerHistory[i]) {
      ++numberOfLastXCorrect;
    } else {
      break;
    }
  }

  let indexTop = IndexTopForTimesCorrect[numberOfLastXCorrect];
  if (!indexTop) {
    indexTop = IndexTopForTimesCorrect[6] * (numberOfLastXCorrect - 5)
  }

  let arraySize = upcomingCardsIndexArray.length;
  let randomFactor = Math.random() * .70 + .30;
  let newDistanceFromFront = Math.floor(indexTop * (numberOfLastXCorrect + 1) * randomFactor * 1 / numDecks);
  let index = arraySize - 1 - newDistanceFromFront;

  if (index < 0) {
    index = arraySize - 1 - (newDistanceFromFront / 2);
    if (index < 0) {
      return false;
    }
  }

  upcomingCardsIndexArray.splice(index, 0, card.cardIndex);
  return true;
}

function updateMasteryModeLeaderboard(deckId, finalScoreForUser, sessionStartTime, questionsAnswered, deckDepleted) {
  if (deckId === -1) {
    return Promise.resolve();
  }

  let completionTimeInMs = Date.now() - sessionStartTime;
  return persistence.editGlobalData(data => {
    data.masteryModeQuizScores = data.masteryModeQuizScores || {};
    data.masteryModeQuizScores[deckId] = data.masteryModeQuizScores[deckId] || [];
    for (let userId of Object.keys(finalScoreForUser)) {
      data.masteryModeQuizScores[deckId].push({deckDepleted: deckDepleted, score: finalScoreForUser[userId], userId: userId, completionTimeInMs: completionTimeInMs});
    }
    return data;
  });
}

function parseUserOverrides(settingsOverrides) {
  let userTimeBetweenQuestionsOverrideInMs = settingsOverrides[0] * 1000;
  let userTimeoutOverrideInMs = settingsOverrides[1] * 1000;

  return {
    userTimeBetweenQuestionsOverrideInMs,
    userTimeoutOverrideInMs,
  };
}

module.exports = {
  serializationIdentifier: 'MASTERY',
  questionLimitOverride: new SettingsOverride(Number.MAX_SAFE_INTEGER, true, true),
  unansweredQuestionLimitOverride: new SettingsOverride(10, true, true),
  answerTimeLimitOverride: new SettingsOverride(16000, true, false, 4000, 120000),
  newQuestionDelayAfterUnansweredOverride: new SettingsOverride(4000, true, false, 0, 120000),
  newQuestionDelayAfterAnsweredOverride: new SettingsOverride(2500, true, false, 0, 120000),
  additionalAnswerWaitTimeOverride: new SettingsOverride(2150, true, false, 0, 120000),
  onlyOwnerOrAdminCanStop: true,
  recycleCard: recycleCard,
  overrideDeckTitle: overrideDeckTitle,
  updateGameModeLeaderboardForSessionEnded: updateMasteryModeLeaderboard,
  isMasteryMode: true,
  parseUserOverrides: parseUserOverrides,
  updateAnswerTimeLimitForUnansweredQuestion: timeLimit => timeLimit,
};
