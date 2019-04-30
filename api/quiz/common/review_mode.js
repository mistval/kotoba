'use strict'

const SettingsOverride = require('./settings_override.js');

module.exports = {
  serializationIdentifier: 'REVIEW',
  questionLimitOverride: new SettingsOverride(10000, true, true, 1, 10000),
  unansweredQuestionLimitOverride: new SettingsOverride(0, false, false, 1, 20),
  answerTimeLimitOverride: new SettingsOverride(0, false, false, 4000, 120000),
  newQuestionDelayAfterUnansweredOverride: new SettingsOverride(0, false, false, 0, 30000),
  newQuestionDelayAfterAnsweredOverride: new SettingsOverride(0, false, false, 0, 30000),
  additionalAnswerWaitTimeOverride: new SettingsOverride(0, false, false, 0, 30000),
  onlyOwnerOrAdminCanStop: false,
  isReviewMode: true,
  recycleCard: () => false,
  overrideDeckTitle: title => 'Review Quiz',
  updateGameModeLeaderboardForSessionEnded: () => {return Promise.resolve()},
  updateAnswerTimeLimitForUnansweredQuestion: timeLimit => timeLimit,
  parseUserOverrides: () => { return {}; },
};
