const assert = require('assert');

class Session {
  constructor(
    starterUserId,
    starterName,
    clientDelegate,
    gameStrategy,
    locationId,
    settings,
    botUserId,
  ) {
    this.botUserId = botUserId;
    this.players = [botUserId, starterUserId];
    this.playerAtIndexIsActive = this.players.map(() => true);
    this.nameForUserId = {};
    this.nameForUserId[starterUserId] = starterName;
    this.nameForUserId[botUserId] = 'Kotoba';

    this.clientDelegate = clientDelegate;
    this.currentPlayerIndex = 0;
    this.gameStrategy = gameStrategy;
    this.wordHistory = [];
    this.timers = [];
    this.locationId = locationId;
    this.settings = settings;
  }

  shouldRemovePlayerForRuleViolations() {
    return this.settings.removePlayerForRuleViolations;
  }

  getAnswerTimeLimitInMs() {
    return this.settings.answerTimeLimitInMs;
  }

  getBotTurnMinimumWaitInMs() {
    return this.settings.botTurnMinimumWaitInMs;
  }

  getBotTurnMaximumWaitInMs() {
    return this.settings.botTurnMaximumWaitInMs;
  }

  getNameForUserId(userId) {
    return this.nameForUserId[userId];
  }

  getLocationId() {
    return this.locationId;
  }

  removeBot() {
    if (this.playerAtIndexIsActive[0]) {
      this.playerAtIndexIsActive[0] = false;
      return true;
    }
    return false;
  }

  addBot() {
    if (!this.playerAtIndexIsActive[0]) {
      this.playerAtIndexIsActive[0] = true;
      return true;
    }
    return false;
  }

  addPlayer(userId, userName) {
    for (let i = 0; i < this.players.length; i += 1) {
      if (this.players[i] === userId) {
        if (this.playerAtIndexIsActive[i]) {
          return false;
        }
        this.playerAtIndexIsActive[i] = true;
        return true;
      }
    }

    this.players.push(userId);
    this.playerAtIndexIsActive.push(true);
    this.nameForUserId[userId] = userName;
    return true;
  }

  removePlayer(userId) {
    for (let i = 0; i < this.players.length; i += 1) {
      if (this.players[i] === userId) {
        if (this.playerAtIndexIsActive[i]) {
          this.playerAtIndexIsActive[i] = false;
          return true;
        }
      }
    }
    return false;
  }

  getClientDelegate() {
    return this.clientDelegate;
  }

  getGameStrategy() {
    return this.gameStrategy;
  }

  getWordHistory() {
    return this.wordHistory;
  }

  addTimer(timer) {
    this.timers.push(timer);
  }

  clearTimers() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
  }

  getBotUserId() {
    return this.botUserId;
  }

  getCurrentPlayerId() {
    return this.players[this.currentPlayerIndex];
  }

  getActivePlayers() {
    return this.players.filter((userId, index) => this.playerAtIndexIsActive[index]);
  }

  hasMultiplePlayers() {
    return this.getActivePlayers().length > 1;
  }

  advanceCurrentPlayer() {
    assert(this.hasMultiplePlayers(), 'Not enough players');
    this.currentPlayerIndex += 1;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
    }
    if (!this.playerAtIndexIsActive[this.currentPlayerIndex]) {
      this.advanceCurrentPlayer();
    }
  }
}

module.exports = Session;
