function overrideDeckTitle(originalTitle) {
  return originalTitle + ' (Inferno Mode)';
}

function recycleCard(card, upcomingCardsIndexArray) {
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
  questionLimitOverride: Number.MAX_SAFE_INTEGER,
  onlyOwnerOrAdminCanStop: true,
  recycleCard: recycleCard,
  overrideDeckTitle: overrideDeckTitle,
  isConquestMode: true,
  updateAnswerTimeLimitForUnansweredQuestion: updateAnswerTimeLimitForUnansweredQuestion,
};
