
const globals = require('./../globals.js');
const SettingsOverride = require('./settings_override.js');

const PERCENT_CORRECT_FOR_MASTERY = .76;

const indexTopForStreakLength = {
  0: 16,
  1: 35,
  2: 80,
  3: 140,
  4: 200,
  5: 300,
  6: 400,
  length: 7,
};

function overrideDeckTitle(originalTitle) {
  return originalTitle + ' (Conquest Mode)';
}

function calculatePercentCorrect(card) {
  let numberCorrect = card.answerHistory.reduce((a, b) => b ? a + 1 : a , 0);
  let percentCorrect = numberCorrect / card.answerHistory.length;
  return percentCorrect;
}

function calculateStreakLength(card) {
  let streakLength = 0;
  for (let i = card.answerHistory.length - 1; i >= 0; i -= 1) {
    if (card.answerHistory[i]) {
      ++streakLength;
    } else {
      break;
    }
  }

  return streakLength;
}

function calculateIndexTop(streakLength) {
  return indexTopForStreakLength[streakLength]
    || indexTopForStreakLength[indexTopForStreakLength.length - 1] * (streakLength - indexTopForStreakLength.length + 2);
}

function recycleCard(card, upcomingCardsIndexArray, numDecks) {
  if (calculatePercentCorrect(card) >= PERCENT_CORRECT_FOR_MASTERY) {
    return false;
  }

  const streakLength = calculateStreakLength(card);
  const indexTop = calculateIndexTop(streakLength);

  const arraySize = upcomingCardsIndexArray.length;
  const randomFactor = Math.random() * .40 + .60;
  const newDistanceFromFront = Math.floor(indexTop * randomFactor / numDecks);
  let index = arraySize - 1 - newDistanceFromFront;

  if (index < 0) {
    index = arraySize - 1 - Math.floor(newDistanceFromFront / 2);
    if (index < 0) {
      if (card.answerHistory[card.answerHistory.length - 1]) {
        return false;
      } else {
        index = 0;
      }
    }
  }

  upcomingCardsIndexArray.splice(index, 0, card.cardIndex);
  return true;
}

module.exports = {
  serializationIdentifier: 'MASTERY',
  questionLimitOverride: new SettingsOverride(Number.MAX_SAFE_INTEGER, true, true),
  unansweredQuestionLimitOverride: new SettingsOverride(10, true, true),
  answerTimeLimitOverride: new SettingsOverride(16000, false, false, 4000, 120000),
  newQuestionDelayAfterUnansweredOverride: new SettingsOverride(4000, false, false, 0, 120000),
  newQuestionDelayAfterAnsweredOverride: new SettingsOverride(2500, false, false, 0, 120000),
  additionalAnswerWaitTimeOverride: new SettingsOverride(2150, false, false, 0, 120000),
  onlyOwnerOrAdminCanStop: true,
  recycleCard: recycleCard,
  overrideDeckTitle: overrideDeckTitle,
  isMasteryMode: true,
  updateAnswerTimeLimitForUnansweredQuestion: timeLimit => timeLimit,
};
