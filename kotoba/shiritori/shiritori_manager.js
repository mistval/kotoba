const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const assert = require('assert');
const globals = require('./../globals.js');

const scoreManager = reload('./../score_manager.js');

const INITIAL_DELAY_IN_MS = 5000;
const SPACING_DELAY_IN_MS = 1000;
const WAIT_AFTER_TIMEOUT_IN_MS = 4000;

const LOGGER_TITLE = 'SHIRITORI';
const END_STATUS_ERROR = 1;
const BOT_USER_NAME = 'Kotoba';
const SHIRITORI_DECK_ID = 'shiritori';

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
  return new Promise((fulfill) => {
    const timer = setTimeout(() => {
      fulfill();
    }, inMs);
    session.addTimer(timer);
  });
}

function endGame(locationId, reason, arg) {
  const session = state.shiritoriManager.sessionForLocationId[locationId];
  try {
    delete state.shiritoriManager.sessionForLocationId[locationId];
    const currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
    delete state.shiritoriManager.currentActionForLocationId[locationId];

    if (session) {
      session.clearTimers();
    }

    if (currentAction && currentAction.stop) {
      currentAction.stop();
    }

    if (session) {
      const scores = scoreManager.getScoresForLocationId(session.getLocationId());
      scoreManager.commitAndClearScores(session.getLocationId(), SHIRITORI_DECK_ID);
      return session.getClientDelegate().stopped(reason, session.getWordHistory(), scores, arg);
    }
  } catch (err) {
    if (session) {
      return session.getClientDelegate().stopped(
        EndGameReason.ERROR,
        session.getWordHistory(),
        {},
        arg,
      ).then(() => {
        throw err;
      });
    }
    throw err;
  }

  return undefined;
}

function botLeaveCommand(locationId, userId) {
  const session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  const clientDelegate = session.getClientDelegate();
  const removed = session.removeBot();
  if (removed) {
    return clientDelegate.botLeft(userId);
  }
  return false;
}

function botJoinCommand(locationId, userId) {
  const session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  const clientDelegate = session.getClientDelegate();
  const added = session.addBot();
  if (added) {
    return clientDelegate.botJoined(userId);
  }
  return false;
}

function joinCommand(locationId, userId, userName) {
  const session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  const addedOrReactivated = session.addPlayer(userId, userName);
  if (addedOrReactivated) {
    return session.getClientDelegate().addedPlayer(userId);
  }
  return false;
}

function leaveCommand(locationId, userId) {
  const session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  const removed = session.removePlayer(userId);
  if (removed) {
    return session.getClientDelegate().playerLeft(userId);
  }
  return false;
}

function tryShowCurrentState(session) {
  const wordHistory = session.getWordHistory();
  const currentPlayerId = session.getCurrentPlayerId();
  const currentPlayerIsBot = currentPlayerId === session.getBotUserId();
  const previousPlayerIsBot = wordHistory[wordHistory.length - 1].userId === session.getBotUserId();
  const clientDelegate = session.getClientDelegate();
  const locationId = session.getLocationId();
  return clientDelegate.playerTookTurn(
    wordHistory,
    currentPlayerId,
    previousPlayerIsBot,
    currentPlayerIsBot,
    scoreManager.getScoresForLocationId(locationId),
  ).catch((err) => {
    globals.globals.logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
  });
}

/* ACTIONS */

class Action {
  constructor(session) {
    this.session = session;
  }

  getSession() {
    return this.session;
  }

  getGameStrategy() {
    return this.session.getGameStrategy();
  }
}

class WaitAction extends Action {
  constructor(session, waitInterval, nextAction) {
    super(session);
    this.waitInterval = waitInterval;
    this.nextAction = nextAction;
  }

  async do() {
    return createTimeoutPromise(this.getSession(), this.waitInterval).then(() => this.nextAction);
  }

  stop() {
    if (this.fulfill) {
      this.fulfill();
    }
  }
}

class EndGameForErrorAction extends Action {
  async do() {
    return endGame(this.getSession().getLocationId(), EndGameReason.ERROR);
  }
}

class EndGameForNoPlayersAction extends Action {
  async do() {
    const session = this.getSession();
    const players = session.getActivePlayers();
    const botIsPlaying = players.indexOf(session.getBotUserId()) !== -1;
    return endGame(
      this.getSession().getLocationId(),
      EndGameReason.NO_PLAYERS,
      { players, botIsPlaying },
    );
  }
}

class TakeTurnForCurrentPlayerAction extends Action {
  async do() {
    const session = this.getSession();
    const currentPlayerId = session.getCurrentPlayerId();
    if (currentPlayerId === session.getBotUserId()) {
      // These actions depend on each other in an overall circular
      // way. I've decided that that's perfectly fine given the
      // way this module is designed. So ignore the style rule.
      // eslint-disable-next-line no-use-before-define
      return new BotTurnAction(session, true);
    }
    // eslint-disable-next-line no-use-before-define
    return new PlayerTurnAction(session);
  }
}

class TimeoutAction extends Action {
  constructor(session, boot) {
    super(session);
    this.boot = boot;
  }

  async do() {
    const session = this.getSession();
    const clientDelegate = session.getClientDelegate();
    const currentPlayerId = session.getCurrentPlayerId();
    let promise;

    if (this.boot) {
      promise = clientDelegate.removedPlayerForInactivity(currentPlayerId);
    } else {
      promise = clientDelegate.skippedPlayer(currentPlayerId);
    }

    return promise.catch((err) => {
      globals.logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
    }).then(() => createTimeoutPromise(session, WAIT_AFTER_TIMEOUT_IN_MS)).then(() => {
      if (this.boot) {
        session.removePlayer(session.getCurrentPlayerId());
      }
      if (!session.hasMultiplePlayers()) {
        return new EndGameForNoPlayersAction(session);
      }
      session.advanceCurrentPlayer();
      return tryShowCurrentState(session).then(() => new WaitAction(
        session,
        WAIT_AFTER_TIMEOUT_IN_MS,
        new TakeTurnForCurrentPlayerAction(session),
      ));
    });
  }
}

class PlayerTurnAction extends Action {
  async do() {
    this.acceptingAnswers = true;
    this.canTimeout = true;
    this.playerDidTalk = false;
    return new Promise((fulfill) => {
      this.fulfill = fulfill;
      const session = this.getSession();
      return createTimeoutPromise(session, session.getAnswerTimeLimitInMs()).then(() => {
        if (this.canTimeout) {
          const boot = !this.playerDidTalk;
          this.fulfill(new TimeoutAction(session, boot));
        }
      });
    });
  }

  tryAcceptUserInput(userId, input) {
    if (!this.acceptingAnswers) {
      return false;
    }
    const session = this.getSession();
    const currentPlayerId = session.getCurrentPlayerId();
    if (userId !== currentPlayerId) {
      return false;
    }
    this.playerDidTalk = true;
    if (input.indexOf(' ') !== -1) {
      return false;
    }

    const gameStrategy = this.getGameStrategy();
    const clientDelegate = session.getClientDelegate();
    const wordHistory = session.getWordHistory();
    const result = gameStrategy.tryAcceptAnswer(input, wordHistory);

    if (result.accepted) {
      const locationId = session.getLocationId();
      scoreManager.addScore(locationId, userId, result.score);

      this.acceptingAnswers = false;
      this.canTimeout = false;
      result.word.userId = userId;
      result.word.userName = session.getNameForUserId(userId);
      if (!session.hasMultiplePlayers()) {
        this.fulfill(new EndGameForNoPlayersAction(session));
        return true;
      }
      session.advanceCurrentPlayer();
      wordHistory.push(result.word);
      return createTimeoutPromise(session, SPACING_DELAY_IN_MS)
        .then(() => tryShowCurrentState(session))
        .then(() => {
          this.fulfill(new TakeTurnForCurrentPlayerAction(session));
        });
    }

    const removePlayer = session.shouldRemovePlayerForRuleViolations();
    const isSilent = result.possiblyChat && !removePlayer;
    if (!isSilent) {
      this.canTimeout = !removePlayer;
      this.acceptingAnswers = !removePlayer;
      const { rejectionReason } = result;
      return clientDelegate.answerRejected(input, rejectionReason).catch((err) => {
        globals.logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
      }).then(() => {
        if (removePlayer) {
          session.removePlayer(currentPlayerId);
          return createTimeoutPromise(session, SPACING_DELAY_IN_MS).then(() =>
            clientDelegate.removedPlayerForRuleViolation(currentPlayerId)).catch((err) => {
            globals.logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
          }).then(() => createTimeoutPromise(session, SPACING_DELAY_IN_MS))
            .then(() => {
              if (!session.hasMultiplePlayers()) {
                return this.fulfill(new EndGameForNoPlayersAction(session));
              }
              session.advanceCurrentPlayer();
              return tryShowCurrentState(session).then(() =>
                this.fulfill(new TakeTurnForCurrentPlayerAction(session)));
            });
        }
        return undefined;
      }).then(() => 'Rule violation');
    }

    return 'Rule violation';
  }

  stop() {
    if (this.fulfill) {
      this.fulfill();
    }
  }
}

class BotTurnAction extends Action {
  constructor(session, doDelay) {
    super(session);
    if (doDelay) {
      const minWaitInMs = session.getBotTurnMinimumWaitInMs();
      const maxWaitInMs = session.getBotTurnMaximumWaitInMs();
      this.delay = minWaitInMs + Math.floor(Math.random() * (maxWaitInMs - minWaitInMs));
    } else {
      this.delay = 0;
    }
  }

  async do() {
    const session = this.getSession();
    const gameStrategy = this.getGameStrategy();
    const wordHistory = session.getWordHistory();
    const clientDelegate = session.getClientDelegate();
    const nextResult = gameStrategy.getViableNextResult(wordHistory);
    const nextWord = nextResult.word;
    const botUserId = session.getBotUserId();
    const locationId = session.getLocationId();
    nextWord.userId = session.getBotUserId();
    nextWord.userName = BOT_USER_NAME;
    scoreManager.addScore(locationId, botUserId, nextResult.score);

    return Promise.resolve(clientDelegate.botWillTakeTurnIn(this.delay)).catch((err) => {
      globals.logger.logFailure(LOGGER_TITLE, 'Client delegate failed', err);
    }).then(() => createTimeoutPromise(session, this.delay)).then(() => {
      if (!session.hasMultiplePlayers()) {
        return new EndGameForNoPlayersAction(session);
      }
      session.advanceCurrentPlayer();
      wordHistory.push(nextWord);
      return tryShowCurrentState(session).then(() => new TakeTurnForCurrentPlayerAction(session));
    });
  }
}

class StartAction extends Action {
  async do() {
    const session = this.getSession();
    try {
      await session.getClientDelegate().notifyStarting(INITIAL_DELAY_IN_MS);
    } catch (err) {
      globals.logger.logFailure(LOGGER_TITLE, 'Error showing starting message', err);
    }

    const askQuestionAction = new BotTurnAction(session, false);
    return new WaitAction(session, INITIAL_DELAY_IN_MS, askQuestionAction);
  }
}

async function chainActions(locationId, action) {
  const session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!action || !action.do || !session) {
    return undefined;
  }

  state.shiritoriManager.currentActionForLocationId[locationId] = action;

  try {
    const result = await action.do();
    session.clearTimers();
    return chainActions(locationId, result);
  } catch (err) {
    try {
      globals.logger.logFailure(LOGGER_TITLE, 'Error', err);
      await chainActions(locationId, new EndGameForErrorAction(session));
    } catch (innerErr) {
      globals.logger.logFailure(LOGGER_TITLE, 'Error in chainActions. Closing the session.', innerErr);
      await endGame(locationId, EndGameReason.ERROR);
    }

    return END_STATUS_ERROR;
  }
}

function verifySessionNotInProgress(locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already a session in progress there.');
}

/* EXPORT */

function startSession(session, scoreScopeId) {
  const locationId = session.getLocationId();
  scoreManager.registerScoreScopeIdForLocationId(locationId, scoreScopeId);
  verifySessionNotInProgress(locationId);
  setSessionForLocationId(session, locationId);
  scoreManager.registerUsernameForUserId(session.getBotUserId(), BOT_USER_NAME);
  return chainActions(session.getLocationId(), new StartAction(session));
}

function processUserInput(locationId, userId, userName, input) {
  scoreManager.registerUsernameForUserId(userId, userName);
  const currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
  if (!currentAction) {
    return false;
  }
  if (currentAction.tryAcceptUserInput) {
    return currentAction.tryAcceptUserInput(userId, input);
  }
  return false;
}

function stop(locationId, userId) {
  return endGame(locationId, EndGameReason.STOP_COMMAND, { userId });
}

function join(locationId, userId, userName) {
  return joinCommand(locationId, userId, userName);
}

function leave(locationId, userId) {
  return leaveCommand(locationId, userId);
}

function botLeave(locationId, userId) {
  return botLeaveCommand(locationId, userId);
}

function botJoin(locationId, userId) {
  return botJoinCommand(locationId, userId);
}

module.exports = {
  startSession,
  isSessionInProgressAtLocation,
  processUserInput,
  stop,
  join,
  leave,
  botLeave,
  botJoin,
  END_STATUS_ERROR,
  EndGameReason,
};
