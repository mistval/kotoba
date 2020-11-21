const { Permissions } = require('monochrome-bot');
const scheduleHelper = require('./../discord/schedule_helper');

module.exports = {
  commandAliases: ['schedule', 'sch'],
  canBeChannelRestricted: true,
  uniqueId: 'schedule',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Schedule the \'random\' command to run periodically. This command can be only used by a server Admin.',
  longDescription: 'Schedule the \'random\' command to run periodically. This command can be only used by a server Admin.\nYou must specify frequency (or use \'daily\' or \'weekly\'), and a starting time (or use \'now\'). Frequency formats consist of number and unit. Valid units are \'s\', \'m\', \'h\', \'d\', \'w\'. Starting time valid fotmat is \'hh:mm\'.\nYou can see all the scheduled commands by using \'<prefix>schedule list\'.\nYou can clear all scheduled commands by using \'<prefix>schedule clear\', cancel the current channel\'s schedule by using \'<prefix>schedule stop\', pause it with \'<prefix>schedule pause\' and resume it if it\'s paused with \'<prefix>schedule resume\'.\nYou can also pause all of the server\'s scheduled commands with \'<prefix>schedule pauseall\' and resume all of them with \'<prefix>schedule resumeall\'.',
  usageExample: '<prefix>schedule 1h now N3, <prefix>schedule daily 18:00 2k',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  action(bot, msg, suffix, monochrome) {
    if (!monochrome.userIsServerAdmin(msg)) { return; }
    scheduleHelper.setSchedule(
      suffix,
      msg,
    );
  },
};
