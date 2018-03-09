'use strict'
const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const assert = require('assert');
const logger = reload('monochrome-bot').logger;
const scoreManager = reload('./../score_manager.js');

const INITIAL_DELAY_IN_MS = 5000;
const SPACING_DELAY_IN_MS = 1000;
const WAIT_AFTER_TIMEOUT_IN_MS = 4000;

const LOGGER_TITLE = 'SHIRITORI';
const END_STATUS_ERROR = 1;

const EndGameReason = {
  NO_PLAYERS: 1,
  STOP_COMMAND: 2,
  ERROR: 3,
};

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

function endGame(locationId, reason, arg) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  delete state.shiritoriManager.sessionForLocationId[locationId];
  let currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
  delete state.shiritoriManager.currentActionForLocationId[locationId];

  if (currentAction && currentAction.stop) {
    currentAction.stop();
  }

  if (session) {
    session.clearTimers();
    return session.getClientDelegate().stopped(reason, session.getWordHistory(), arg);
  }
}

function botLeaveCommand(locationId, userId) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  let clientDelegate = session.getClientDelegate();
  let removed = session.removeBot();
  if (removed) {
    return clientDelegate.botLeft(userId);
  }
  return false;
}

function botJoinCommand(locationId, userId) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  let clientDelegate = session.getClientDelegate();
  let added = session.addBot();
  if (added) {
    return clientDelegate.botJoined(userId);
  }
  return false;
}

function joinCommand(locationId, userId, userName) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  let addedOrReactivated = session.addPlayer(userId, userName);
  if (addedOrReactivated) {
    return session.getClientDelegate().addedPlayer(userId);
  }
  return false;
}

function leaveCommand(locationId, userId) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  let removed = session.removePlayer(userId);
  if (removed) {
    return session.getClientDelegate().playerLeft(userId);
  }
  return false;
}

function tryShowCurrentState(session) {
  let wordHistory = session.getWordHistory();
  let currentPlayerId = session.getCurrentPlayerId();
  let currentPlayerIsBot = currentPlayerId === session.getBotUserId();
  let previousPlayerIsBot = wordHistory[wordHistory.length - 1].userId === session.getBotUserId();
  let clientDelegate = session.getClientDelegate();
  return clientDelegate.playerTookTurn(wordHistory, currentPlayerId, previousPlayerIsBot, currentPlayerIsBot).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
  });
}

class EndGameForErrorAction extends Action {
  do() {
    return endGame(this.getSession_().getLocationId(), EndGameReason.ERROR);
  }
}

class EndGameForNoPlayersAction extends Action {
  do() {
    let session = this.getSession_();
    let players = session.getActivePlayers();
    let botIsPlaying = players.indexOf(session.getBotUserId()) !== -1;
    return endGame(this.getSession_().getLocationId(), EndGameReason.NO_PLAYERS, {players, botIsPlaying});
  }
}

class TimeoutAction extends Action {
  constructor(session, boot) {
    super(session);
    this.boot_ = boot;
  }

  do() {
    let session = this.getSession_();
    let clientDelegate = session.getClientDelegate();
    let currentPlayerId = session.getCurrentPlayerId();
    let promise;

    if (this.boot_) {
      promise = clientDelegate.removedPlayerForInactivity(currentPlayerId);
    } else {
      promise = clientDelegate.skippedPlayer(currentPlayerId);
    }

    return promise.catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
    }).then(() => {
      return createTimeoutPromise(session, WAIT_AFTER_TIMEOUT_IN_MS);
    }).then(() => {
      if (this.boot_) {
        session.removePlayer(session.getCurrentPlayerId());
      }
      if (!session.hasMultiplePlayers()) {
        return new EndGameForNoPlayersAction(session);
      }
      session.advanceCurrentPlayer();
      return tryShowCurrentState(session).then(() => {
        return new WaitAction(session, WAIT_AFTER_TIMEOUT_IN_MS, new TakeTurnForCurrentPlayerAction(session));
      });
    });
  }
}

class PlayerTurnAction extends Action {
  do() {
    this.acceptingAnswers_ = true;
    this.canTimeout_ = true;
    this.playerDidTalk_ = false;
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      let session = this.getSession_();
      return createTimeoutPromise(session, session.getAnswerTimeLimitInMs()).then(() => {
        if (this.canTimeout_) {
          let session = this.getSession_();
          let boot = !this.playerDidTalk_;
          this.fulfill_(new TimeoutAction(session, boot));
        }
      });
    });
  }

  tryAcceptUserInput(userId, input) {
    if (!this.acceptingAnswers_) {
      return false;
    }
    let session = this.getSession_();
    let currentPlayerId = session.getCurrentPlayerId();
    if (userId !== currentPlayerId) {
      return false;
    }
    this.playerDidTalk_ = true;
    if (input.indexOf(' ') !== -1) {
      return false;
    }

    let gameStrategy = this.getGameStrategy_();
    let clientDelegate = session.getClientDelegate();
    let wordHistory = session.getWordHistory();
    let result = gameStrategy.tryAcceptAnswer(input, wordHistory);

    if (result.accepted) {
      this.acceptingAnswers_ = false;
      this.canTimeout_ = false;
      result.word.userId = userId;
      result.word.userName = session.getNameForUserId(userId);
      if (!session.hasMultiplePlayers()) {
        this.fulfill_(new EndGameForNoPlayersAction(session));
        return true;
      }
      session.advanceCurrentPlayer();
      wordHistory.push(result.word);
      return createTimeoutPromise(session, SPACING_DELAY_IN_MS).then(() => {
        return tryShowCurrentState(session);
      }).then(() => {
        this.fulfill_(new TakeTurnForCurrentPlayerAction(session));
      });
    }

    let removePlayer = session.shouldRemovePlayerForRuleViolations();
    let isSilent = result.possiblyChat && !removePlayer;
    if (!isSilent) {
      this.canTimeout_ = !removePlayer;
      this.acceptingAnswers_ = !removePlayer;
      let rejectionReason = result.rejectionReason;
      return clientDelegate.answerRejected(input, rejectionReason).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
      }).then(() => {
        if (removePlayer) {
          session.removePlayer(currentPlayerId);
          return createTimeoutPromise(session, SPACING_DELAY_IN_MS).then(() => {
            return clientDelegate.removedPlayerForRuleViolation(currentPlayerId).catch(err => {
              logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
            });
          }).then(() => {
            return createTimeoutPromise(session, SPACING_DELAY_IN_MS);
          }).then(() => {
            if (!session.hasMultiplePlayers()) {
              this.fulfill_(new EndGameForNoPlayersAction(session));
              return;
            }
            session.advanceCurrentPlayer();
            return tryShowCurrentState(session).then(() => {
              this.fulfill_(new TakeTurnForCurrentPlayerAction(session));
            })
          });
        }
      }).then(() => {
        return 'Rule violation';
      });
    }

    return 'Rule violation';
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }
}

class BotTurnAction extends Action {
  constructor(session, doDelay) {
    super(session);
    if (doDelay) {
      let minWaitInMs = session.getBotTurnMinimumWaitInMs();
      let maxWaitInMs = session.getBotTurnMaximumWaitInMs();
      this.delay_ = minWaitInMs + Math.floor(Math.random() * (maxWaitInMs - minWaitInMs));
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
      if (!session.hasMultiplePlayers()) {
        return new EndGameForNoPlayersAction(session);
      }
      session.advanceCurrentPlayer();
      wordHistory.push(nextWord);
      return tryShowCurrentState(session).then(() => {
        return new TakeTurnForCurrentPlayerAction(session);
      })
    });
  }
}

class TakeTurnForCurrentPlayerAction extends Action {
  do() {
    let session = this.getSession_();
    let currentPlayerId = session.getCurrentPlayerId();
    if (currentPlayerId === session.getBotUserId()) {
      return new BotTurnAction(session, true);
    } else {
      return new PlayerTurnAction(session);
    }
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
      return chainActions(locationId, new EndGameForErrorAction(session)).then(() => {
        return END_STATUS_ERROR;
      });
    });
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error in chainActions. Closing the session.', err);
    return Promise.resolve(endGame(locationId, EndGameReason.ERROR)).then(() => {
      return END_STATUS_ERROR;
    });
  }
}

/* EXPORT */

function verifySessionNotInProgress(locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already a session in progress there.');
}

class ShiritoriManager {
  startSession(session) {
    let locationId = session.getLocationId();
    verifySessionNotInProgress(locationId);
    setSessionForLocationId(session, locationId);
    return chainActions(session.getLocationId(), new StartAction(session));
  }

  isSessionInProgressAtLocation(locationId) {
    return isSessionInProgressAtLocation(locationId);
  }

  processUserInput(locationId, userId, userName, input) {
    scoreManager.registerUsernameForUserId(userId, userName);
    let currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
    if (!currentAction) {
      return false;
    }
    if (currentAction.tryAcceptUserInput) {
      return currentAction.tryAcceptUserInput(userId, input);
    }
    return false;
  }

  stop(locationId, userId) {
    return endGame(locationId, EndGameReason.STOP_COMMAND, {userId});
  }

  join(locationId, userId, userName) {
    return joinCommand(locationId, userId, userName);
  }

  leave(locationId, userId) {
    return leaveCommand(locationId, userId);
  }

  botLeave(locationId, userId) {
    return botLeaveCommand(locationId, userId);
  }

  botJoin(locationId, userId) {
    return botJoinCommand(locationId, userId);
  }
}

module.exports = new ShiritoriManager();
module.exports.END_STATUS_ERROR = END_STATUS_ERROR;
module.exports.EndGameReason = EndGameReason;
