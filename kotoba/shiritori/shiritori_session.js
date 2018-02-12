class Session {
  constructor(players, clientDelegate) {
    this.players_ = ['BOT'].concat(players);
    this.clientDelegate_ = clientDelegate;
  }

  getClientDelegate() {
    return this.clientDelegate_;
  }
}

module.exports = Session;
