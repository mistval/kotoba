const assert = require('assert');
const EventEmitter = require('events');
const quizManager = require('./common/manager.js');
const Session = require('./common/session.js');
const DeckCollection = require('./common/deck_collection.js');
const DeckLoader = require('./common/deck_loader.js');
const normalGameMode = require('./common/normal_mode.js');
const AvatarPool = require('../game_common/avatar_pool.js');

/*
 * I don't like reaching into the react source to reference these,
 * but create-react-app won't allow requiring anything outside of its
 * src directory and its minifier hates symlinks.
 */
const events = require('./../common/kanji_game/socket_events.js');
const { GameEndReason } = require('./../common/kanji_game/socket_event_enums.js');
const namespace = require('./../common/socket_namespaces.js').KANJI_GAME;

const MAX_EVENT_HISTORY_LENGTH = 50;
const MULTIPLAYER_CLOSE_DELAY_MS = 300000;
const roomForRoomID = {};
const ROOM_READY_EVENT = 'room ready';
const ROOM_CLOSED_EVENT = 'room closed';
const USERNAME_MAX_LENGTH_UNPREFIXED = 20;

let uniqueIDIndex = 0;

// Considered using UUIDs for this but they were longer than I'd like,
// since this is exposed to the user in the game join URI.
// This algorithm will generate unique IDs that are sufficiently
// unguessable for this application.
function generateUniqueID() {
  const randomNumber = Math.floor(Math.random() * 10000000);
  uniqueIDIndex += 1;
  return `${randomNumber}a${uniqueIDIndex}`;
}

function emitAvailableGames(socket) {
  const roomInfos = Object.values(roomForRoomID).filter(room => !room.isPrivate).map(room => ({
    ID: room.roomID,
    decks: room.decks,
    ownerUsername: room.ownerUsername,
  }));

  socket.emit(events.Server.GAMES_LIST, roomInfos);
}

class UserInfo {
  constructor(username, avatar, userID) {
    this.username = username;
    this.avatar = avatar;
    this.userID = userID;
  }
}

class Room extends EventEmitter {
  constructor(roomID, sockets, isPrivate, decks) {
    super();

    this.isPrivate = isPrivate;
    this.decks = decks;
    this.roomID = roomID;
    this.sockets = sockets;
    this.eventHistory = [];
    this.userInfoForSocketID = {};
    this.latestInternalScores = {};
    this.unansweredQuestions = [];
    this.userInfoForDepartedPlayerUsername = {};
    this.avatarPool = new AvatarPool();
    this.nextUserID = 0;

    roomForRoomID[roomID] = this;
  }

  getUserInfoForUserID() {
    const userInfoForUserID = {};
    Object.values(this.userInfoForSocketID).forEach((userInfo) => {
      userInfoForUserID[userInfo.userID] = userInfo;
    });

    return userInfoForUserID;
  }

  addEventToHistory(eventName, data) {
    this.eventHistory.push({ eventName, data });
    if (this.eventHistory.length > MAX_EVENT_HISTORY_LENGTH) {
      this.eventHistory.shift();
    }
  }

  emitEventToAll(eventName, data) {
    this.sockets.in(this.roomID).emit(eventName, data);
    this.addEventToHistory(eventName, data);
  }

  emitEventFromSender(socket, eventName, data) {
    socket.to(this.roomID).emit(eventName, data);
    this.addEventToHistory(eventName, data);
  }

  usernameTaken(username) {
    return Object.values(this.userInfoForSocketID).some(userInfo => userInfo.username === username);
  }

  coerceUsername(desiredUsername) {
    let coercedUsername = desiredUsername;

    if (!coercedUsername) {
      coercedUsername = 'Anonymous';
    }

    coercedUsername = coercedUsername.substr(0, USERNAME_MAX_LENGTH_UNPREFIXED);

    if (!this.usernameTaken(coercedUsername)) {
      return coercedUsername;
    }

    let index = 1;
    while (true) {
      coercedUsername = index === 0 ? coercedUsername : `${coercedUsername}${index}`;
      if (!this.usernameTaken(coercedUsername)) {
        return coercedUsername;
      }

      index += 1;
    }
  }

  createUserInfoForJoiningSocket(socket, username) {
    const coercedUsername = this.coerceUsername(username);

    const departedUserInfo = this.userInfoForDepartedPlayerUsername[coercedUsername];
    let newUserInfo;
    if (departedUserInfo) {
      const avatar = this.avatarPool.tryRecoverAvatar(departedUserInfo.avatar);
      const { userID } = departedUserInfo;
      newUserInfo = new UserInfo(coercedUsername, avatar, userID);
    } else {
      const avatar = this.avatarPool.getAvailableAvatar();
      newUserInfo = new UserInfo(coercedUsername, avatar, this.nextUserID);
      this.nextUserID += 1;
    }

    return newUserInfo;
  }

  addPlayer(socket, desiredUsername) {
    const userInfo = this.createUserInfoForJoiningSocket(socket, desiredUsername);

    if (!this.ownerUsername) {
      this.ownerUsername = userInfo.username;
      this.emit(ROOM_READY_EVENT);
    }

    socket.join(this.roomID);
    this.userInfoForSocketID[socket.id] = userInfo;

    socket.on(events.Client.SKIP, () => {
      quizManager.skip(this.roomID);
    });

    socket.on(events.Client.CHAT, (text) => {
      if (!text) {
        return;
      }
      this.emitEventFromSender(socket, events.Server.CHAT, { text, ...userInfo });
      const { userID, username } = this.userInfoForSocketID[socket.id];
      quizManager.processUserInput(this.roomID, userID, username, text);
    });

    socket.on('disconnect', () => {
      this.removePlayer(socket);
    });

    // HACK: Without this, a client using Chrome in Android often doesn't
    // get these events. It's not clear why, and this isn't meant to be a
    // permanent solution.
    setTimeout(() => {
      socket.emit(events.Server.AVATAR_ASSIGNED, userInfo.avatar);

      this.eventHistory.forEach((historicalEvent) => {
        socket.emit(historicalEvent.eventName, historicalEvent.data);
      });

      this.emitLatestScores();
      this.emitEventFromSender(socket, events.Server.PLAYER_JOINED, userInfo);
    }, 1000);
  }

  removePlayer(socket) {
    const userInfo = this.userInfoForSocketID[socket.id];
    this.userInfoForDepartedPlayerUsername[userInfo.username] = userInfo;
    this.avatarPool.markAvatarAvailable(userInfo.avatar);
    this.emitEventFromSender(socket, events.Server.PLAYER_LEFT, userInfo);
    socket.leave(this.roomID);
    delete this.userInfoForSocketID[socket.id];
    this.emitLatestScores();

    setTimeout(() => this.closeIfEmpty(), 60000);
  }

  empty() {
    return !Object.keys(this.userInfoForSocketID)[0];
  }

  closeIfEmpty() {
    if (this.empty()) {
      quizManager.stopQuiz(this.roomID, undefined, true);
    }
  }

  handleGameEnded(reason, unansweredQuestions) {
    const roomCloseDelayMs = Object.keys(this.userInfoForSocketID)[1]
      ? MULTIPLAYER_CLOSE_DELAY_MS : 0;

    this.emitEventToAll(events.Server.GAME_ENDED, {
      reason,
      unansweredQuestions,
      roomCloseDelayMs,
    });

    setTimeout(() => {
      this.emitEventToAll(events.Server.ROOM_CLOSED);
      Object.keys(this.userInfoForSocketID).forEach((socketID) => {
        const unqualifiedSocketID = socketID.replace(`${namespace}#`, '');
        const client = this.sockets.in(this.roomID).connected[unqualifiedSocketID];

        if (client) {
          client.leave(this.roomID);
        }
      });

      delete roomForRoomID[this.roomID];
      this.emit(ROOM_CLOSED_EVENT);
    }, roomCloseDelayMs);
  }

  emitLatestScores() {
    const scoreForUsername = {};
    const avatarForUsername = {};
    Object.keys(this.userInfoForSocketID).forEach((socketID) => {
      const { username, userID, avatar } = this.userInfoForSocketID[socketID];
      scoreForUsername[username] = this.latestInternalScores[userID]
        ? this.latestInternalScores[userID].normalizedScore
        : 0;
      avatarForUsername[username] = avatar;
    });

    this.emitEventToAll(events.Server.SCORE_UPDATE, { scoreForUsername, avatarForUsername });
  }

  /*
   * Client delegate callbacks
   */

  notifyStarting() {
  }

  showWrongAnswer(card, skipped) {
    this.unansweredQuestions.push({ question: card.question, dictionaryLink: card.dictionaryLink });
    this.emitEventToAll(events.Server.UNANSWERED, {
      question: card.question,
      answers: card.answer,
      meaning: card.meaning,
      skipped,
      dictionaryLink: card.dictionaryLink,
    });
    this.emitEventToAll(events.Server.UNANSWERED_QUESTIONS_LIST, this.unansweredQuestions);
  }

  outputQuestionScorers(card, answerersInOrder, answersForUser, pointsForAnswer, scoreForUserID) {
    const userInfoForUserID = this.getUserInfoForUserID();
    const usernames = answerersInOrder.map(userID => userInfoForUserID[userID].username);
    this.emitEventToAll(events.Server.ANSWERED, {
      question: card.question,
      answers: card.answer,
      meaning: card.meaning,
      answerers: usernames,
      dictionaryLink: card.dictionaryLink,
    });

    this.latestInternalScores = scoreForUserID;
    this.emitLatestScores();
  }

  showQuestion(question) {
    this.emitEventToAll(events.Server.NEW_QUESTION, question);
  }

  notifySaveSuccessful() {
    assert(false, 'Save is not supported on web');
  }

  notifySaveFailedNoSpace() {
    assert(false, 'Save is not supported on web');
  }

  notifySaveFailedIsReview() {
    assert(false, 'Save is not supported on web');
  }

  notifySaving() {
    assert(false, 'Save is not supported on web');
  }

  notifySaveFailedNotOwner() {
    assert(false, 'Save is not supported on web');
  }

  notifyQuizEndedScoreLimitReached() {
    assert(false, 'No score limit for web games');
  }

  notifyQuizEndedUserCanceled(
    quizName,
    scoreForUserID,
    unansweredQuestions,
  ) {
    return this.handleGameEnded(GameEndReason.NO_USERS, unansweredQuestions);
  }

  notifyQuizEndedTooManyWrongAnswers(
    quizName,
    scoreForUserId,
    unansweredQuestions,
  ) {
    return this.handleGameEnded(GameEndReason.TOO_MANY_UNANSWERED_QUESTIONS, unansweredQuestions);
  }

  notifyQuizEndedError(quizName, scoreForUserId, unansweredQuestions) {
    return this.handleGameEnded(GameEndReason.ERROR, unansweredQuestions);
  }

  notifyQuizEndedNoQuestionsLeft(unansweredQuestions) {
    return this.handleGameEnded(GameEndReason.NO_QUESTIONS_LEFT, unansweredQuestions);
  }

  notifyStoppingAllQuizzes(quizName, scoreForUserId, unansweredQuestions) {
    return this.handleGameEnded(GameEndReason.MAINTENANCE, unansweredQuestions);
  }

  notifyStopFailedUserNotAuthorized() {
    assert(false, 'no way to stop from web');
  }
}

async function createRoom(config, sockets) {
  const deckInformations = config.decks.map(deckName => ({
    deckNameOrUniqueId: deckName,
  }));

  const decksStatus = await DeckLoader.getQuizDecks(deckInformations);
  const { decks } = decksStatus;

  if (!decks || decks.length === 0) {
    return undefined;
  }

  const deckCollection = DeckCollection.createNewFromDecks(decks, normalGameMode);

  const settings = {
    scoreLimit: Number.MAX_SAFE_INTEGER,
    unansweredQuestionLimit: 10,
    answerTimeLimitInMs: Math.min(Math.max(config.answerTimeLimitInMs, 5000), 180000),
    newQuestionDelayAfterUnansweredInMs: 500,
    newQuestionDelayAfterAnsweredInMs: 500,
    additionalAnswerWaitTimeInMs: Math.max(Math.min(config.answerForgivenessWindow, 10000), 0),
  };

  const roomID = generateUniqueID();
  const room = new Room(roomID, sockets, config.private, config.decks);

  const session = Session.createNew(
    roomID,
    undefined,
    deckCollection,
    room,
    undefined,
    settings,
    normalGameMode,
  );

  quizManager.startSession(session, roomID);

  return room;
}

function registerCreate(sockets, socket) {
  socket.on(events.Client.CREATE_GAME, (config) => {
    createRoom(config, sockets, socket).then((room) => {
      if (!room) {
        return;
      }
      socket.emit(events.Server.CREATED_GAME, room.roomID);

      room.on(ROOM_READY_EVENT, () => {
        emitAvailableGames(sockets);
      });

      room.on(ROOM_CLOSED_EVENT, () => {
        emitAvailableGames(sockets);
      });
    }).catch((err) => {
      console.warn(err);
    });
  });
}

function registerJoin(socket) {
  socket.on(events.Client.JOIN_GAME, (args) => {
    if (!args) {
      return;
    }

    const { gameID, username } = args;
    if (!gameID) {
      return;
    }

    const game = roomForRoomID[gameID];
    if (!game) {
      socket.emit(events.Server.NO_SUCH_GAME);
    } else {
      game.addPlayer(socket, username);
    }
  });
}

function startListen(sockets) {
  const socketNamespace = sockets.of(namespace);

  socketNamespace.on('connection', (socket) => {
    registerCreate(socketNamespace, socket);
    registerJoin(socket);
    emitAvailableGames(socket);
  });
}

module.exports = {
  startListen,
};
