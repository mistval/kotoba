'use strict'
const reload = require('require-reload')(require);
const quizManager = require('./../kotoba/quiz/manager.js');
const Session = require('./../kotoba/quiz/session.js');
const DeckCollection = require('./../kotoba/quiz/deck_collection.js');
const DeckLoader = require('./../kotoba/quiz/deck_loader.js');
const normalGameMode = require('./../kotoba/quiz/normal_mode.js');
const socketIo = require('socket.io');
const MAX_GAMES = 50;

const roomInformationForRoomId = {};
const userNameForUserId = {};

const LOGGER_TITLE = 'WEB QUIZ';

function generateRoomId() {
  // HACK: In theory this may not be unique.
  return Math.floor(Math.random() * 1000) + '' + Math.floor(Date.now() / 10);
}

class WebSocketMessageSender {
  constructor(sio, roomId, logger) {
    this.roomId_ = roomId;
    this.sio_ = sio;
    this.emitBuffer_ = [];
    this.logger_ = logger;
  }

  notifyStarting(inMs, quizName, quizArticle) {
    this.logger_.logSuccess(LOGGER_TITLE, 'Starting web quiz ' + this.roomId_);
  }

  showWrongAnswer(card, skipped) {
    this.emit_('timeout', {
      answers: card.answer,
      meaning: card.meaning,
      skipped: skipped,
    });
  }

  outputQuestionScorers(card, answerersInOrder, answersForUser, pointsForAnswer, scoreForUserId) {
    let userNames = answerersInOrder.map(id => userNameForUserId[id]);
    this.emit_('correct', {
      answers: card.answer,
      meaning: card.meaning,
      userNames,
    });
    this.emitScores(scoreForUserId);
  }

  emitScores(scoreForUserId) {
    this.sio_.in(this.roomId_).clients((error, clients) => {
      if (error) {
        this.logger_.logFailure(LOGGER_TITLE, 'Error getting clients', error);
      } else {
        let scoreForUserName = {};
        for (let userId of clients) {
          let score = scoreForUserId[userId] || 0;
          scoreForUserName[userNameForUserId[userId]] = score;
        }
        this.emit_('scores', scoreForUserName);
      }
    });
  }

  showQuestion(question, questionId) {
    this.emit_('new question', {question});
  }

  notifySaveSuccessful() {
    assert('Save is not supported on web');
  }

  notifySaveFailedNoSpace(maxSaves) {
    assert('Save is not supported on web');
  }

  notifySaveFailedIsReview() {
    assert('Save is not supported on web');
  }

  notifySaving() {
    assert('Save is not supported on web');
  }

  notifySaveFailedNotOwner() {
   assert('Save is not supported on web');
  }

  notifyQuizEndedScoreLimitReached(quizName, scoreForUserId, unansweredQuestions, aggregateLink, canReview, scoreLimit) {
    this.emit_('chat message', {
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      canReview,
      scoreLimit,
    });
    this.emitScores(scoreForUserId);
  }

  notifyQuizEndedUserCanceled(quizName, scoreForUserId, unansweredQuestions, aggregateLink, canReview, cancelingUserId) {
    this.emit_('chat message', {
      quizName,
      scoreForUserId,
      unansweredQuestions,
      aggregateLink,
      canReview,
      cancelingUserId,
    });
    this.emitScores(scoreForUserId);
  }

  notifyQuizEndedTooManyWrongAnswers(quizName, scoreForUserId, unansweredQuestions, aggregateLink, canReview, wrongAnswers) {
    this.logger_.logFailure(LOGGER_TITLE, 'Too many wrong answers');
    this.emit_('ended too many wrong answers', {
      quizName,
      scoreForUserId,
      unansweredQuestions,
      aggregateLink,
      canReview,
      wrongAnswers,
    });
    this.emitScores(scoreForUserId);
  }

  notifyQuizEndedError(quizName, scoreForUserId, unansweredQuestions, aggregateLink, canReview) {
    this.emit_('ended for error', {
      quizName,
      scoreForUserId,
      unansweredQuestions,
      aggregateLink,
      canReview,
    });
    this.emitScores(scoreForUserId);
  }

  notifyQuizEndedNoQuestionsLeft(quizName, scoreForUserId, unansweredQuestions, aggregateLink, canReview, gameMode) {
    this.emit_('ended no questions left', {
      quizName,
      scoreForUserId,
      unansweredQuestions,
      aggregateLink,
      canReview,
    });
    this.emitScores(scoreForUserId);
  }

  notifyStoppingAllQuizzes(quizName, scoreForUserId, unansweredQuestions, aggregateLink, canReview) {
    this.emit_('stopping all', {
      quizName,
      scoreForUserId,
      unansweredQuestions,
      aggregateLink,
      canReview,
    });
    this.emitScores(scoreForUserId);
  }

  notifyStopFailedUserNotAuthorized() {
    this.emit_('chat message', 'u cant stop it');
  }

  emitBufferToSocket(socket) {
    for (let emit of this.emitBuffer_) {
      socket.emit(emit.event, emit.data);
    }
  }

  broadcast(msg) {
    this.sio_.in(this.roomId_).emit('broadcast', msg);
  }

  emit_(event, data) {
    this.sio_.in(this.roomId_).emit(event, data);
    this.emitBuffer_.push({event, data});
    if (this.emitBuffer_.length > 50) {
      this.emitBuffer_.shift();
    }
  }
}

class RoomInformation {
  constructor(sio, roomId, deckNames, privateGame, logger) {
    this.messageSender = new WebSocketMessageSender(sio, roomId, logger);
    this.deckNames = deckNames;
    this.creatorName = '';
    this.private = privateGame;
  }
}

async function createRoom(sio, config, logger) {
  const deckInformations = config.decks.map(deckName => {
    return {
      deckNameOrUniqueId: deckName,
    };
  });

  const decksStatus = await DeckLoader.getQuizDecks(deckInformations);
  const decks = decksStatus.decks;

  if (!decks || decks.length === 0) {
    return;
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

  const roomId = generateRoomId();
  const roomInformation = new RoomInformation(sio, roomId, config.decks, config.private, logger);
  roomInformationForRoomId[roomId] = roomInformation;
  const session = Session.createNew(roomId, undefined, deckCollection, roomInformation.messageSender, undefined, settings, normalGameMode);
  quizManager.startSession(session, roomId);
  return roomId;
}

function processInput(roomId, userId, message) {
  quizManager.processUserInput(roomId, userId, userNameForUserId[userId], message);
}

function emitRoomHistoryToSocket(roomId, socket) {
  let roomInformation = roomInformationForRoomId[roomId];
  if (roomInformation) {
    roomInformation.messageSender.emitBufferToSocket(socket);
  }
}

function closeRoomIfEmpty(io, roomId, logger) {
  io.in(roomId).clients((error, clients) => {
    if (error) {
      logger.logFailure(LOGGER_TITLE, 'Error closing room', error);
    } else {
      if (clients.length <= 0) {
        quizManager.stopQuiz(roomId, null, true);
        delete roomInformationForRoomId[roomId];
        logger.logSuccess(LOGGER_TITLE, 'Games running: ' + Object.keys(roomInformationForRoomId).length);
      }
    }
  });
}

function onReceivedChatMessage(io, socket, roomId, msg, logger) {
  try {
    socket.to(roomId).emit('chat message', {
      msg,
      userName: userNameForUserId[socket.id],
    });
    processInput(roomId, socket.id,  msg);
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error on receive chat message', err);
  }
}

function onDisconnect(io, socket, roomId, userId, userName, logger) {
  try {
    delete userNameForUserId[userId];
    closeRoomIfEmpty(io, roomId, logger);

    socket.to(roomId).emit('chat message', {
      msg: userName + ' has left the game.',
      userName: 'System',
    });
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error on disconnect', err);
  }
}

function onJoin(io, socket, roomId, userId, userName, logger) {
  if (!roomInformationForRoomId[roomId]) {
    socket.emit('no such room');
  } else {
    io.in(roomId).clients((err, clients) => {
      if (err) {
        logger.logFailure(LOGGER_TITLE, 'Error getting clients', err);
      } else {
        if (!/^[a-zA-Z0-9]{1,20}$/.test(userName)) {
          userName = 'Player';
        }
        let newUserName = userName;
        for (let i = 2; clients.some(userId => userNameForUserId[userId] === newUserName); ++i) {
          newUserName = userName + ' ' + i;
        }
        userName = newUserName;
      }
      socket.join(roomId);
      userNameForUserId[userId] = userName;
      emitRoomHistoryToSocket(roomId, socket);

      if (roomInformationForRoomId[roomId] && !roomInformationForRoomId[roomId].creatorName) {
        roomInformationForRoomId[roomId].creatorName = userName;
        roomInformationForRoomId[roomId].messageSender.emitScores({});
        socket.emit('chat message', {
          msg: 'Your friends can join you with this link: http://kotobaweb.com/game.html?id=' + roomId,
          userName: 'System',
        });
      }

      socket.to(roomId).emit('chat message', {
        msg: userName + ' has joined the game.',
        userName: 'System',
      });

      socket.on('disconnect', function() {
        onDisconnect(io, socket, roomId, userId, userName, logger);
      });

      socket.on('skip', function() {
        quizManager.skip(roomId);
      });

      // TODO: Chat messages should be in the room history
      socket.on('chat message', function(msg) {
        onReceivedChatMessage(io, socket, roomId, msg, logger);
      });
    });
  }
}

function onCreate(io, socket, config, logger) {
  try {
    let roomsRunningCount = Object.keys(roomInformationForRoomId).length;
    if (roomsRunningCount >= MAX_GAMES) {
      logger.logFailure(LOGGER_TITLE, 'TOO MANY GAMES RUNNING');
    } else {
      logger.logSuccess(LOGGER_TITLE, 'Creating game. Games running: ' + (roomsRunningCount + 1));
      createRoom(io, config, logger).then(roomId => {
        socket.emit('room created', roomId);
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error creating room', err);
      });
    }
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error creating game', err);
  }
}

function onRequestGames(socket, logger) {
  try {
    let currentGamesInformation = Object.keys(roomInformationForRoomId).filter(roomId => {
      return !roomInformationForRoomId[roomId].private;
    }).map(roomId => {
      return {
        roomId: roomId,
        creatorName: roomInformationForRoomId[roomId].creatorName,
        decks: roomInformationForRoomId[roomId].deckNames,
      };
    });
    socket.emit('current games', currentGamesInformation);
  } catch(err) {
    logger.logFailure(LOGGER_TITLE, 'Error fetching games', err);
  }
}

function broadcast(msg) {
  let roomInformations = Object.values(roomInformationForRoomId);
  for (let roomInformation of roomInformations) {
    roomInformation.messageSender.broadcast(msg);
  }
}

function init(monochrome, httpServer) {
  const io = socketIo(httpServer);
  const logger = monochrome.getLogger();

  io.on('connection', function(socket){
    let userId = socket.id;

    socket.on('request games', function() {
      onRequestGames(socket, logger);
    });

    socket.on('create', function(config) {
      onCreate(io, socket, config, logger);
    });

    socket.on('join', function(roomId, userName) {
      onJoin(io, socket, roomId, userId, userName, logger);
    });
  });
}

module.exports.init = init;
module.exports.broadcast = broadcast;

// TODO Catch stuff to keep the server from crashing
