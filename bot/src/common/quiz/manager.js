'use strict'

const state = require('./../static_state.js');
const assert = require('assert');
const saveManager = require('./pause_manager.js');
const cardStrategies = require('./card_strategies.js');
const retryPromise = require('./../util/retry_promise.js');
const globals = require('./../globals.js');
const sessionReportManager = require('./session_report_manager.js');
const { safeSetTimeout } = require('kotoba-common').safeTimers;

const INITIAL_DELAY_IN_MS = 5000;
const REVEAL_INTERVAL_IN_MS = 10000;
const MAX_SAVES_PER_USER = 5;
const QUIZ_END_STATUS_ERROR = 1;
const MAX_SAVE_QUESTIONS = 50000;
const HARDCORE_BLIND_EYE_INTERVAL_IN_MS = 1000;

/* LOADING AND INITIALIZATION */

if (!state.quizManager) {
  state.quizManager = {
    currentActionForLocationId: {},
    sessionForLocationId: {},
  };
}

/* STOPPING */

function closeSession(session, gameOver) {
  if (!session) {
    return Promise.resolve();
  }

  let locationId = session.getLocationId();

  delete state.quizManager.sessionForLocationId[locationId];
  delete state.quizManager.currentActionForLocationId[locationId];

  return session.finalize(gameOver);
}

async function endQuiz(gameOver, session, notifier, notifyDelegate, delegateFinalArgument) {
  if (!session) {
    return Promise.resolve();
  }

  let locationId = session.getLocationId();
  if (state.quizManager.currentActionForLocationId[locationId]) {
    if (state.quizManager.currentActionForLocationId[locationId].stop) {
      state.quizManager.currentActionForLocationId[locationId].stop();
    }
    delete state.quizManager.currentActionForLocationId[locationId];
  }

  sessionReportManager.notifyStopped(locationId, session.getScoresForUserPairs());

  try {
    await closeSession(session, true);
    await retryPromise(() => {
      return Promise.resolve(notifyDelegate.call(
        notifier,
        session.getName(),
        session.getScoresForUserPairs(),
        session.getUnansweredCards(),
        session.createAggregateUnansweredCardsLink(),
        session.getDeckInfo(),
        delegateFinalArgument));
    }, 3);
  } catch (err) {
    globals.logger.error({
      event: 'ERROR ENDING QUIZ',
      detail: 'Continuing and closing session.',
      err,
    });
  }
}

function stopAllQuizzesCommand() {
  let allLocationIds = Object.keys(state.quizManager.sessionForLocationId);
  let promise = Promise.resolve();
  for (let locationId of allLocationIds) {
    let session = state.quizManager.sessionForLocationId[locationId];
    let messageSender = session.getMessageSender();
    promise = promise.then(() => {
      return endQuiz(true, session, messageSender, messageSender.notifyStoppingAllQuizzes);
    }).catch(err => {
      globals.logger.error({
        event: 'FAILED TO SEND QUIZ STOP MESSAGE',
        err,
        detail: locationId,
      });
    });
  }

  return promise;
}

function stopQuizCommand(locationId, cancelingUserId, cancelingUserIsAdmin) {
  let session = state.quizManager.sessionForLocationId[locationId];

  if (session) {
    let messageSender = session.getMessageSender();
    let gameMode = session.getGameMode();
    if (gameMode.onlyOwnerOrAdminCanStop && !cancelingUserIsAdmin && session.getOwnerId() !== cancelingUserId) {
      return Promise.resolve(messageSender.notifyStopFailedUserNotAuthorized());
    }
    return Promise.resolve(endQuiz(true, session, messageSender, messageSender.notifyQuizEndedUserCanceled, cancelingUserId));
  }
}

function skipCommand(locationId) {
  let action = state.quizManager.currentActionForLocationId[locationId];
  if (action && action.skip) {
    action.skip();
    return true;
  }
  return false;
}

function saveQuizCommand(locationId, savingUserId, saveName) {
  let session = state.quizManager.sessionForLocationId[locationId];
  if (!session) {
    return Promise.resolve(false);
  }
  if (session.getGameMode().isReviewMode) {
    return session.getMessageSender().notifySaveFailedIsReview();
  }
  let ownerId = session.getOwnerId();
  if (savingUserId !== ownerId) {
    return session.getMessageSender().notifySaveFailedNotOwner();
  }
  if (session.getRemainingCardCount() > MAX_SAVE_QUESTIONS && !session.getIsLoaded()) {
    return session.getMessageSender().notifySaveFailedTooManyQuestions(MAX_SAVE_QUESTIONS);
  }

  return saveManager.getSaveMementos(savingUserId).then(mementos => {
    let hasSpace = mementos.length < MAX_SAVES_PER_USER;
    if (session.saveRequestedByUserId) {
      return;
    }
    if (hasSpace) {
      session.saveRequestedByUserId = savingUserId;
      session.setSaveName(saveName);
      return session.getMessageSender().notifySaving();
    } else {
      return session.getMessageSender().notifySaveFailedNoSpace(MAX_SAVES_PER_USER);
    }
  });
}

function isSessionInProgressAtLocation(locationId) {
  return !!state.quizManager.sessionForLocationId[locationId];
}

function setSessionForLocationId(session, locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already have a session for that loction ID');
  state.quizManager.sessionForLocationId[locationId] = session;
}

/* ACTIONS */

const fullWidthZeroCodePoint = '０'.codePointAt(0);

function parseIntEx(input) {
  // This function only needs to handle single digit input
  if (input.length > 1) {
    return Number.NaN;
  }

  if (input >= '０' && input <= '９') {
    return input.codePointAt(0) - fullWidthZeroCodePoint;
  }

  return Number.parseInt(input);
}

class Action {
  constructor(session) {
    this.session_ = session;
  }

  getSession_() {
    return this.session_;
  }
}

class EndQuizForErrorAction extends Action {
  do() {
    let session = this.getSession_();
    try {
      globals.logger.error({
        event: 'STOPPING FOR ERROR',
      });
      let messageSender = session.getMessageSender();
      return Promise.resolve(endQuiz(true, session, messageSender, messageSender.notifyQuizEndedError)).catch(err => {
        globals.logger.error({
          event: 'ERROR ENDING SESSION GRACEFULLY FOR ERROR',
          err,
        });
        return Promise.resolve(closeSession(session, true)).then(() => {
          globals.logger.info({ event: 'ERRORED SESSION CLOSED UNGRACEFULLY' });
          throw err;
        });
      });
    } catch (err) {
      globals.logger.error({
        event: 'ERROR ENDING SESSION GRACEFULLY FOR ERROR',
        err,
      });
      return Promise.resolve(closeSession(session, true)).then(() => {
        globals.logger.info({ event: 'ERRORED SESSION CLOSED UNGRACEFULLY' });
        throw err;
      });
    }
  }
}

class EndQuizScoreLimitReachedAction extends Action {
  do() {
    let session = this.getSession_();
    let messageSender = session.getMessageSender();
    let scoreLimit = session.getScores().getScoreLimit();
    return endQuiz(true, session, messageSender, messageSender.notifyQuizEndedScoreLimitReached, scoreLimit);
  }
}

class EndQuizNoQuestionsLeftAction extends Action {
  do() {
    let session = this.getSession_();
    let messageSender = session.getMessageSender();
    return endQuiz(true, session, messageSender, messageSender.notifyQuizEndedNoQuestionsLeft, session.getGameMode());
  }
}

class EndQuizTooManyWrongAnswersInARowAction extends Action {
  do() {
    let session = this.getSession_();
    let missedQuestionsInARow = session.getUnansweredQuestionsInARow();
    let messageSender = session.getMessageSender();
    return endQuiz(true, session, messageSender, messageSender.notifyQuizEndedTooManyWrongAnswers, { missedQuestionsInARow });
  }
}

class EndQuizTooManyWrongAnswersTotalAction extends Action {
  do() {
    let session = this.getSession_();
    let missedQuestionsTotal = session.getUnansweredQuestionsTotal();
    let messageSender = session.getMessageSender();
    return endQuiz(true, session, messageSender, messageSender.notifyQuizEndedTooManyWrongAnswers, { missedQuestionsTotal });
  }
}

class ShowAnswersAction extends Action {
  constructor(session, timeLeft) {
    super(session);
    this.timeLeft = timeLeft;
  }

  endTimeout() {
    if (this.timeoutEnded_) {
      return;
    }

    this.timeoutEnded_ = true;

    try {
      const session = this.getSession_();
      const currentCard = session.getCurrentCard();

      let scores = session.getScores();
      let answerersInOrder = scores.getCurrentQuestionAnswerersInOrder();
      let scoresForUser = scores.getAggregateScoreForUser();
      let answersForUser = scores.getCurrentQuestionsAnswersForUser();
      let pointsForAnswer = scores.getCurrentQuestionPointsForAnswer();
      let scoreLimit = scores.getScoreLimit();
      const quickSearchEnabled = session.isQuickSearchEnabled()

      if (answerersInOrder.length > 0) {
        sessionReportManager.notifyAnswered(session.getLocationId(), currentCard, answerersInOrder);
        session.markCurrentCardAnswered();
        Promise.resolve(session.getMessageSender().outputQuestionScorers(
          currentCard,
          answerersInOrder,
          answersForUser,
          pointsForAnswer,
          scoresForUser,
          scoreLimit,
          quickSearchEnabled,
          )).catch(err => {
            globals.logger.warn({
              event: 'ERROR OUTPUTTING SCOREBOARD',
              err,
            });
        });
      } else {
        return this.fulfill_(new ShowWrongAnswerAction(session, false, true));
      }

      if (scores.checkForWin()) {
        this.fulfill_(new EndQuizScoreLimitReachedAction(session));
      } else {
        this.fulfill_(new WaitAction(session, currentCard.newQuestionDelayAfterAnsweredInMs, new AskQuestionAction(session)));
      }
    } catch (err) {
      this.reject_(err);
    }
  }

  do() {
    const session = this.getSession_();
    const currentCard = session.getCurrentCard();
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      this.reject_ = reject;
      const additionalAnswerWaitTimeInMs = session.isNoRace()
        ? this.timeLeft
        : currentCard.additionalAnswerWaitTimeInMs;

      let timer = safeSetTimeout(() => this.endTimeout(), additionalAnswerWaitTimeInMs);
      session.addTimer(timer);
    });
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }

  skip() {
    this.endTimeout();
  }

  tryAcceptUserInput(userId, userName, input) {
    const session = this.getSession_();
    const card = session.getCurrentCard();
    const oneAnswerPerPlayer = session.oneAnswerPerPlayer() || card.options;
    if (oneAnswerPerPlayer && session.answerAttempters.indexOf(userId) !== -1) {
      return false;
    }

    const inputAsInt = parseIntEx(input.replace(/\|\|/g, ''));
    if (!card.options || (!Number.isNaN(inputAsInt) && inputAsInt <= card.options.length)) {
      if (!Number.isNaN(inputAsInt) && card.options) {
        input = `${inputAsInt}`;
      }
      session.answerAttempters.push(userId);
      if (session.getOwnerId() === userId && oneAnswerPerPlayer) {
        return this.getSession_().tryAcceptAnswer(userId, userName, input);
      }
    }

    return this.getSession_().tryAcceptAnswer(userId, userName, input);
  }
}

class ShowWrongAnswerAction extends Action {
  constructor(session, skipped, hardcore) {
    super(session);
    this.skipped_ = skipped;
    this.hardcore_ = !!hardcore;
  }

  do() {
    let session = this.getSession_();
    let currentCard = session.getCurrentCard();
    const quickSearchEnabled = session.isQuickSearchEnabled()
    sessionReportManager.notifyAnswered(session.getLocationId(), currentCard, []);
    session.markCurrentCardUnanswered();
    return Promise.resolve(session.getMessageSender().showWrongAnswer(currentCard, this.skipped_, this.hardcore_, quickSearchEnabled)).catch(err => {
      let question = currentCard.question;
      globals.logger.warn({
        event: 'FAILED TO SHOW TIMEOUT MESSAGE',
        detail: question,
        err,
      });
    }).then(() => {
      if (session.checkTooManyWrongAnswersInARow()) {
        return new EndQuizTooManyWrongAnswersInARowAction(session);
      } else if (session.checkTooManyWrongAnswersTotal()) {
        return new EndQuizTooManyWrongAnswersTotalAction(session);
      } else {
        return new WaitAction(session, currentCard.newQuestionDelayAfterUnansweredInMs, new AskQuestionAction(session));
      }
    });
  }
}

class AskQuestionAction extends Action {
  constructor(session) {
    super(session);
    this.canBeSaved = true;
  }

  tryAcceptUserInput(userId, userName, input) {
    if (!this.readyForAnswers_) {
      return false;
    }
    let session = this.getSession_();
    const card = session.getCurrentCard();
    const oneAnswerPerPlayer = session.oneAnswerPerPlayer() || card.options;
    if (oneAnswerPerPlayer && session.answerAttempters.indexOf(userId) !== -1) {
      return false;
    }

    let timeLeft = card.answerTimeLimitInMs;
    if (this.timeoutStartTime) {
      timeLeft -= (new Date() - this.timeoutStartTime);
    }

    const inputAsInt = parseIntEx(input.replaceAll('||', ''));
    if (!card.options || card.options.indexOf(input) !== -1 || (!Number.isNaN(inputAsInt) && inputAsInt <= card.options.length)) {
      if (!Number.isNaN(inputAsInt) && card.options) {
        input = `${inputAsInt}`;
      }
      session.answerAttempters.push(userId);
      if (session.getOwnerId() === userId && oneAnswerPerPlayer) {
        const accepted = session.tryAcceptAnswer(userId, userName, input);
        const timeSinceAskedMs = (new Date() - this.timeoutStartTime) || Number.MAX_SAFE_INTEGER;
        const isWithinBlindEyeInterval = timeSinceAskedMs <= HARDCORE_BLIND_EYE_INTERVAL_IN_MS;
        if (accepted || !isWithinBlindEyeInterval) {
          this.fulfill_(new ShowAnswersAction(session, timeLeft));
          return accepted;
        }

        if (isWithinBlindEyeInterval) {
          session.answerAttempters.pop();
        }
      }
    }
    let accepted = session.tryAcceptAnswer(userId, userName, input);
    if (accepted) {
      this.fulfill_(new ShowAnswersAction(session, timeLeft));
    }
    return accepted;
  }

  scheduleReveal_(numberOfReveals) {
    if (numberOfReveals === 0) {
      return;
    }

    let session = this.getSession_();
    let timer = safeSetTimeout(() => {
      try {
        cardStrategies.createTextQuestionWithHint(session.getCurrentCard(), session).then(question => {
          if (question) {
            return session.getMessageSender().showQuestion(question, this.shownQuestionId_).catch(err => {
              globals.logger.warn({
                event: 'FAILED TO UPDATE REVEAL',
                err,
              });
            });
          }
        }).then(() => {
          this.scheduleReveal_(numberOfReveals - 1);
        }).catch(err => {
          this.reject_(err);
        });
      } catch(err) {
        this.reject_(err);
      }
    }, REVEAL_INTERVAL_IN_MS);
    session.addTimer(timer);
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }

  skip() {
    try {
      if (this.fulfill_) {
        let session = this.getSession_();
        this.fulfill_(new ShowWrongAnswerAction(session, true));
      }
    } catch (err) {
      globals.logger.error({
        event: 'FAILED TO SKIP',
        err,
      });
    }
  }

  async do() {
    let session = this.getSession_();
    session.answerAttempters = [];
    session.getScores().resetStateForNewCard();
    let nextCard = await session.getNextCard();
    if (!nextCard) {
      return Promise.resolve(new EndQuizNoQuestionsLeftAction(session));
    }

    let preprocessPromise = Promise.resolve(nextCard);
    if (!nextCard.wasPreprocessed) {
      preprocessPromise = nextCard.preprocess(nextCard);
    }

    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      this.reject_ = reject;
      preprocessPromise.then(card => {
        if (card === false) {
          nextCard.discarded = true;
          return fulfill(this.do());
        }
        card.wasPreprocessed = true;
        session.setCurrentCard(card);
        this.readyForAnswers_ = true;
        return card.createQuestion(card, session).then(question => {
          return retryPromise(() => Promise.resolve(session.getMessageSender().showQuestion(question)), 3).catch(err => {
            globals.logger.error({
              event: 'ERROR SHOWING QUESTION',
              err,
              question,
              detail: question.question,
            });
            throw err;
          });
        }).then(shownQuestionId => {
          this.shownQuestionId_ = shownQuestionId;
          this.timeoutStartTime = new Date();
          let timer = safeSetTimeout(() => {
            try {
              fulfill(new ShowWrongAnswerAction(session, false));
            } catch(err) {
              reject(err);
            }
          }, card.answerTimeLimitInMs);
          session.addTimer(timer);
          this.scheduleReveal_(card.numberOfReveals);
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    });
  }
}

class StartAction extends Action {
  do() {
    const session = this.getSession_();
    const name = session.getQuizName();
    const description = session.getQuizDescription();
    const quizLength = session.getRemainingCardCount();
    const scoreLimit = session.getScores().getScoreLimit();

    sessionReportManager.notifyStarting(
      session.getRawStartCommand(),
      session.getLocationId(),
      session.getScoreScopeId(),
      name,
      session.getSettings(),
      session.getDeckInfo(),
      session.getIsLoaded(),
    );

    return Promise.resolve(session.getMessageSender().notifyStarting(INITIAL_DELAY_IN_MS, name, description, quizLength, scoreLimit)).catch(err => {
      globals.logger.warn({
        event: 'ERROR SHOWING QUIZ START MESSAGE',
        err,
      });
    }).then(() => {
      let askQuestionAction = new AskQuestionAction(session);
      return new WaitAction(session, INITIAL_DELAY_IN_MS, askQuestionAction);
    });
  }
}

class WaitAction extends Action {
  constructor(session, waitInterval, nextAction) {
    super(session);
    this.waitInterval_ = waitInterval;
    this.nextAction_ = nextAction;
  }

  do() {
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      let timer = safeSetTimeout(() => {
        fulfill(this.nextAction_);
      }, this.waitInterval_);
      this.getSession_().addTimer(timer);
    });
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }

  skip() {
    if (this.fulfill_) {
      this.fulfill_(this.nextAction_);
    }
  }
}

class SaveAction extends Action {
  constructor(session, savingUserId) {
    super(session);
    this.savingUserId_ = savingUserId;
  }

  do() {
    let session = this.getSession_();
    return Promise.resolve(closeSession(session, false)).then(() => {
      let saveData = session.createSaveData();
      return saveManager.save(saveData, this.savingUserId_, session.getSaveName(), session.getGameModeIdentifier());
    }).then(() => {
      sessionReportManager.notifyStopped(session.getLocationId(), session.getScoresForUserPairs());
      return session.getMessageSender().notifySaveSuccessful().catch(err => {
        globals.logger.warn({
          event: 'ERROR SENDING QUIZ SAVE MESSAGE',
          err,
        });
      });
    }).catch(err => {
      globals.logger.error({
        event: 'ERROR SAVING',
        err,
      });
      return new EndQuizForErrorAction(session);
    });
  }
}

function chainActions(locationId, action) {
  let session = state.quizManager.sessionForLocationId[locationId];
  if (!action || !action.do || !session) {
    return Promise.resolve();
  }
  state.quizManager.currentActionForLocationId[locationId] = action;

  try {
    return Promise.resolve(action.do()).then(result => {
      if (session.saveRequestedByUserId && result && result.canBeSaved) {
        return chainActions(locationId, new SaveAction(session, session.saveRequestedByUserId));
      }

      session.clearTimers();
      return chainActions(locationId, result);
    }).catch(err => {
      globals.logger.error({
        event: 'QUIZ ERROR',
        err,
        detail: locationId,
      });
      return chainActions(locationId, new EndQuizForErrorAction(session)).then(() => {
        return QUIZ_END_STATUS_ERROR;
      });
    });
  } catch (err) {
    globals.logger.error({
      event: 'ERROR IN CHAINACTIONS',
      detail: locationId,
      err,
    });
    let messageSender = session.getMessageSender();
    return Promise.resolve(endQuiz(true, session, messageSender, messageSender.notifyQuizEndedError)).then(() => {
      return QUIZ_END_STATUS_ERROR;
    });
  }
}

/* EXPORT */

function verifySessionNotInProgress(locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already a session in progress there.');
}

class QuizManager {
  startSession(session, locationId) {
    verifySessionNotInProgress(locationId);
    setSessionForLocationId(session, locationId);
    return chainActions(locationId, new StartAction(session));
  }

  isSessionInProgressAtLocation(locationId) {
    return isSessionInProgressAtLocation(locationId);
  }

  processUserInput(locationId, userId, userName, input) {
    input = input.toLowerCase();
    let currentAction = state.quizManager.currentActionForLocationId[locationId];
    if (!currentAction) {
      return false;
    }
    if (currentAction.tryAcceptUserInput) {
      return currentAction.tryAcceptUserInput(userId, userName, input);
    }
    return false;
  }

  stopAllQuizzes() {
    return stopAllQuizzesCommand();
  }

  stopQuiz(locationId, cancelingUserId, cancelingUserIsAdmin) {
    return stopQuizCommand(locationId, cancelingUserId, cancelingUserIsAdmin);
  }

  saveQuiz(locationId, savingUserId, saveName) {
    return saveQuizCommand(locationId, savingUserId, saveName);
  }

  skip(locationId) {
    return skipCommand(locationId);
  }

  getDesiredSettings() {
    return [
      'quiz/japanese/answer_time_limit',
      'quiz/japanese/score_limit',
      'quiz/japanese/unanswered_question_limit',
      'quiz/japanese/new_question_delay_after_unanswered',
      'quiz/japanese/new_question_delay_after_answered',
      'quiz/japanese/additional_answer_wait_time',
      'quiz_font_color',
      'quiz_background_color',
      'quiz_font_size',
      'quiz_font',
      'quiz_conquest_mode_percent_correct_threshold',
      'quiz_conquest_mode_spacing_modifier',
    ];
  }

  hasQuizSession(locationId) {
    return !!state.quizManager.currentActionForLocationId[locationId];
  }

  getInProcessLocations() {
    return Object.keys(state.quizManager.sessionForLocationId);
  }

  getActiveSessionInformation() {
    const sessions = Object.values(state.quizManager.sessionForLocationId);
    return sessions.map((session) => ({
      locationId: session.getLocationId(),
      quizName: session.getQuizName(),
      ownerId: session.getOwnerId(),
      scoreScopeId: session.getScoreScopeId(),
    }));
  }
}

module.exports = new QuizManager();
module.exports.END_STATUS_ERROR = QUIZ_END_STATUS_ERROR;
