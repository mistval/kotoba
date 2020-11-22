const { Permissions, FulfillmentError } = require('monochrome-bot');
const constants = require('../common/constants');
const scheduleHelper = require('./../discord/schedule_helper');

const longDescription = `
Schedule a word of the day (or a word at some other frequency). This command can be only used by a server admin.

You must first specify a frequency (such as **daily** or **weekly**), and then a starting time (such as **now**).

For example: **<prefix>wotd daily now**

Instead of **daily**, a custom frequency can be specified, such as **12h** for 12 hours. Supported units are **h** (hours), **m** (minutes), **s** (seconds), **d** (days), and **w** (weeks).

Instead of **now**, a custom starting time can be used, such as 15:30 (for 3:30 in the afternoon).

You can also optionally specific a JLPT or Kanken level, such as **N3** or **2k**.

For example: **<prefix>wotd daily now N3**

You can see all current WOTD schedules for this server by using **<prefix>wotd list**
You can clear all WOTD schedules from this server by using **<prefix>wotd clear**
You can clear the WOTD schedule for the current channel by saying **<prefix>wotd stop**
You can pause the WOTD schedule for the current channel by saying **<prefix>wotd pause**
You can resume the WOTD schedule for the current channel by saying **<prefix>wotd resume**
You can pause all WOTD schedules for this server with **<prefix>wotd pauseall**
You can resume all WOTD schedules for this server with **<prefix>wotd resumeall**
`;

module.exports = {
  commandAliases: ['wotd', 'schedule', 'sch'],
  uniqueId: 'wotd',
  shortDescription: 'Schedule a word of the day.',
  longDescription,
  usageExample: '<prefix>wotd daily now N3, <prefix>wotd 12h 18:00 2k',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  action(bot, msg, suffix, monochrome) {
    if (!monochrome.userIsServerAdmin(msg)) {
      throw new FulfillmentError({
        publicMessage: {
          embed: {
            title: 'Word of the Day',
            description: 'A server admin can use this command to create a schedule for me to send information about a random word. Ask a server admin to configure it! ',
            color: constants.EMBED_NEUTRAL_COLOR,
          },
        },
        logDescription: 'Not server admin',
      });
    }

    if (!msg.channel.guild) {
      throw new FulfillmentError({
        publicMessage: {
          embed: {
            title: 'Word of the Day',
            description: 'This command can only be used in a server.',
            color: constants.EMBED_NEUTRAL_COLOR,
          },
        },
        logDescription: 'Not in a server',
      });
    }

    return scheduleHelper.setSchedule(
      suffix,
      msg,
    );
  },
};
