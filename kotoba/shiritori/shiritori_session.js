const assert = require('assert');

const BOT_USER_ID = '251239170058616833';

class Session {
  constructor(starterUserId, starterName, clientDelegate, gameStrategy, locationId, settings) {
    this.players_ = [BOT_USER_ID, starterUserId];
    this.playerAtIndexIsActive_ = this.players_.map(() => true);
    this.nameForUserId_ = {};
    this.nameForUserId_[starterUserId] = starterName;
    this.nameForUserId_[BOT_USER_ID] = 'Kotoba';

    this.clientDelegate_ = clientDelegate;
    this.currentPlayerIndex_ = 0;
    this.gameStrategy_ = gameStrategy;
    this.wordHistory_ = [];
    this.timers_ = [];
    this.locationId_ = locationId;
    this.settings_ = settings;
  }

  shouldRemovePlayerForRuleViolations() {
    return this.settings_.removePlayerForRuleViolations;
  }

  getAnswerTimeLimitInMs() {
    return this.settings_.answerTimeLimitInMs;
  }

  getBotTurnMinimumWaitInMs() {
    return this.settings_.botTurnMinimumWaitInMs;
  }

  getBotTurnMaximumWaitInMs() {
    return this.settings_.botTurnMaximumWaitInMs;
  }

  getNameForUserId(userId) {
    return this.nameForUserId_[userId];
  }

  getLocationId() {
    return this.locationId_;
  }

  removeBot() {
    if (this.playerAtIndexIsActive_[0]) {
      this.playerAtIndexIsActive_[0] = false;
      return true;
    }
    return false;
  }

  addBot() {
    if (!this.playerAtIndexIsActive_[0]) {
      this.playerAtIndexIsActive_[0] = true;
      return true;
    }
    return false;
  }

  addPlayer(userId, userName) {
    for (let i = 0; i < this.players_.length; ++i) {
      if (this.players_[i] === userId) {
        if (this.playerAtIndexIsActive_[i]) {
          return false;
        } else {
          this.playerAtIndexIsActive_[i] = true;
          return true;
        }
      }
    }

    this.players_.push(userId);
    this.playerAtIndexIsActive_.push(true);
    this.nameForUserId_[userId] = userName;
    return true;
  }

  removePlayer(userId) {
    for (let i = 0; i < this.players_.length; ++i) {
      if (this.players_[i] === userId) {
        if (this.playerAtIndexIsActive_[i]) {
          this.playerAtIndexIsActive_[i] = false;
          return true;
        }
      }
    }
    return false;
  }

  getClientDelegate() {
    return this.clientDelegate_;
  }

  getGameStrategy() {
    return this.gameStrategy_;
  }

  getWordHistory() {
    return this.wordHistory_;
  }

  addTimer(timer) {
    this.timers_.push(timer);
  }

  clearTimers() {
    for (let timer of this.timers_) {
      clearTimeout(timer);
    }
    this.timers_ = [];
  }

  getBotUserId() {
    return BOT_USER_ID;
  }

  getCurrentPlayerId() {
    return this.players_[this.currentPlayerIndex_];
  }

  getActivePlayers() {
    return this.players_.filter((userId, index) => this.playerAtIndexIsActive_[index]);
  }

  hasMultiplePlayers() {
    return this.getActivePlayers().length > 1;
  }

  advanceCurrentPlayer() {
    assert(this.hasMultiplePlayers(), 'Not enough players');
    ++this.currentPlayerIndex_;
    if (this.currentPlayerIndex_ >= this.players_.length) {
      this.currentPlayerIndex_ = 0;
    }
    if (!this.playerAtIndexIsActive_[this.currentPlayerIndex_]) {
      this.advanceCurrentPlayer();
    }
  }
}

module.exports = Session;
module.exports.BOT_USER_ID = BOT_USER_ID;
