/*
 * I don't like reaching into the react source to reference these,
 * but create-react-app won't allow requiring anything outside of its
 * src directory and its minifier hates symlinks.
 */

/*
 * TODO: A lot of this code is quite similar to the kanji game server code.
 * Consider single-sourcing more of it before adding any further WS games.
 */

const EventEmitter = require('events');
const shiritoriManager = require('shiritori');
const assert = require('assert');
const NAMESPACE = require('./../common/socket_namespaces.js').SHIRITORI;
const events = require('./../common/shiritori/socket_events.js');
const AvatarPool = require('../game_common/avatar_pool.js');

const MAX_TIMEOUT_MS = 300000;
const MIN_TIMEOUT_MS = 5000;
const BOT_TURN_WAIT_MIN_MS = 2000;
const BOT_TURN_WAIT_MAX_MS = 5000;
const MAX_BOT_SCORE_MULTIPLIER = 1;
const MIN_BOT_SCORE_MULTIPLIER = 0;
const MULTIPLAYER_CLOSE_DELAY_MS = 300000;
const MAX_EVENT_HISTORY_LENGTH = 50;
const ROOM_READY_EVENT = 'room ready';
const ROOM_CLOSED_EVENT = 'room closed';
const USERNAME_MAX_LENGTH_UNPREFIXED = 20;

const roomForRoomID = {};

const botUsernames = [
  'Kotoba (Bot)',
  'BottyMcBotface (Bot)',
  'OptimusPrime (Bot)',
];

class Player {
  constructor(username, avatar, bot) {
    this.username = username;
    this.score = 0;
    this.active = true;
    this.present = true;
    this.avatar = avatar;
    this.bot = bot;
  }
}

class Room extends EventEmitter {
  constructor(ID, sockets, config) {
    super();
    this.roomID = ID;
    this.sockets = sockets;
    this.isPrivate = config.private;
    this.playerInfoForUsername = {};
    this.eventHistory = [];
    this.avatarPool = new AvatarPool();
    this.lastKnownScores = {};
    this.lastKnownPlayerTurnSequence = [];
    this.ownerUsername = '';

    shiritoriManager.createGame(ID, this, config);

    for (let i = 0; i < config.botPlayers; i += 1) {
      const botUsername = botUsernames[i];
      const botAvatar = this.avatarPool.getAvailableAvatar();
      const botPlayer = new Player(botUsername, botAvatar, true);

      this.playerInfoForUsername[botUsername] = botPlayer;

      shiritoriManager.addBotPlayer(ID, botUsername);
    }
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

  updateAndEmitPlayerList() {
    if (shiritoriManager.gameExists(this.roomID)) {
      const scores = shiritoriManager.getScores(this.roomID);
      this.lastKnownScores = scores;
      const playerTurnSequence = shiritoriManager.getPlayerTurnSequence(this.roomID);
      this.lastKnownPlayerTurnSequence = playerTurnSequence;
    }

    const players = this.lastKnownPlayerTurnSequence.map(
      username => this.playerInfoForUsername[username],
    );

    // I want the player class to be a simple struct so it can be serialized.
    // Therefore no getters/setters.
    /* eslint-disable-next-line no-param-reassign */
    players.forEach((player) => { player.score = this.lastKnownScores[player.username]; });

    Object.values(this.playerInfoForUsername).filter(
      player => this.lastKnownPlayerTurnSequence.indexOf(player.username) === -1,
    ).forEach(player => players.push(player));

    this.emitEventToAll(events.Server.PLAYER_LIST, players);
  }

  coerceUsername(desiredUsername) {
    let coercedUsername = desiredUsername;

    if (!coercedUsername) {
      coercedUsername = 'Anonymous';
    }

    coercedUsername = coercedUsername.substr(0, USERNAME_MAX_LENGTH_UNPREFIXED);

    if (!this.playerInfoForUsername[desiredUsername]) {
      return coercedUsername;
    }

    let index = 1;
    while (true) {
      coercedUsername = index === 0 ? coercedUsername : `${coercedUsername}${index}`;
      if (!this.playerInfoForUsername[coercedUsername]) {
        return coercedUsername;
      }

      index += 1;
    }
  }

  addPlayer(socket, desiredUsername) {
    const existingPlayerInfo = this.playerInfoForUsername[desiredUsername];

    let player;
    if (!existingPlayerInfo || existingPlayerInfo.present) {
      const coercedUsername = this.coerceUsername(desiredUsername);
      const avatar = this.avatarPool.getAvailableAvatar();
      player = new Player(coercedUsername, avatar, false);
      this.playerInfoForUsername[coercedUsername] = player;
    } else if (!existingPlayerInfo.present) {
      existingPlayerInfo.present = true;
      player = existingPlayerInfo;
    } else {
      assert(false, 'Unexpected branch');
    }

    if (shiritoriManager.gameExists(this.roomID)) {
      shiritoriManager.addRealPlayer(this.roomID, player.username);
    }

    if (!this.ownerUsername) {
      this.ownerUsername = player.username;
    }

    socket.join(this.roomID);

    socket.emit(events.Server.USERNAME_ASSIGNED, player.username);
    this.eventHistory.forEach((historicalEvent) => {
      socket.emit(historicalEvent.eventName, historicalEvent.data);
    });

    this.emitEventFromSender(socket, events.Server.PLAYER_JOINED, player);
    this.updateAndEmitPlayerList();

    socket.on(events.Client.CHAT, (text) => {
      try {
        if (!text) {
          return;
        }
        this.emitEventFromSender(socket, events.Server.CHAT, { text, ...player });
        shiritoriManager.receiveInput(this.roomID, player.username, text);
      } catch (err) {
        console.warn(err);
      }
    });

    socket.on('disconnect', () => {
      try {
        player.present = false;
        player.active = false;
        this.avatarPool.markAvatarAvailable(player.avatar);
        this.emitEventFromSender(socket, events.Server.PLAYER_LEFT, player);
        this.updateAndEmitPlayerList();

        if (shiritoriManager.gameExists(this.roomID)) {
          shiritoriManager.setPlayerInactive(this.roomID, player.username);
        }
      } catch (err) {
        console.warn(err);
      }
    });

    if (shiritoriManager.gameExists(this.roomID)) {
      // If already started, this is a NOOP.
      shiritoriManager.startGame(this.roomID);
    }
  }

  /* Shiritori game engine observer delegates */

  onGameEnded(reason, args) {
    if (reason === shiritoriManager.EndGameReason.ERROR) {
      console.warn('Game ended due to error');
      console.warn(args);
    }

    const nonBotPlayerCount = Object.values(this.playerInfoForUsername).reduce(
      (sum, player) => sum + (!player.bot && player.present ? 1 : 0),
      0,
    );

    const roomCloseDelayMs = nonBotPlayerCount > 1 ? MULTIPLAYER_CLOSE_DELAY_MS : 0;
    this.emitEventToAll(events.Server.GAME_ENDED, { reason, roomCloseDelayMs });

    setTimeout(() => {
      this.emitEventToAll(events.Server.ROOM_CLOSED);

      Object.values(this.sockets.in(this.roomID).connected).forEach(
        client => client.leave(this.roomID),
      );

      delete roomForRoomID[this.roomID];
      this.emit(ROOM_CLOSED_EVENT);
    }, roomCloseDelayMs);
  }

  onAwaitingInputFromPlayer(username, previousAnswer) {
    this.emitEventToAll(events.Server.WAITING_FOR_ANSWER_FROM_USER, {
      username,
      startsWith: previousAnswer ? previousAnswer.nextWordMustStartWith : undefined,
    });
  }

  onPlayerSetInactive(username) {
    const player = this.playerInfoForUsername[username];
    player.active = false;

    if (player.present) {
      this.emitEventToAll(events.Server.PLAYER_SET_INACTIVE, username);
      this.updateAndEmitPlayerList();
    }
  }

  onPlayerSkipped(username) {
    this.emitEventToAll(events.Server.PLAYER_SKIPPED, username);
  }

  onPlayerAnswered(username, wordInformation) {
    const playerInfo = this.playerInfoForUsername[username];
    if (playerInfo.bot) {
      this.emitEventToAll(events.Server.CHAT, {
        username,
        text: wordInformation.word,
        avatar: playerInfo.avatar,
      });
    }

    this.emitEventToAll(events.Server.PLAYER_ANSWERED, wordInformation);
    this.updateAndEmitPlayerList();
  }

  onPlayerReactivated(username) {
    const playerInfo = this.playerInfoForUsername[username];
    playerInfo.active = true;
    this.emitEventToAll(events.Server.PLAYER_REACTIVATED, username);
    this.updateAndEmitPlayerList();
  }

  onAnswerRejected(username, answer, reason, extraData) {
    this.emitEventToAll(events.Server.ANSWER_REJECTED, {
      username,
      answer,
      reason,
      extraData,
    });
  }

  onNewPlayerAdded() {
    // NOOP
  }
}

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

function coerceRange(min, max, value) {
  const coercedValue = value || 0;
  return Math.max(Math.min(max, coercedValue), min);
}

function coerceConfig(desiredConfig) {
  const coercedConfig = {};

  coercedConfig.singlePlayerTimeoutMs = coerceRange(
    MIN_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
    desiredConfig.timeoutMs,
  );

  coercedConfig.multiPlayerTimeoutMs = coerceRange(
    MIN_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
    desiredConfig.timeoutMs,
  );

  coercedConfig.botTurnMinimumWaitInMs = BOT_TURN_WAIT_MIN_MS;
  coercedConfig.botTurnMaximumWaitInMs = BOT_TURN_WAIT_MAX_MS;

  coercedConfig.botScoreMultiplier = coerceRange(
    MIN_BOT_SCORE_MULTIPLIER,
    MAX_BOT_SCORE_MULTIPLIER,
    desiredConfig.botScoreMultiplier,
  );

  coercedConfig.botPlayers = coerceRange(0, 3, desiredConfig.botPlayers);

  coercedConfig.private = !!desiredConfig.private;
  coercedConfig.autoRejoin = true;

  return coercedConfig;
}

function createRoom(desiredConfig, sockets) {
  const coercedConfig = coerceConfig(desiredConfig);

  const roomID = generateUniqueID();
  const room = new Room(roomID, sockets, coercedConfig);

  return room;
}

function emitAvailableGames(socket) {
  const roomInfos = Object.values(roomForRoomID).filter(room => !room.isPrivate && room.ownerUsername).map(room => ({
    ID: room.roomID,
    ownerUsername: room.ownerUsername,
  }));

  socket.emit(events.Server.GAMES_LIST, roomInfos);
}

function registerCreate(sockets, socket) {
  socket.on(events.Client.CREATE_GAME, (config) => {
    try {
      const room = createRoom(config, sockets, socket);
      roomForRoomID[room.roomID] = room;
      socket.emit(events.Server.CREATED_GAME, room.roomID);

      room.on(ROOM_READY_EVENT, () => {
        emitAvailableGames(sockets);
      });

      room.on(ROOM_CLOSED_EVENT, () => {
        emitAvailableGames(sockets);
      });
    } catch (err) {
      console.warn(err);
    }
  });
}

function registerJoin(socket) {
  socket.on(events.Client.JOIN_GAME, (args) => {
    try {
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
    } catch (err) {
      console.warn(err);
    }
  });
}

function startListen(sockets) {
  const socketNamespace = sockets.of(NAMESPACE);

  socketNamespace.on('connection', (socket) => {
    try {
      registerCreate(socketNamespace, socket);
      registerJoin(socket);
      emitAvailableGames(socket);
    } catch (err) {
      console.warn(err);
    }
  });
}

module.exports = {
  startListen,
};
