// The game engine is a run loop.
/* eslint no-await-in-loop: 0 */

const assert = require('assert');
const asyncTimeout = require('./async_timeout.js');

const inputWaitersForGameID = {};

const InputWaiterFinishReason = {
  TIMEOUT: 'timeout',
  ABORTED: 'abort',
  INPUT_RECEIVED: 'input received',
};

const TurnEndReason = {
  TIMEOUT: 'timeout',
  ABORTED: 'abort',
  CORRECT_ANSWER: 'correct answer',
};

class InputWaiter {
  constructor(finish, cancel) {
    this.finish = finish;
    this.cancel = cancel;
  }
}

class TurnResult {
  constructor(endReason, afk, wordInformation, score, inputArgs) {
    this.endReason = endReason;
    this.wordInformation = wordInformation;
    this.afk = afk;
    this.score = score;
    this.inputArgs = inputArgs;
  }
}

function getTurnTimeoutMs(game) {
  if (game.playerTurnSequence.length < 2) {
    return game.config.singlePlayerTimeoutMs;
  }

  return game.config.multiPlayerTimeoutMs;
}

function getInputWaiter(gameID, playerID) {
  const inputWaiterForPlayerID = inputWaitersForGameID[gameID];
  if (!inputWaiterForPlayerID) {
    return undefined;
  }

  return inputWaiterForPlayerID[playerID];
}

function waitForInput(gameID, playerID) {
  inputWaitersForGameID[gameID] = inputWaitersForGameID[gameID] || {};
  const inputWaiterForPlayerID = inputWaitersForGameID[gameID];
  assert(!inputWaiterForPlayerID[playerID], 'Already waiting for input from that player');

  return new Promise((fulfill, reject) => {
    inputWaiterForPlayerID[playerID] = new InputWaiter(fulfill, reject);
  });
}

function finishInputWaiter(gameID, playerID, finishReason, data) {
  const inputWaiterForPlayerID = inputWaitersForGameID[gameID];
  if (!inputWaiterForPlayerID) {
    return false;
  }

  const inputWaiter = inputWaiterForPlayerID[playerID];
  if (!inputWaiter) {
    return false;
  }

  inputWaiter.finish({ finishReason, data });
  delete inputWaiterForPlayerID[playerID];

  if (Object.keys(inputWaiterForPlayerID) === 0) {
    delete inputWaitersForGameID[gameID];
  }

  return true;
}

function receiveInput(gameID, playerID, input, inputArgs) {
  const inputWaiter = getInputWaiter(gameID, playerID);
  if (!inputWaiter) {
    return false;
  }

  const data = { input, inputArgs };
  return finishInputWaiter(gameID, playerID, InputWaiterFinishReason.INPUT_RECEIVED, data);
}

function finishLoop(fulfill, turnResult, timer) {
  assert(timer, 'timer no provided');
  clearTimeout(timer);
  return fulfill(turnResult);
}

// Waits for user input and fulfills with either a correct answer result
// or a timeout result
// Fulfills with either a correct answer result or a timeout result.
// A rejection represents an unexpected failure.
function realPlayerTurnInputLoop(game, player) {
  assert(!getInputWaiter(game.ID, player.ID), 'Already waiting for input from that player in this game');

  return new Promise(async (fulfill, reject) => {
    let didProvideInput = false;

    const timer = setTimeout(() => {
      finishInputWaiter(game.ID, player.ID, InputWaiterFinishReason.TIMEOUT);
    }, getTurnTimeoutMs(game));

    while (true) {
      try {
        const inputWaitResult = await waitForInput(game.ID, player.ID);

        if (inputWaitResult.finishReason === InputWaiterFinishReason.TIMEOUT) {
          const turnResult = new TurnResult(TurnEndReason.TIMEOUT, !didProvideInput);
          return finishLoop(fulfill, turnResult, timer);
        }

        if (inputWaitResult.finishReason === InputWaiterFinishReason.ABORTED) {
          const turnResult = new TurnResult(TurnEndReason.ABORTED, !didProvideInput);
          return finishLoop(fulfill, turnResult, timer);
        }

        assert(inputWaitResult.finishReason === InputWaiterFinishReason.INPUT_RECEIVED, 'Unknown input waiting finish reason');
        const { input, inputArgs } = inputWaitResult.data;

        didProvideInput = true;

        // TODO: Because of this, there is a (very) short period of time when the loop is not
        // accepting answers and answers might get lost.
        const answerResult = await game.strategy.tryAcceptAnswer(input, game.answerHistory, false);

        if (answerResult.accepted) {
          const turnResult = new TurnResult(
            TurnEndReason.CORRECT_ANSWER,
            !didProvideInput,
            answerResult.word,
            answerResult.score,
            inputArgs,
          );

          return finishLoop(fulfill, turnResult, timer);
        }

        if (!answerResult.accepted) {
          Promise.resolve(game.delegate.onAnswerRejected(
            player.ID,
            input,
            answerResult.rejectionReason,
            answerResult.extraData,
            inputArgs,
          )).catch(err => {
            game.delegate.onNonFatalError(err);
          });
        }
      } catch (err) {
        reject(err);
        return finishInputWaiter(game.ID, player.ID, InputWaiterFinishReason.ERROR, err);
      }
    }
  });
}

async function takeBotTurn(game) {
  const botAnswer = await game.strategy.getViableNextResult(game.answerHistory);
  const minDelayMs = game.config.botTurnMinimumWaitInMs;
  const maxDelayMs = game.config.botTurnMaximumWaitInMs;
  const delay = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs));

  await asyncTimeout(delay);

  return new TurnResult(TurnEndReason.CORRECT_ANSWER, false, botAnswer.word, botAnswer.score);
}

function waitForResult(game, player) {
  if (player.bot) {
    return takeBotTurn(game);
  }
  return realPlayerTurnInputLoop(game, player);
}

function abortWait(gameID, playerID) {
  finishInputWaiter(gameID, playerID, InputWaiterFinishReason.ABORTED);
}

module.exports = {
  waitForResult,
  receiveInput,
  abortWait,
  TurnEndReason,
};
