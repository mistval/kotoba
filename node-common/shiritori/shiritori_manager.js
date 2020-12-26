// The classes are just structs so they can be
// easily serialized if save feature is added.
// Therefore they need to be manipulated by outside forces.
/* eslint no-param-reassign: 0 */

// The game engine is a run loop.
/* eslint no-await-in-loop: 0 */

const assert = require('assert');
const JapaneseGameStrategy = require('./japanese_game_strategy.js');
const playerTurnInputLoop = require('./player_input_loop.js');

const EndGameReason = {
  NO_PLAYERS: 'no players',
  EXTERNAL_STOP_REQUEST: 'external stop request',
  ERROR: 'error',
};

const PlayerSetInactiveReason = {
  AFK: 'afk',
  EXTERNAL_LEAVE_REQUEST: 'external leave request',
};

class Player {
  constructor(playerID, bot) {
    this.ID = playerID;
    this.bot = bot;
    this.active = true;
    this.rawScore = 0;
  }
}

class Game {
  constructor(gameID, delegate, config, resourceDatabase) {
    this.ID = gameID;
    this.started = false;
    this.ended = false;
    this.delegate = delegate;
    this.playerTurnSequence = [];
    this.currentPlayerIndex = 0;
    this.config = config;
    this.answerHistory = [];
    this.strategy = new JapaneseGameStrategy(resourceDatabase);
  }
}

const gameForGameID = {};

function gameExists(gameID) {
  return !!gameForGameID[gameID];
}

function gameContainsPlayer(game, playerID) {
  return !!game.playerTurnSequence.some(player => player.ID === playerID);
}

function isGameEmpty(game) {
  for (let i = 0; i < game.playerTurnSequence.length; i += 1) {
    const player = game.playerTurnSequence[i];
    if (player.active && (!player.bot || game.config.allowOnlyBots)) {
      return false;
    }
  }

  return true;
}

function advanceCurrentPlayer(game) {
  if (isGameEmpty(game)) {
    return;
  }

  do {
    game.currentPlayerIndex += 1;
    if (game.currentPlayerIndex >= game.playerTurnSequence.length) {
      game.currentPlayerIndex = 0;
    }
  } while (!game.playerTurnSequence[game.currentPlayerIndex].active);
}

async function endGame(gameID, reason, args) {
  if (!gameExists(gameID)) {
    return;
  }

  const game = gameForGameID[gameID];
  try {
    await game.delegate.onGameEnded(reason, args);
  } catch (err) {
    console.warn(`Error in onGameEnded callback.`);
    console.warn(err);
  }

  game.ended = true;

  const currentPlayer = game.playerTurnSequence[game.currentPlayerIndex];

  if (currentPlayer) {
    playerTurnInputLoop.abortWait(game.ID, currentPlayer.ID);
  }

  delete gameForGameID[gameID];
}

async function gameLoop(game) {
  game.started = true;
  while (!game.ended) {
    const currentPlayer = game.playerTurnSequence[game.currentPlayerIndex];

    await game.delegate.onAwaitingInputFromPlayer(
      currentPlayer.ID,
      game.answerHistory[game.answerHistory.length - 1],
    );

    if (game.ended) {
      break;
    }

    const turnResult = await playerTurnInputLoop.waitForResult(game, currentPlayer);

    if (game.ended) {
      break;
    }

    if (turnResult.endReason === playerTurnInputLoop.TurnEndReason.TIMEOUT) {
      if (turnResult.afk) {
        currentPlayer.active = false;
        await game.delegate.onPlayerSetInactive(currentPlayer.ID, PlayerSetInactiveReason.AFK);

        if (isGameEmpty(game)) {
          return endGame(game.ID, EndGameReason.NO_PLAYERS);
        }
      } else {
        await game.delegate.onPlayerSkipped(currentPlayer.ID);
      }
    } else if (turnResult.endReason === playerTurnInputLoop.TurnEndReason.ABORTED) {
      // NOOP. Whatever else must be done is done where the abort originated.
    } else if (turnResult.endReason === playerTurnInputLoop.TurnEndReason.CORRECT_ANSWER) {
      currentPlayer.rawScore += turnResult.score;
      await game.delegate.onPlayerAnswered(currentPlayer.ID, turnResult.wordInformation);
      game.answerHistory.push(turnResult.wordInformation);
    }

    if (game.ended) {
      break;
    }

    advanceCurrentPlayer(game);
  }
}

async function startGame(gameID) {
  assert(gameExists(gameID), 'No game exists with that ID');
  const game = gameForGameID[gameID];

  if (game.started || game.ended) {
    return undefined;
  }

  try {
    return await gameLoop(game);
  } catch (err) {
    return endGame(gameID, EndGameReason.ERROR, err);
  }
}

// If the game does not exist or the player is not in the game
// or already active, this is a noop.
function reactivatePlayer(gameID, playerID) {
  assert(gameID, 'No game ID specified');
  assert(playerID, 'No player ID specified');
  if (!gameExists(gameID)) {
    return;
  }

  const game = gameForGameID[gameID];
  const playerToReactivate = game.playerTurnSequence.find(
    player => player.ID === playerID && !player.active
  );

  if (playerToReactivate) {
    playerToReactivate.active = true;
    return game.delegate.onPlayerReactivated(playerToReactivate.ID);
  }

  return undefined;
}

function addPlayer(gameID, playerID, bot) {
  const game = gameForGameID[gameID];
  if (gameContainsPlayer(game, playerID)) {
    return reactivatePlayer(gameID, playerID);
  }

  game.playerTurnSequence.push(new Player(playerID, bot));
  return game.delegate.onNewPlayerAdded(playerID);
}

function addRealPlayer(gameID, playerID) {
  assert(gameExists(gameID), 'Game with that ID does not exist');
  assert(playerID, 'Must provide a valid playerID');
  return addPlayer(gameID, playerID, false);
}

function addBotPlayer(gameID, playerID) {
  assert(gameExists(gameID), 'Game with that ID does not exist');
  assert(playerID, 'Must provide a valid playerID');
  return addPlayer(gameID, playerID, true);
}

function validateConfig(config) {
  assert(config, 'Must provide config');
  assert(typeof config.singlePlayerTimeoutMs === typeof 1, 'Must provide numerical singlePlayerTimeoutMs config option');
  assert(typeof config.multiPlayerTimeoutMs === typeof 1, 'Must provide numerical multiPlayerTimeoutMs config option');
  assert(typeof config.botTurnMaximumWaitInMs === typeof 1, 'Must provide numerical botTurnMaximumWaitInMs config option');
  assert(typeof config.botTurnMinimumWaitInMs === typeof 1, 'Must provide numerical botTurnMinimumWaitInMs config option');
  assert(typeof config.botScoreMultiplier === typeof 1, 'Must provide numerical botScoreMultiplier config option');
  assert(typeof config.autoRejoin === typeof true, 'Must provide boolean autoRejoin config option');
}

function createGame(gameID, delegate, config, resourceDatabase) {
  assert(!gameExists(gameID), 'Game with that ID already exists');
  assert(delegate, 'Must provide a game delegate');
  validateConfig(config);
  gameForGameID[gameID] = new Game(gameID, delegate, config, resourceDatabase);
}

function receiveInput(gameID, playerID, input, inputArgs) {
  const game = gameForGameID[gameID];
  if (game && game.config.autoRejoin) {
    reactivatePlayer(gameID, playerID);
  }

  return playerTurnInputLoop.receiveInput(gameID, playerID, input, inputArgs);
}

function stopGame(gameID, args) {
  return endGame(gameID, EndGameReason.EXTERNAL_STOP_REQUEST, args);
}

function getScores(gameID) {
  assert(gameExists(gameID), 'No such game');
  const game = gameForGameID[gameID];
  const adjustedScoreForPlayerID = {};
  const { botScoreMultiplier } = game.config;

  game.playerTurnSequence.forEach((player) => {
    const scoreMultiplier = player.bot ? botScoreMultiplier : 1;
    const adjustedScore = Math.floor(player.rawScore * scoreMultiplier);
    adjustedScoreForPlayerID[player.ID] = adjustedScore;
  });

  return adjustedScoreForPlayerID;
}

function getPlayerTurnSequence(gameID) {
  assert(gameExists(gameID), 'No such game');
  const game = gameForGameID[gameID];
  return game.playerTurnSequence.map(player => player.ID);
}

function getAnswerHistory(gameID) {
  assert(gameExists(gameID), 'No such game');
  const game = gameForGameID[gameID];
  return game.answerHistory;
}

async function setPlayerInactive(gameID, playerID) {
  assert(gameExists(gameID), 'No such game');
  const game = gameForGameID[gameID];
  const player = game.playerTurnSequence.find(p => p.ID === playerID);
  assert(player, 'No such player in that game');

  if (!player.active) {
    return;
  }

  player.active = false;
  await game.delegate.onPlayerSetInactive(
    playerID,
    PlayerSetInactiveReason.EXTERNAL_LEAVE_REQUEST
  );

  if (isGameEmpty(game)) {
    return endGame(game.ID, EndGameReason.NO_PLAYERS);
  }

  playerTurnInputLoop.abortWait(gameID, playerID);
}

module.exports = {
  createGame,
  addRealPlayer,
  addBotPlayer,
  gameExists,
  startGame,
  receiveInput,
  stopGame,
  getScores,
  setPlayerInactive,
  getPlayerTurnSequence,
  PlayerSetInactiveReason,
  getAnswerHistory,
  EndGameReason,
};
