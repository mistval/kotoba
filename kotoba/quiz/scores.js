const reload = require('require-reload')(require);
const assert = require('assert');

const Util = reload('./../utils.js');
const ScoreStorageUtils = reload('./score_storage_utils.js');
const logger = reload('monochrome-bot').logger;

class Scores {
  constructor() {
    this.aggregateScoreForUserId_ = {};
    this.nameForUserId_ = {};
    this.committedScoreForUserId_ = {};
  }

  static createNew(scoreLimit, deckId, scoreScopeId) {
    const scores = new Scores();
    scores.scoreLimit_ = scoreLimit;
    scores.scoreScopeId_ = scoreScopeId;
    scores.deckId_ = deckId;
    return scores;
  }

  static createFromSaveData(scoreScopeId, saveData) {
    const scores = new Scores();
    scores.deckId_ = saveData.deckId;
    scores.scoreLimit_ = saveData.scoreLimit;
    scores.aggregateScoreForUserId_ = saveData.aggregateScoreForUserId;
    scores.nameForUserId_ = saveData.nameForUserId;
    scores.scoreScopeId_ = scoreScopeId;
    scores.committedScoreForUserId_ = saveData.committedScoreForUserId;
    return scores;
  }

  // Do not call until all answers for current card have been given.
  createSaveData() {
    this.finalizeForCurrentCard_();
    return {
      scoreLimit: this.scoreLimit_,
      deckId: this.deckId_,
      aggregateScoreForUserId: this.aggregateScoreForUserId_,
      nameForUserId: this.nameForUserId_,
      committedScoreForUserId: this.committedScoreForUserId_,
    };
  }

  getCurrentQuestionAnswerersInOrder() {
    return this.currentQuestionAnswerersInOrder_;
  }

  getCurrentQuestionsAnswersForUser() {
    return this.currentQuestionAnswersForUserId_;
  }

  getCurrentQuestionPointsForAnswer() {
    return this.currentQuestionPointsPerAnswer_;
  }

  // Precondition: The user provided a correct answer.
  // Postcondition: If that answer should be awarded points,
  //   they are awarded.
  // Returns true if points are awarded, false otherwise.
  submitAnswer(userId, userName, answer, points, scoreDifferentAnswers, cardId) {
    assert(cardId !== undefined, 'No cardId');

    if (cardId === this.lastFinalizedCardId_) {
      logger.logFailure('QUIZ SCORES', 'Already finalized scores for that card. Scores will probably be a little messed up.');
    }

    if (this.currentCardId_ !== cardId) {
      this.finalizeForCurrentCard_();
      this.resetStateForNewCard_();
      this.currentCardId_ = cardId;
    }

    // If we should score different answers, there is no score window.
    // So return false if the answer has already been given.
    if (scoreDifferentAnswers && this.currentQuestionPointsPerAnswer_[answer] !== undefined) {
      return false;
    }

    // If the user has given this answer already, return false.
    if (this.currentQuestionAnswersForUserId_[userId] && ~this.currentQuestionAnswersForUserId_[userId].indexOf(answer)) {
      return false;
    }

    // If we should not score different answers, and the
    // user has already given answers, return false.
    if (!scoreDifferentAnswers && this.currentQuestionAnswersForUserId_[userId]) {
      return false;
    }

    // If we're here, the answer is accepted and awared points.
    assert(
      !this.currentQuestionPointsPerAnswer_[answer] || this.currentQuestionPointsPerAnswer_[answer] === points,
      'No support for awarding different number of points for identical answers',
    );
    this.currentQuestionPointsPerAnswer_[answer] = points;
    this.nameForUserId_[userId] = userName;
    this.currentQuestionAnswersForUserId_[userId] = this.currentQuestionAnswersForUserId_[userId] || [];
    this.currentQuestionAnswersForUserId_[userId].push(answer);

    if (!~this.currentQuestionAnswerersInOrder_.indexOf(userId)) {
      this.currentQuestionAnswerersInOrder_.push(userId);
    }
    return true;
  }

  // Do not call until all answers for current card have been given.
  commitScores() {
    if (this.scoreScopeId_) {
      this.finalizeForCurrentCard_();
      const uncommitedScores = this.getUncommittedScoreForUserIds_();
      return ScoreStorageUtils.addScores(this.scoreScopeId_, this.deckId_, uncommitedScores, this.nameForUserId_).then(() => {
        this.updateCommitedScores_(uncommitedScores);
      });
    }
  }

  // Do not call until all answers for current card have been given.
  checkForWin() {
    this.finalizeForCurrentCard_();
    return Object.keys(this.aggregateScoreForUserId_).some(userId => this.aggregateScoreForUserId_[userId].normalizedScore >= this.scoreLimit_);
  }

  // Do not call until all answers for current card have been given.
  getScoresForUserPairs() {
    this.finalizeForCurrentCard_();
    return this.getScoresForUserPairs_();
  }

  // Do not call until all answers for current card have been given.
  getAggregateScoreForUser() {
    this.finalizeForCurrentCard_();
    return this.aggregateScoreForUserId_;
  }

  // Do not call until all answers for current card have been given.
  getScoresForUserId() {
    this.finalizeForCurrentCard_();
    return this.aggregateScoreForUserId_;
  }

  getScoreLimit() {
    return this.scoreLimit_;
  }

  getRoundedScoresForLb() {
    return Util.mapObjectValue(this.aggregateScoreForUserId_, score => Math.floor(score.normalizedScore));
  }

  updateCommitedScores_(newlyCommitedPointsForUserId) {
    for (const userId of Object.keys(newlyCommitedPointsForUserId)) {
      if (!this.committedScoreForUserId_[userId]) {
        this.committedScoreForUserId_[userId] = 0;
      }
      this.committedScoreForUserId_[userId] += newlyCommitedPointsForUserId[userId];
    }
  }

  getUncommittedScoreForUserIds_() {
    const totalLbScores = this.getRoundedScoresForLb();
    const uncommitedScores = {};
    for (const userId of Object.keys(totalLbScores)) {
      if (!this.committedScoreForUserId_[userId]) {
        this.committedScoreForUserId_[userId] = 0;
      }
      uncommitedScores[userId] = totalLbScores[userId] - this.committedScoreForUserId_[userId];
    }
    return uncommitedScores;
  }

  getScoresForUserPairs_() {
    return Object.keys(this.aggregateScoreForUserId_).map((userId) => {
      const normalizedScore = this.aggregateScoreForUserId_[userId].normalizedScore;
      const totalScore = this.aggregateScoreForUserId_[userId].totalScore;
      return { userId, totalScore, normalizedScore };
    }).sort((a, b) => {
      if (a.totalScore === b.totalScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      return b.totalScore - a.totalScore;
    });
  }

  finalizeForCurrentCard_() {
    if (this.currentCardId_ === undefined) {
      return;
    }
    this.lastFinalizedCardId_ = this.currentCardId_;
    this.currentCardId_ = undefined;
    this.calculateQuestionScoresAndAddToTotal_();
  }

  getTotalPointsForUserId_(userId) {
    if (!this.currentQuestionAnswersForUserId_ || !this.currentQuestionAnswersForUserId_[userId]) {
      return 0;
    }
    return this.currentQuestionAnswersForUserId_[userId]
      .reduce((total, answer) => total + this.currentQuestionPointsPerAnswer_[answer], 0);
  }

  getMaximumPointsScored_() {
    if (!this.currentQuestionPointsPerAnswer_) {
      return 0;
    }
    let max = 0;
    for (const userId of Object.keys(this.currentQuestionAnswersForUserId_)) {
      max = Math.max(max, this.getTotalPointsForUserId_(userId));
    }
    return max;
  }

  calculateQuestionScoresAndAddToTotal_() {
    const maxPointsScored = this.getMaximumPointsScored_();

    for (const userId of this.currentQuestionAnswerersInOrder_) {
      if (!this.aggregateScoreForUserId_[userId]) {
        this.aggregateScoreForUserId_[userId] = {
          totalScore: 0,
          normalizedScore: 0,
        };
      }

      const totalScore = this.getTotalPointsForUserId_(userId);
      const normalizedScore = totalScore / maxPointsScored;
      this.aggregateScoreForUserId_[userId].totalScore += totalScore;
      this.aggregateScoreForUserId_[userId].normalizedScore += normalizedScore;
    }
  }

  resetStateForNewCard_() {
    this.currentQuestionAnswersForUserId_ = {};
    this.currentQuestionPointsPerAnswer_ = {};
    this.currentQuestionAnswerersInOrder_ = [];
  }
}

module.exports = Scores;
