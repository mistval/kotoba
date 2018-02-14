'use strict'
const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const assert = require('assert');
const logger = reload('monochrome-bot').logger;

// TODO: These should be configurable
const BOT_TURN_WAIT_MIN_IN_MS = 5000;
const BOT_TURN_WAIT_MAX_IN_MS = 8000;
const INITIAL_DELAY_IN_MS = 5000;

const LOGGER_TITLE = 'SHIRITORI';
const END_STATUS_ERROR = 1;

/* LOADING AND INITIALIZATION */

if (!state.shiritoriManager) {
  state.shiritoriManager = {
    currentActionForLocationId: {},
    sessionForLocationId: {},
  };
}

function isSessionInProgressAtLocation(locationId) {
  return !!state.shiritoriManager.sessionForLocationId[locationId];
}

function setSessionForLocationId(session, locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already have a session for that loction ID');
  state.shiritoriManager.sessionForLocationId[locationId] = session;
}

function createTimeoutPromise(session, inMs) {
  return new Promise((fulfill, reject) => {
    let timer = setTimeout(() => {
      fulfill();
    }, inMs);
    session.addTimer(timer);
  });
}

/* ACTIONS */

class Action {
  constructor(session) {
    this.session_ = session;
  }

  getSession_() {
    return this.session_;
  }

  getGameStrategy_() {
    return this.session_.getGameStrategy();
  }
}

class PlayerTurnAction extends Action {
  do() {

  }
}

class BotTurnAction extends Action {
  constructor(session, doDelay) {
    super(session);
    if (doDelay) {
      this.delay_ = BOT_TURN_WAIT_MIN_IN_MS + Math.floor(Math.random() * (BOT_TURN_WAIT_MAX_IN_MS - BOT_TURN_WAIT_MAX_IN_MS));
    } else {
      this.delay_ = 0;
    }
  }

  do() {
    let session = this.getSession_();
    let gameStrategy = this.getGameStrategy_();
    let wordHistory = session.getWordHistory();
    let clientDelegate = session.getClientDelegate();
    let nextWord = gameStrategy.getViableNextWord(wordHistory);
    nextWord.userId = session.getBotUserId();

    return Promise.resolve(clientDelegate.botWillTakeTurnIn(this.delay_)).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Client delegate failed', err);
    }).then(() => {
      return createTimeoutPromise(session, this.delay_);
    }).then(() => {
      wordHistory.push(nextWord);
      session.advanceCurrentPlayer();
      let nextPlayerId = session.getNextPlayerId();
      return clientDelegate.playerTookTurn(wordHistory, nextPlayerId, true, false).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Client delegate failed', err);
      });
    }).then(() => {
      return new PlayerTurnAction(session);
    });
  }
}

class StartAction extends Action {
  do() {
    const session = this.getSession_();
    return Promise.resolve(session.getClientDelegate().notifyStarting(INITIAL_DELAY_IN_MS)).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Error showing starting message', err);
    }).then(() => {
      let askQuestionAction = new BotTurnAction(session, false);
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
    return createTimeoutPromise(this.getSession_(), this.waitInterval_).then(() => {
      return this.nextAction_;
    });
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }
}

function chainActions(locationId, action) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!action || !action.do || !session) {
    return Promise.resolve();
  }
  state.shiritoriManager.currentActionForLocationId[locationId] = action;

  try {
    return Promise.resolve(action.do()).then(result => {
      session.clearTimers();
      return chainActions(locationId, result);
    }).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Error', err);
      return chainActions(locationId, new EndQuizForErrorAction(session)).then(() => {
        return END_STATUS_ERROR;
      });
    });
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error in chainActions. Closing the session.', err);
    let messageSender = session.getClientDelegate();
    return Promise.resolve(endQuiz(true, session, messageSender, messageSender.notifyQuizEndedError)).then(() => {
      return END_STATUS_ERROR;
    });
  }
}

/* EXPORT */

function verifySessionNotInProgress(locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already a session in progress there.');
}

class ShiritoriManager {
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
    let currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
    if (!currentAction) {
      return false;
    }
    if (currentAction.tryAcceptUserInput) {
      return currentAction.tryAcceptUserInput(userId, userName, input);
    }
    return false;
  }
}

module.exports = new ShiritoriManager();
module.exports.END_STATUS_ERROR = END_STATUS_ERROR;
