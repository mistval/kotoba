

const ScoreStorageUtils = require('./score_storage_utils.js');
const mapObjectValue = require('./../util/map_object_value.js');

class Scores {
  constructor() {
    this.aggregateScoreForUserId = {};
    this.nameForUserId = {};
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

    return scores;
  }

  // Do not call until all answers for current card have been given.
  createSaveData() {
    return {
      scoreLimit: this.scoreLimit,
      aggregateScoreForUserId: this.aggregateScoreForUserId,
      nameForUserId: this.nameForUserId,
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
  submitAnswer(userId, userName, answer, totalPoints, normalizedPoints, scoreDifferentAnswers, deckId) {
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

    this.currentQuestionPointsPerAnswer[answer] = totalPoints;
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

    if (!this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId) {
      this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId = {};
    }

    if (!this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId[deckId]) {
      this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId[deckId] = 0;
    }

    this.aggregateScoreForUserId[userId].normalizedScore += normalizedPoints;
    this.aggregateScoreForUserId[userId].totalScore += totalPoints;
    this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId[deckId] += normalizedPoints;

    return true;
  }

  async commitScores() {
    if (this.scoreScopeId) {
      const uncommittedScores = this.getUncommittedScoreForUserIds();
      await ScoreStorageUtils.addScores(
        this.scoreScopeId,
        uncommittedScores,
        this.nameForUserId,
      );

      const userIds = this.getParticipantUserIds();
      userIds.forEach((userId) => {
        delete this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId;
      });
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
    return mapObjectValue(
      this.aggregateScoreForUserId,
      score => score.normalizedScore,
    );
  }

  getUncommittedScoreForUserIds() {
    const uncommittedScores = {};
    const userIds = this.getParticipantUserIds();
    userIds.forEach((userId) => {
      uncommittedScores[userId] =
        this.aggregateScoreForUserId[userId].uncommittedScoreForDeckId;
    });

    return uncommittedScores;
  }

  getParticipantUserIds() {
    return Object.keys(this.aggregateScoreForUserId);
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
