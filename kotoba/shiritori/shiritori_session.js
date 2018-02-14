const BOT_USER_ID = 'BOT';

class Session {
  constructor(players, clientDelegate, gameStrategy) {
    this.players_ = [BOT_USER_ID].concat(players);
    this.clientDelegate_ = clientDelegate;
    this.nextPlayerIndex_ = 0;
    this.gameStrategy_ = gameStrategy;
    this.wordHistory_ = [];
    this.timers_ = [];
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

  advanceCurrentPlayer() {
    ++this.nextPlayerIndex_;
    if (this.nextPlayerIndex_ >= this.players_.length) {
      this.nextPlayerIndex_ = 0;
    }
  }
}

module.exports = Session;
module.exports.BOT_USER_ID = BOT_USER_ID;
