module.exports = {
  serializationIdentifier: 'REVIEW',
  questionLimitOverride: Number.MAX_SAFE_INTEGER,
  onlyOwnerOrAdminCanStop: false,
  isReviewMode: true,
  recycleCard: () => false,
  overrideDeckTitle: title => 'Review Quiz',
  updateAnswerTimeLimitForUnansweredQuestion: timeLimit => timeLimit,
};
