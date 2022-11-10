const deckValidation = require('./deck_validation.js');
const quizDefaults = require('./quiz_defaults.js');
const quizTimeModifierPresets = require('./quiz_time_modifier_presets.js');
const quizLimits = require('./quiz_limits.js');
const deckPermissions = require('./deck_permissions.js');
const safeTimers = require('./safe_timers.js');

module.exports = {
  deckValidation,
  quizDefaults,
  quizTimeModifierPresets,
  quizLimits,
  deckPermissions,
  safeTimers,
};
