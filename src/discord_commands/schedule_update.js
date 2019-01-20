const reload = require('require-reload');
const globals = require('../common/globals.js');
const state = require('./../common/static_state.js');

const retryPromise = reload('../common/util/retry_promise.js');
const quizManager = reload('../common/quiz/manager.js');
const { EMBED_WARNING_COLOR, FOOTER_ICON_URI } = reload('../common/constants.js');

const LOGGER_TITLE = 'SHUTDOWN WARNING';
const SHUTDOWN_WAIT_SECONDS = 120;
const SHUTDOWN_WAIT_MS = SHUTDOWN_WAIT_SECONDS * 1000;
const SHUTDOWN_MESSAGE_COUNT = 4;
const NEXT_MESSAGE_DELAY_MS = SHUTDOWN_WAIT_MS / SHUTDOWN_MESSAGE_COUNT;

state.scheduledShutdown = state.scheduledShutdown || {
  shutdownNotifyChannels: [],
};

const { shutdownNotifyChannels } = state.scheduledShutdown;

function getChannelsFromChannelIds(bot, channelIds) {
  const dmChannels = channelIds
    .map(channelId => bot.privateChannels.get(channelId))
    .filter(x => x);

  const guildChannels = channelIds.map((channelId) => {
    const guild = bot.guilds.get(bot.channelGuildMap[channelId]);
    if (guild) {
      return guild.channels.get(channelId);
    }

    return undefined;
  }).filter(x => x);

  return dmChannels.concat(guildChannels);
}

function getQuizInProgressChannels(bot) {
  const inProgressChannelIds = quizManager.getInProcessLocations();
  return getChannelsFromChannelIds(bot, inProgressChannelIds);
}

function getNotifyRegisteredChannels(bot) {
  return getChannelsFromChannelIds(bot, shutdownNotifyChannels);
}

function uniqueById(arr) {
  const unique = [];
  const seen = {};
  arr.forEach((obj) => {
    if (!seen[obj.id]) {
      unique.push(obj);
      seen[obj.id] = true;
    }
  });

  return unique;
}

function wait(ms) {
  return new Promise((fulfill) => {
    setTimeout(() => {
      fulfill();
    }, ms);
  });
}

async function sendCountdownMessageToChannels(channels, timeRemainingMs, logger) {
  try {
    const message = {
      embed: {
        title: 'WARNING: Scheduled Update',
        description: `I am going down for a **scheduled update in ${timeRemainingMs / 1000} seconds**. Please save your game if you don't want to lose progress.`,
        color: EMBED_WARNING_COLOR,
        footer: {
          icon_url: FOOTER_ICON_URI,
          text: 'I\'m getting an update! Yay!',
        },
      },
    };

    const promises = uniqueById(channels)
      .map(channel => retryPromise(() => channel.createMessage(message)));

    await Promise.all(promises);
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error sending countdown message.', err);
  }
}

async function sendShutdownMessageToChannels(channels, logger) {
  try {
    const message = {
      embed: {
        title: 'Update time!',
        description: 'I\'m going down for a scheduled update now. See ya in about one minute.',
        color: EMBED_WARNING_COLOR,
        footer: {
          icon_url: FOOTER_ICON_URI,
          text: 'I\'m getting an update! Yay!',
        },
      },
    };

    const promises = uniqueById(channels)
      .map(channel => retryPromise(() => channel.createMessage(message)));

    await Promise.all(promises);
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error sending shutdown message.', err);
  }
}

module.exports = {
  commandAliases: ['schedule_reboot', 'sr'],
  botAdminOnly: true,
  uniqueId: 'schedule_reboot',
  hidden: true,
  action: async function action(bot, msg, suffix, monochrome) {
    if (globals.shutdownScheduled) {
      return msg.channel.createMessage('Already scheduled to shutdown');
    }

    const logger = monochrome.getLogger();
    const initialInProgressChannels = getQuizInProgressChannels(bot);
    globals.shutdownScheduled = true;

    let countdown = SHUTDOWN_WAIT_MS;
    while (countdown > 0) {
      const currentInProgressChannels = getQuizInProgressChannels(bot);

      // eslint-disable-next-line no-await-in-loop
      await sendCountdownMessageToChannels(currentInProgressChannels, countdown, logger);

      logger.logSuccess(LOGGER_TITLE, `Countdown: ${countdown}.`);

      // eslint-disable-next-line no-await-in-loop
      await wait(NEXT_MESSAGE_DELAY_MS);

      countdown -= NEXT_MESSAGE_DELAY_MS;
    }

    const channelsToNotify = initialInProgressChannels.concat(getNotifyRegisteredChannels(bot));
    await sendShutdownMessageToChannels(channelsToNotify, logger);
    await quizManager.stopAllQuizzes();

    return logger.logSuccess(LOGGER_TITLE, 'Countdown finished, quizzes stopped.');
  },
};
