module.exports = {
  serializationIdentifier: 'NORMAL',
  onlyOwnerOrAdminCanStop: false,
  recycleCard: () => false,
  overrideDeckTitle: title => title,
  updateAnswerTimeLimitForUnansweredQuestion: timeLimit => timeLimit,
};
