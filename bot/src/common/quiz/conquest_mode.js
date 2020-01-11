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

function updateAnswerTimeLimitForUnansweredQuestion(currentTime) {
  return Math.max(currentTime - 1750, 2000);
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
  isConquestMode: true,
  updateAnswerTimeLimitForUnansweredQuestion: updateAnswerTimeLimitForUnansweredQuestion,
};
