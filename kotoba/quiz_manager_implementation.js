'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const ScoreStorageUtils = reload('./quiz_score_storage_utils.js');
const assert = require('assert');
const logger = require('./../core/logger.js');
const constants = reload('./constants.js');

const LOGGER_TITLE = 'QUIZ';
const INITIAL_DELAY_IN_MS = 5000;

const State = {
  INITIALIZATION: 0,
  WAITING_FOR_FIRST_ANSWER: 1,
  WAITING_FOR_ADDITIONAL_ANSWERS: 2,
  WAITING_FOR_NEXT_QUESTION: 3,
};

const AdvanceStateReason = {
  INITIALIZATION: 0,
  TIMEOUT: 1,
  USER_INPUT: 2,
  STOP_COMMAND: 3,
};

class Scores {
  constructor(pointsToWin) {
    this.scoreForUserId = {};
    this.nameForUserId = {};
    this.maxScore = 0;
    this.pointsToWin = pointsToWin;
  }

  commitScores(discordServerId, deckId) {
    ScoreStorageUtils.addScores(discordServerId, deckId, this.scoreForUserId, this.nameForUserId);
  }

  incrementScoreForUser(msg) {
    let userId = msg.author.id;
    let name = msg.author.username + '#' + msg.author.discriminator;
    this.nameForUserId[userId] = name;
    if (this.scoreForUserId[userId]) {
      ++this.scoreForUserId[userId];
    } else {
      this.scoreForUserId[userId] = 1;
    }

    this.maxScore = Math.max(this.maxScore, this.scoreForUserId[userId]);
  }

  getScoreForUser(userId) {
    return this.scoreForUserId[userId];
  }

  getSortedScorePairs_() {
    return Object.keys(this.scoreForUserId).map(key => {
      let score = this.scoreForUserId[key];
      return {player: key, score: score};
    }).sort((a, b) => {
      return b.score - a.score;
    });
  }

  getTopScorerId() {
    return this.getSortedScorePairs_()[0].player;
  }

  getScoreList() {
    let scoreList = '';

    let scorePairs = this.getSortedScorePairs_();
    for (let scorePair of scorePairs) {
      scoreList += '<@' + scorePair.player + '> has ' + scorePair.score + ' point';
      if (scorePair.score > 1) {
        scoreList += 's';
      }

      scoreList += '\n';
    }

    return scoreList;
  }

  checkForWin() {
    return this.maxScore >= this.pointsToWin;
  }
}

class QuizState {
  constructor(correctAnswerLimit) {
    this.scores = new Scores(correctAnswerLimit);
    this.questionsUnansweredCount = 0;
    this.unansweredQuestionMementos = [];
    this.allQuestionMementos = [];
    this.state = State.INITIALIZATION;
    this.correctAnswerers = [];
  }
}

class QuizManagerImplementation {
  static createQuizSession(quizManager, bot, msg, quiz) {
    if (quizManager.quizForChannelId[msg.channel.id]) {
      msg.channel.createMessage('There is already a quiz running in this channel. I can\'t do two at once, that would be confusing!');
      return 'Quiz already running';
    }

    if (!quiz.loaded) {
      msg.channel.createMessage('Couldn\'t load deck: ' + quiz.unloadedDeckName + '. Try k!quizdecks to see available decks.');
      return 'Could not load deck';
    }

    quizManager.quizForChannelId[msg.channel.id] = quiz;
    quizManager.quizStateForChannelId[msg.channel.id] = new QuizState(quiz.correctAnswerLimit);
    QuizManagerImplementation.advanceState_(quizManager, bot, msg, AdvanceStateReason.INITIALIZATION, false);
  }

  static processUserInput(quizManager, bot, msg) {
    let channelId = msg.channel.id;
    let quizState = quizManager.quizStateForChannelId[channelId];
    let isDm = !msg.channel.guild;
    let isInQuiz = !!quizState;
    if (!isInQuiz) {
      return false;
    }
    let currentState = quizState.state;
    if (currentState !== State.WAITING_FOR_FIRST_ANSWER) {
      if (isDm) {
        return 'In quiz, but not in accepting answer state';
      } else if (currentState !== State.WAITING_FOR_ADDITIONAL_ANSWERS) {
        return false;
      }
    }

    let answer = msg.content.toLowerCase();
    let correct = quizState.pendingAnswers.indexOf(answer) !== -1;
    QuizManagerImplementation.advanceState_(quizManager, bot, msg, AdvanceStateReason.USER_INPUT, correct);
    if (correct) {
      return true;
    }
    if (isDm) {
      return 'Wrong answer';
    }
    return false;
  }

  static stopQuiz(quizManager, bot, msg) {
    QuizManagerImplementation.advanceState_(quizManager, bot, msg, AdvanceStateReason.STOP_COMMAND, false);
  }

  static advanceState_(quizManager, bot, msg, reason, correctAnswer) {
    try {
      let channelId = msg.channel.id;
      let quizState = quizManager.quizStateForChannelId[channelId];

      if (!quizState) {
        return;
      }

      let currentState = quizState.state;

      if (reason === AdvanceStateReason.STOP_COMMAND) {
        QuizManagerImplementation.tryAdvanceStateForStopCommand_(quizManager, bot, msg);
      } else if (currentState === State.INITIALIZATION) {
        QuizManagerImplementation.tryAdvanceStateFromInitialization_(quizManager, bot, msg, reason);
      } else if (currentState === State.WAITING_FOR_NEXT_QUESTION) {
        QuizManagerImplementation.tryAdvanceStateFromWaitingForNextQuestion_(quizManager, bot, msg, reason);
      } else if (currentState === State.WAITING_FOR_FIRST_ANSWER) {
        QuizManagerImplementation.tryAdvanceStateFromWaitingForFirstAnswer_(quizManager, bot, msg, reason, correctAnswer);
      } else if (currentState === State.WAITING_FOR_ADDITIONAL_ANSWERS) {
        QuizManagerImplementation.tryAdvanceStateFromWaitingForAdditionalAnswers_(quizManager, bot, msg, reason, correctAnswer);
      }
    } catch (e) {
      logger.logFailure(LOGGER_TITLE, 'Error advancing state', e);
      QuizManagerImplementation.endQuizForChannel_(quizManager, bot, msg, 'There was an error :( So I stopped.');
    }
  }

  static tryAdvanceStateForStopCommand_(quizManager, bot, msg) {
    let channelId = msg.channel.id;
    let quiz = quizManager.quizForChannelId[channelId];
    if (!quiz) {
      return;
    }

    QuizManagerImplementation.stopTimersForChannel_(quizManager, channelId);
    QuizManagerImplementation.endQuizForChannel_(quizManager, bot, msg, '<@' + msg.author.id + '> asked me to stop the quiz.');
  }

  static tryAdvanceStateFromInitialization_(quizManager, bot, msg, reason) {
    QuizManagerImplementation.stopTimersForChannel_(quizManager, msg.channel.id);
    let channelId = msg.channel.id;
    let quizState = quizManager.quizStateForChannelId[channelId];
    assert(quizState.state === State.INITIALIZATION && reason === AdvanceStateReason.INITIALIZATION);
    let quiz = quizManager.quizForChannelId[channelId];
    msg.channel.createMessage('Starting ' + quiz.article + ' **' + quiz.name + '** in ' + (INITIAL_DELAY_IN_MS / 1000).toString() + ' seconds!');
    quizState.quizTimer = setTimeout(QuizManagerImplementation.advanceState_, INITIAL_DELAY_IN_MS, quizManager, bot, msg, AdvanceStateReason.TIMEOUT);
    quizState.state = State.WAITING_FOR_NEXT_QUESTION;
  }

  static tryAdvanceStateFromWaitingForNextQuestion_(quizManager, bot, msg, reason) {
    if (reason !== AdvanceStateReason.TIMEOUT) {
      return;
    }
    QuizManagerImplementation.stopTimersForChannel_(quizManager, msg.channel.id);
    let channelId = msg.channel.id;
    let quizState = quizManager.quizStateForChannelId[channelId];
    quizState.correctAnswerMessageId = undefined;
    QuizManagerImplementation.askNextQuestion_(quizManager, bot, msg, false);
  }

  static tryAdvanceStateFromWaitingForFirstAnswer_(quizManager, bot, msg, reason, correctAnswer) {
    if (reason === AdvanceStateReason.USER_INPUT && !correctAnswer) {
      return;
    }
    QuizManagerImplementation.stopTimersForChannel_(quizManager, msg.channel.id);
    let channelId = msg.channel.id;
    let quizState = quizManager.quizStateForChannelId[channelId];
    let memento = quizState.unansweredQuestionMementos.pop();
    let quiz = quizManager.quizForChannelId[channelId];
    if (reason === AdvanceStateReason.TIMEOUT) {
      quizState.unansweredQuestionMementos.push(memento);
      ++quizState.questionsUnansweredCount;
      let limitReached = quizState.questionsUnansweredCount >= quiz.incorrectAnswerLimit;
      QuizManagerImplementation.showTimeExpiredMessage_(quizManager, bot, msg, limitReached, memento);

      if (limitReached) {
        QuizManagerImplementation.endQuizForChannel_(quizManager, bot, msg, quizState.questionsUnansweredCount.toString() + ' questions in a row went unanswered. So I stopped!');
      } else {
        quizState.quizTimer = setTimeout(QuizManagerImplementation.advanceState_, quiz.timeoutNextWordDelay * 1000, quizManager, bot, msg, AdvanceStateReason.TIMEOUT);
        quizState.state = State.WAITING_FOR_NEXT_QUESTION;
      }
    } else if (correctAnswer) {
      quizState.questionsUnansweredCount = 0;
      quizState.scores.incrementScoreForUser(msg);
      quizState.correctAnswerers = [msg.author.id];
      QuizManagerImplementation.showCorrectAnswerMessage_(quizManager, bot, msg, memento, true).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error showing correct answer message', err);
      }).then(() => {
        let additionalAnswerWait = quiz.additionalAnswerWaitTimeInSeconds * 1000;
        quizState.quizTimer = setTimeout(QuizManagerImplementation.advanceState_, additionalAnswerWait, quizManager, bot, msg, AdvanceStateReason.TIMEOUT);
      });
      quizState.state = State.WAITING_FOR_ADDITIONAL_ANSWERS;
    }
  }

  static tryAdvanceStateFromWaitingForAdditionalAnswers_(quizManager, bot, msg, reason, correctAnswer) {
    let channelId = msg.channel.id;
    let quizState = quizManager.quizStateForChannelId[channelId];
    if (reason === AdvanceStateReason.TIMEOUT) {
      if (quizState.scores.checkForWin()) {
        QuizManagerImplementation.endQuizForChannel_(quizManager, bot, msg, 'The score limit of ' + quizState.scores.pointsToWin.toString() + ' was reached by <@' + quizState.scores.getTopScorerId() + '>. Congratulations!');
      } else {
        let quiz = quizManager.quizForChannelId[channelId];
        let delay = quiz.correctAnswerNextWordDelay * 1000;
        quizState.quizTimer = setTimeout(QuizManagerImplementation.advanceState_, delay, quizManager, bot, msg, AdvanceStateReason.TIMEOUT);
        quizState.state = State.WAITING_FOR_NEXT_QUESTION;
      }
    } else if (correctAnswer && quizState.correctAnswerers.indexOf(msg.author.id) === -1) {
      quizState.correctAnswerers.push(msg.author.id);
      quizState.scores.incrementScoreForUser(msg);
      let memento = quizState.allQuestionMementos[quizState.allQuestionMementos.length - 1];
      QuizManagerImplementation.showCorrectAnswerMessage_(quizManager, bot, msg, memento, false);
    }
  }

  static showCorrectAnswerMessage_(quizManager, bot, msg, memento, firstAnswer) {
    let channelId = msg.channel.id;
    let quizState = quizManager.quizStateForChannelId[channelId];
    let state = quizState.state;
    let message = QuizManagerImplementation.createCorrectAnswerMessage_(quizManager, bot, msg, memento);
    if (firstAnswer) {
      return KotobaUtils.retryPromise(() => msg.channel.createMessage(message), 3).then(messageData => {
        if (quizManager.quizForChannelId[channelId]) {
          quizState.correctAnswerMessageId = messageData.id;

          // In case more correct answers came in before the promise was fulfilled.
          if (quizState.correctAnswerers.length > 1) {
            bot.editMessage(channelId, messageData.id, QuizManagerImplementation.createCorrectAnswerMessage_(quizManager, bot, msg, memento));
          }
        }
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error creating message', err);
      });
    } else if (quizState.correctAnswerMessageId) {
      return bot.editMessage(channelId, quizState.correctAnswerMessageId, message);
    }
  }

  static createScorerString_(quizManager, channelId) {
    let quizState = quizManager.quizStateForChannelId[channelId];
    let result = '';
    for (let scorer of quizState.correctAnswerers) {
      result += '<@' + scorer + '> (' + quizState.scores.getScoreForUser(scorer) + ' points)\n';
    }
    return result;
  }

  static createCorrectAnswerMessage_(quizManager, bot, msg, memento) {
    let channelId = msg.channel.id;
    let quiz = quizManager.quizForChannelId[channelId];
    let quizState = quizManager.quizStateForChannelId[channelId];
    let content = {};
    content.embed = {
      title: quiz.name,
      description: '<@' + quizState.correctAnswerers[0] + '> guessed it first!',
      color: constants.EMBED_CORRECT_COLOR,
      fields: [
        {name: 'Correct answers', value: quizState.pendingAnswers.join('\n'), inline: true},
        {name: 'Scorers', value: QuizManagerImplementation.createScorerString_(quizManager, channelId), inline: true}],
    };

    return QuizManagerImplementation.addQuizSpecificAnswerInformation_(quiz, memento, content);
  }

  static addQuizSpecificAnswerInformation_(quiz, memento, answerContent) {
    let additionalFields = quiz.createAdditionalFieldsForAnswer(memento);
    if (additionalFields) {
      answerContent.embed.fields = answerContent.embed.fields.concat(additionalFields);
    }

    let uri = quiz.createUriForAnswer(memento);
    if (uri) {
      answerContent.embed.url = uri;
    }

    let footer = quiz.createFooterForAnswer(memento);
    if (footer) {
      answerContent.embed.footer = footer;
    }

    return answerContent;
  }

  static showTimeExpiredMessage_(quizManager, bot, msg, limitReached, memento) {
    let channelId = msg.channel.id;
    let quiz = quizManager.quizForChannelId[channelId];
    let quizState = quizManager.quizStateForChannelId[channelId];

    let content = {};
    content.embed = {
      title: quiz.name,
      description: 'Time\'s up!',
      color: constants.EMBED_WRONG_COLOR,
      fields: [{name: 'Correct answers', value: quizState.pendingAnswers.join('\n')}]
    };

    content = QuizManagerImplementation.addQuizSpecificAnswerInformation_(quiz, memento, content);
    msg.channel.createMessage(content);
  }

  static askNextQuestion_(quizManager, bot, msg) {
    let channelId = msg.channel.id;
    let quiz = quizManager.quizForChannelId[channelId];
    KotobaUtils.retryPromise(() => quiz.getNewQuestionInfo(), 3).then(nextQuestionInfo => {
      if (!quizManager.quizForChannelId[channelId]) {
        return;
      }
      if (!nextQuestionInfo) {
        return QuizManagerImplementation.endQuizForChannel_(quizManager, bot, msg, 'No more questions in that deck. Impressive!');
      }
      KotobaUtils.retryPromise(() => msg.channel.createMessage(nextQuestionInfo.content, nextQuestionInfo.attachment), 3).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error creating message', err);
        return;
      }).then(sentMessage => {
        if (!quizManager.quizForChannelId[channelId]) {
          return;
        }
        let quizState = quizManager.quizStateForChannelId[channelId];
        quizState.pendingAnswers = nextQuestionInfo.correctAnswers;
        quizState.unansweredQuestionMementos.push(nextQuestionInfo.memento);
        quizState.allQuestionMementos.push(nextQuestionInfo.memento);
        quizState.quizTimer = setTimeout(QuizManagerImplementation.advanceState_, quiz.timeLimitInSeconds * 1000, quizManager, bot, msg, AdvanceStateReason.TIMEOUT);
        quizState.state = State.WAITING_FOR_FIRST_ANSWER;
        if (sentMessage && nextQuestionInfo.updateQuestionIntervalInMs > 0) {
          quizState.updateQuestionTimer = setInterval(() => {
            try {
              let updatedQuestionInfo = quiz.getUpdatedQuestionInfo(nextQuestionInfo);
              if (updatedQuestionInfo) {
                sentMessage.edit(updatedQuestionInfo.content);
              }
            } catch (err) {
              logger.logFailure(LOGGER_TITLE, 'Error while trying to update quiz question', err);
            }
          },
          nextQuestionInfo.updateQuestionIntervalInMs);
        }
      });
    }).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to get next question', err);
      QuizManagerImplementation.endQuizForChannel_(quizManager, bot, msg, 'There was an error :( So I stopped.');
    });
  }

  static endQuizForChannel_(quizManager, bot, msg, endReasonDescription) {
    let channelId = msg.channel.id;
    QuizManagerImplementation.stopTimersForChannel_(quizManager, channelId);
    QuizManagerImplementation.outputResults_(quizManager, bot, msg, endReasonDescription);
    quizManager.quizForChannelId[channelId] = undefined;
    quizManager.quizStateForChannelId[channelId] = undefined;
  }

  static stopTimersForChannel_(quizManager, channelId) {
    let quizState = quizManager.quizStateForChannelId[channelId];
    if (quizState.quizTimer) {
      clearTimeout(quizState.quizTimer);
      quizState.quizTimer = undefined;
    }
    if (quizState.updateQuestionTimer) {
      clearTimeout(quizState.updateQuestionTimer);
      quizState.updateQuestionTimer = undefined;
    }
  }

  static outputResults_(quizManager, bot, msg, endReasonDescription) {
    let channelId = msg.channel.id;
    let content = {};
    let quizState = quizManager.quizStateForChannelId[channelId];
    let scores = quizState.scores.getScoreList();
    let quiz = quizManager.quizForChannelId[channelId];
    let guildId = msg.channel.guild ? msg.channel.guild.id : channelId;

    quizState.scores.commitScores(guildId, quiz.deckid);
    content.embed = {
      title: quiz.name + ' Ended',
      description: endReasonDescription,
      color: constants.EMBED_NEUTRAL_COLOR,
    };

    let fields = [];
    if (scores) {
      fields.push({name: 'Final Scores', value: scores});
    }

    let unansweredQuestions = quiz.createUnansweredQuestionsField(quizState.unansweredQuestionMementos);
    if (unansweredQuestions) {
      fields.push({name: 'Unanswered Questions', value: unansweredQuestions, inline: true});
    }

    let uri = quiz.createUriForQuizEnd(quizState.unansweredQuestionMementos);
    if (uri) {
      content.embed.url = uri;
    }

    content.embed.footer = {
      'text': 'Say k!lb to see the server leaderboard.',
      'icon_url': constants.FOOTER_ICON_URI,
    };

    if (fields.length > 0) {
      content.embed.fields = fields;
    }

    msg.channel.createMessage(content);
  }
}

module.exports = QuizManagerImplementation;
