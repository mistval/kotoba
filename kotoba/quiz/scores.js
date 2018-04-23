const reload = require('require-reload')(require);

const Util = reload('./../utils.js');
const ScoreStorageUtils = reload('./score_storage_utils.js');

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
  submitAnswer(userId, userName, answer, points, scoreDifferentAnswers) {
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

    if (!this.aggregateScoreForUserId[userId]) {
      this.aggregateScoreForUserId[userId] = {
        normalizedScore: 0,
        totalScore: 0,
      };
    }

    this.aggregateScoreForUserId[userId].normalizedScore += 1;
    this.aggregateScoreForUserId[userId].totalScore += points;

    return true;
  }

  async commitScores() {
    if (this.scoreScopeId) {
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

  checkForWin() {
    return Object.keys(this.aggregateScoreForUserId)
      .some(userId => this.aggregateScoreForUserId[userId].normalizedScore >= this.scoreLimit);
  }

  getAggregateScoreForUser() {
    return this.aggregateScoreForUserId;
  }

  getScoresForUserId() {
    return this.aggregateScoreForUserId;
  }

  getScoreLimit() {
    return this.scoreLimit;
  }

  getScoresForLb() {
    return Util.mapObjectValue(
      this.aggregateScoreForUserId,
      score => score.normalizedScore,
    );
  }

  updateCommitedScores(newlyCommittedPointsForUserId) {
    Object.keys(newlyCommittedPointsForUserId).forEach((userId) => {
      if (!this.committedScoreForUserId[userId]) {
        this.committedScoreForUserId[userId] = 0;
      }
      this.committedScoreForUserId[userId] += newlyCommittedPointsForUserId[userId];
    });
  }

  getUncommittedScoreForUserIds() {
    const lbScores = this.getScoresForLb();
    const uncommitedScores = {};
    Object.keys(lbScores).forEach((userId) => {
      if (!this.committedScoreForUserId[userId]) {
        this.committedScoreForUserId[userId] = 0;
      }
      uncommitedScores[userId] = lbScores[userId] - this.committedScoreForUserId[userId];
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

  resetStateForNewCard() {
    this.currentQuestionAnswersForUserId = {};
    this.currentQuestionPointsPerAnswer = {};
    this.currentQuestionAnswerersInOrder = [];
  }
}

module.exports = Scores;
