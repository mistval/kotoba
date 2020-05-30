const manager = require('./shiritori_manager.js');
const japaneseGameStrategy = require('./japanese_game_strategy.js');
const { REJECTION_REASON } = japaneseGameStrategy;

module.exports = manager;
module.exports.REJECTION_REASON = REJECTION_REASON;
module.exports.strategies = {
  japanese: japaneseGameStrategy,
};
