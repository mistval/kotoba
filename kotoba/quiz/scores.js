const reload = require('require-reload')(require);
const assert = require('assert');

const Util = reload('./../utils.js');
const ScoreStorageUtils = reload('./score_storage_utils.js');
const { logger } = reload('monochrome-bot');

class Scores {
  constructor() {
    this.aggregateScoreForUserId = {};
    this.nameForUserId = {};
    this.committedScoreForUserId = {};
  }

  static createNew(scoreLimit, deckId, scoreScopeId) {
    const scores = new Scores();
    scores.scoreLimit = scoreLimit;
    scores.scoreScopeId = scoreScopeId;
    scores.deckId = deckId;
    return scores;
  }

  static createFromSaveData(scoreScopeId, saveData) {
    const scores = new Scores();
    scores.deckId = saveData.deckId;
    scores.scoreLimit = saveData.scoreLimit;
    scores.aggregateScoreForUserId = saveData.aggregateScoreForUserId;
    scores.nameForUserId = saveData.nameForUserId;
    scores.scoreScopeId = scoreScopeId;
    scores.committedScoreForUserId = saveData.committedScoreForUserId;
    return scores;
  }

  // Do not call until all answers for current card have been given.
  createSaveData() {
    this.finalizeForCurrentCard();
    return {
      scoreLimit: this.scoreLimit,
      deckId: this.deckId,
      aggregateScoreForUserId: this.aggregateScoreForUserId,
      nameForUserId: this.nameForUserId,
      committedScoreForUserId: this.committedScoreForUserId,
    };
  }

  getCurrentQuestionAnswerersInOrder() {
    return this.currentQuestionAnswerersInOrder;
  }

  getCurrentQuestionsAnswersForUser() {
    return this.currentQuestionAnswersForUserId;
  }

  getCurrentQuestionPointsForAnswer() {
    return this.currentQuestionPointsPerAnswer;
  }

  // Precondition: The user provided a correct answer.
  // Postcondition: If that answer should be awarded points,
  //   they are awarded.
  // Returns true if points are awarded, false otherwise.
  submitAnswer(userId, userName, answer, points, scoreDifferentAnswers, cardId) {
    assert(cardId !== undefined, 'No cardId');

    if (cardId === this.lastFinalizedCardId) {
      logger.logFailure('QUIZ SCORES', 'Already finalized scores for that card. Scores will probably be a little messed up.');
    }

    if (this.currentCardId !== cardId) {
      this.finalizeForCurrentCard();
      this.resetStateForNewCard();
      this.currentCardId = cardId;
    }

    // If we should score different answers, there is no score window.
    // So return false if the answer has already been given.
    if (scoreDifferentAnswers && this.currentQuestionPointsPerAnswer[answer] !== undefined) {
      return false;
    }

    // If the user has given this answer already, return false.
    if (
      this.currentQuestionAnswersForUserId[userId] &&
      this.currentQuestionAnswersForUserId[userId].indexOf(answer) !== -1
    ) {
      return false;
    }

    // If we should not score different answers, and the
    // user has already given answers, return false.
    if (!scoreDifferentAnswers && this.currentQuestionAnswersForUserId[userId]) {
      return false;
    }

    this.currentQuestionPointsPerAnswer[answer] = points;
    this.nameForUserId[userId] = userName;

    this.currentQuestionAnswersForUserId[userId] =
      this.currentQuestionAnswersForUserId[userId] || [];

    this.currentQuestionAnswersForUserId[userId].push(answer);

    if (this.currentQuestionAnswerersInOrder.indexOf(userId) === -1) {
      this.currentQuestionAnswerersInOrder.push(userId);
    }
    return true;
  }

  // Do not call until all answers for current card have been given.
  async commitScores() {
    if (this.scoreScopeId) {
      this.finalizeForCurrentCard();
      const uncommitedScores = this.getUncommittedScoreForUserIds();
      await ScoreStorageUtils.addScores(
        this.scoreScopeId,
        this.deckId,
        uncommitedScores,
        this.nameForUserId,
      );

      this.updateCommitedScores(uncommitedScores);
    }
  }

  // Do not call until all answers for current card have been given.
  checkForWin() {
    this.finalizeForCurrentCard();
    return Object.keys(this.aggregateScoreForUserId)
      .some(userId => this.aggregateScoreForUserId[userId].normalizedScore >= this.scoreLimit);
  }

  // Do not call until all answers for current card have been given.
  getAggregateScoreForUser() {
    this.finalizeForCurrentCard();
    return this.aggregateScoreForUserId;
  }

  // Do not call until all answers for current card have been given.
  getScoresForUserId() {
    this.finalizeForCurrentCard();
    return this.aggregateScoreForUserId;
  }

  getScoreLimit() {
    return this.scoreLimit;
  }

  getRoundedScoresForLb() {
    return Util.mapObjectValue(
      this.aggregateScoreForUserId,
      score => Math.floor(score.normalizedScore),
    );
  }

  updateCommitedScores(newlyCommitedPointsForUserId) {
    Object.keys(newlyCommitedPointsForUserId).forEach((userId) => {
      if (!this.committedScoreForUserId[userId]) {
        this.committedScoreForUserId[userId] = 0;
      }
      this.committedScoreForUserId[userId] += newlyCommitedPointsForUserId[userId];
    });
  }

  getUncommittedScoreForUserIds() {
    const totalLbScores = this.getRoundedScoresForLb();
    const uncommitedScores = {};
    Object.keys(totalLbScores).forEach((userId) => {
      if (!this.committedScoreForUserId[userId]) {
        this.committedScoreForUserId[userId] = 0;
      }
      uncommitedScores[userId] = totalLbScores[userId] - this.committedScoreForUserId[userId];
    });

    return uncommitedScores;
  }

  getScoresForUserPairs() {
    return Object.keys(this.aggregateScoreForUserId).map((userId) => {
      const { normalizedScore, totalScore } = this.aggregateScoreForUserId[userId];
      return { userId, totalScore, normalizedScore };
    }).sort((a, b) => {
      if (a.totalScore === b.totalScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      return b.totalScore - a.totalScore;
    });
  }

  finalizeForCurrentCard() {
    if (this.currentCardId === undefined) {
      return;
    }
    this.lastFinalizedCardId = this.currentCardId;
    this.currentCardId = undefined;
    this.calculateQuestionScoresAndAddToTotal();
  }

  getTotalPointsForUserId(userId) {
    if (!this.currentQuestionAnswersForUserId || !this.currentQuestionAnswersForUserId[userId]) {
      return 0;
    }
    return this.currentQuestionAnswersForUserId[userId]
      .reduce((total, answer) => total + this.currentQuestionPointsPerAnswer[answer], 0);
  }

  getMaximumPointsScored() {
    if (!this.currentQuestionPointsPerAnswer) {
      return 0;
    }

    let max = 0;
    Object.keys(this.currentQuestionAnswersForUserId).forEach((userId) => {
      max = Math.max(max, this.getTotalPointsForUserId(userId));
    });

    return max;
  }

  calculateQuestionScoresAndAddToTotal() {
    const maxPointsScored = this.getMaximumPointsScored();

    this.currentQuestionAnswerersInOrder.forEach((userId) => {
      if (!this.aggregateScoreForUserId[userId]) {
        this.aggregateScoreForUserId[userId] = {
          totalScore: 0,
          normalizedScore: 0,
        };
      }

      const totalScore = this.getTotalPointsForUserId(userId);
      const normalizedScore = totalScore / maxPointsScored;
      this.aggregateScoreForUserId[userId].totalScore += totalScore;
      this.aggregateScoreForUserId[userId].normalizedScore += normalizedScore;
    });
  }

  resetStateForNewCard() {
    this.currentQuestionAnswersForUserId = {};
    this.currentQuestionPointsPerAnswer = {};
    this.currentQuestionAnswerersInOrder = [];
  }
}

module.exports = Scores;
