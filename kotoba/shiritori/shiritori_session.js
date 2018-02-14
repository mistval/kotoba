const assert = require('assert');

const BOT_USER_ID = 'BOT';

class Session {
  constructor(players, clientDelegate, gameStrategy) {
    this.players_ = [BOT_USER_ID].concat(players);
    this.playerAtIndexIsActive_ = this.players_.map(() => true);

    this.clientDelegate_ = clientDelegate;
    this.nextPlayerIndex_ = 0;
    this.gameStrategy_ = gameStrategy;
    this.wordHistory_ = [];
    this.timers_ = [];
  }

  markCurrentPlayerInactive() {
    this.playerAtIndexIsActive_[this.nextPlayerIndex_] = false;
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

  getNextPlayerId() {
    return this.players_[this.nextPlayerIndex_];
  }

  hasActivePlayersBesidesBot() {
    return this.playerAtIndexIsActive_.reduce((sum, active) => active ? sum + 1 : sum, 0) > 1;
  }

  advanceCurrentPlayer() {
    assert(this.hasActivePlayersBesidesBot(), 'No active players');
    ++this.nextPlayerIndex_;
    if (this.nextPlayerIndex_ >= this.players_.length) {
      this.nextPlayerIndex_ = 0;
    }
    if (!this.playerAtIndexIsActive_[this.nextPlayerIndex_]) {
      this.advanceCurrentPlayer();
    }
  }
}

module.exports = Session;
module.exports.BOT_USER_ID = BOT_USER_ID;
