const util = require('util');
const assert = require('assert');
const dbConnection = require('kotoba-node-common').database.connection;
const WordScheduleModel = require('kotoba-node-common').models.createWordSchedulesModel(dbConnection);
const { Permissions } = require('monochrome-bot');
const showRandomWord = require('./show_random_word.js');

const wait = util.promisify(setTimeout);

const POLL_INTERVAL_MS = 60000; // 1 minute
const CHANNEL_SPACING_DELAY_MS = 4000; // 4 seconds
const FREQUENCY_CHECK = 30 * 60 * 1000; // 30 minutes

const StatusConstants = {
  RUNNING: 'running',
  PAUSED: 'paused',
};

let pollLoopHandle;

function hasSendPermissions(eris, channel) {
  assert(channel.guild, 'Command is not being used in a server');
  assert(channel.permissionsOf, 'Channel is not a text channel');

  const permissions = channel.permissionsOf(eris.user.id);
  return permissions.has(Permissions.sendMessages) && permissions.has(Permissions.embedLinks);
}

// Returns the channel for this WOTD schedule, or undefined
// if we cannot get the channel or cannot send messages in it.
function getWOTDChannel(eris, serverId, channelId) {
  const server = eris.guilds.get(serverId);

  // If Kotoba is no longer in the server, return undefined.
  if (!server) {
    return undefined;
  }

  const channel = server.channels.get(channelId);

  // If the channel no longer exists, return undefined
  if (!channel) {
    return undefined;
  }

  // If Kotoba does not have permission to send the messages, return undefined.
  if (!hasSendPermissions(eris, channel)) {
    return undefined;
  }

  // All good
  return channel;
}

async function sendSchedule(schedule, monochrome) {
  const channel = getWOTDChannel(
    monochrome.getErisBot(),
    schedule.serverId,
    schedule.id,
  );

  if (channel) {
    try {
      // eslint-disable-next-line no-param-reassign
      schedule.lastSent = new Date();
      await schedule.save();

      await showRandomWord(
        schedule.level,
        channel,
        monochrome,
        undefined,
        undefined,
        true,
        true,
      );

      monochrome.getLogger().info({
        event: 'WOTD MESSAGE SENT',
        channel,
      });
    } catch (err) {
      monochrome.getLogger().warn({
        err,
        event: 'WOTD CHANNEL ERROR',
        channel,
      });
    }
  } else {
    await schedule.remove();
  }
}

async function pollLoop(monochrome) {
  try {
    const now = new Date();
    const dueSchedules = await WordScheduleModel.find({
      status: StatusConstants.RUNNING,
      start: { $lte: now },
      $or: [{ lastSent: null }, { $expr: { $lte: ['$lastSent', { $subtract: [now, '$frequency'] }] } }],
    });

    for (const schedule of dueSchedules) {
      // eslint-disable-next-line no-await-in-loop
      await sendSchedule(schedule, monochrome);
      // eslint-disable-next-line no-await-in-loop
      await wait(CHANNEL_SPACING_DELAY_MS);
    }
  } catch (err) {
    monochrome.getLogger().error({
      err,
      event: 'WOTD ERROR',
    });
  } finally {
    clearTimeout(pollLoopHandle);
    pollLoopHandle = setTimeout(() => pollLoop(monochrome), POLL_INTERVAL_MS);
  }
}

/**
 * Returns a specified time in a readable format. Example: '1d 2h 34m 56s'
 * @param {number} time
 */
function formatFrequency(time) {
  let res = '';
  const num = time / 1000;
  const weeks = (num / (7 * 24 * 60 * 60));
  const rweeks = Math.floor(weeks);
  const days = (weeks - rweeks) * 7;
  const rdays = Math.floor(days);
  const hours = (days - rdays) * 24;
  const rhours = Math.floor(hours);
  const minutes = (hours - rhours) * 60;
  const rminutes = Math.floor(minutes);
  const seconds = (minutes - rminutes) * 60;
  const rseconds = Math.round(seconds);
  if (rweeks > 0) res = `${rweeks}w`;
  if (res !== '' && rdays > 0) res += ' ';
  if (rdays > 0) res += `${rdays}d`;
  if (res !== '' && rhours > 0) res += ' ';
  if (rhours > 0) res += `${rhours}h`;
  if (res !== '' && rminutes > 0) res += ' ';
  if (rminutes > 0) res += `${rminutes}m`;
  if (res !== '' && rseconds > 0) res += ' ';
  if (rseconds > 0) res += `${rseconds}s`;
  return res;
}

/**
 * Gets the next time the command should run
 * @param {Date} start
 * @param {number} frequency
 */
function getNextTime(start, frequency) {
  const now = new Date();
  if (now > start) {
    return formatFrequency(frequency - ((now - start) % frequency));
  }
  return formatFrequency(start - now);
}

/**
 * Creates or edits a schedule
 * @param {string} suffix
 * @param {Eris.Message} msg
 */
async function setSchedule(suffix, msg) {
  const serverId = msg.guildID;
  const channelId = msg.channel.id;
  let rounded = false;

  let serverSchedules = await WordScheduleModel.find({ serverId });

  if (!serverSchedules) {
    serverSchedules = [];
  }

  let frequency = 0;
  const start = new Date();
  const suffixArray = suffix.split(' ')
    .map(s => s.trim().toLowerCase())
    .filter(s => s);

  const { length } = suffixArray;

  if (length === 1) {
    let index;
    switch (suffixArray[0]) {
      case 'clear':
        await WordScheduleModel.deleteMany({ serverId });
        return msg.channel.createMessage('All WOTD schedules for this server have been cleared.');

      case 'list':
        if (serverSchedules.length > 0) {
          const list = serverSchedules
            .map(i => `**Channel:** ${msg.channel.guild.channels.get(i.id).name}, **Frequency:** ${formatFrequency(i.frequency)}, **Start time:** ${i.start.toLocaleString()}, **Last time sent:** ${i.lastSent ? i.lastSent.toLocaleString() : 'never'}, **Level:** ${i.level ? i.level : 'any'}, **Status:** ${i.status}, **Next word in** ${getNextTime(i.start, i.frequency)} (if status is 'running').`)
            .join('\n');
          return msg.channel.createMessage(list);
        }
        return msg.channel.createMessage('No WOTD schedules are currently active in this server.');

      case 'stop':
        index = serverSchedules.findIndex(i => i.id === channelId);
        if (index !== -1) {
          await WordScheduleModel.deleteOne({ _id: channelId });
          return msg.channel.createMessage('The WOTD schedule for this channel was stopped successfully.');
        }
        return msg.channel.createMessage('There is no WOTD schedule in this channel.');

      case 'pause':
        index = serverSchedules.findIndex(i => i.id === channelId);
        if (index !== -1) {
          if (serverSchedules[index].status === StatusConstants.PAUSED) {
            return msg.channel.createMessage('This channel\'s WOTD schedule is already paused.');
          }
          serverSchedules[index].status = StatusConstants.PAUSED;
          await serverSchedules[index].save(); // put it into the database
          return msg.channel.createMessage('WOTD schedule paused successfully.');
        }
        return msg.channel.createMessage('There is no WOTD schedule in this channel.');

      case 'pauseall':
        await Promise.all(serverSchedules.map(async (schedule, i) => {
          if (schedule.status === StatusConstants.RUNNING) {
            serverSchedules[i].status = StatusConstants.PAUSED;
            await serverSchedules[i].save(); // put it into the database
          }
        }));
        return msg.channel.createMessage('All WOTD schedules in this server have been paused.');

      case 'resume':
        index = serverSchedules.findIndex(i => i.id === channelId);
        if (index !== -1) {
          if (serverSchedules[index].status === StatusConstants.RUNNING) {
            return msg.channel.createMessage('The WOTD schedule for this channel is already active.');
          }
          serverSchedules[index].status = StatusConstants.RUNNING;
          await serverSchedules[index].save(); // put it into the database
          return msg.channel.createMessage(`WOTD schedule resumed successfully. Next word in ${getNextTime(serverSchedules[index].start, serverSchedules[index].frequency)}.`);
        }
        return msg.channel.createMessage('There is no WOTD schedule in this channel.');

      case 'resumeall':
        await Promise.all(serverSchedules.map(async (schedule, i) => {
          if (schedule.status === StatusConstants.PAUSED) {
            serverSchedules[i].status = StatusConstants.RUNNING;
            await serverSchedules[i].save(); // put it into the database
          }
        }));
        return msg.channel.createMessage('This servers WOTD schedules have all been resumed.');

      default:
    }
  }

  if (length !== 2 && length !== 3) {
    return msg.channel.createMessage(`You must specify frequency in hours (or use **daily** or **weekly**), and a starting time (or use **now**). Say **${msg.prefix}help wotd** for help!`);
  }

  const [suffixFreq, suffixStart, suffixLevel] = suffixArray;

  switch (suffixFreq) {
    case 'daily':
      frequency = 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      frequency = 7 * 24 * 60 * 60 * 1000;
      break;
    default: {
      const [, freqStr, freqType] = suffixFreq.match(/([0-9]+)([smhdw])/i) || [];
      if (freqStr) {
        const freqValue = Number.parseInt(freqStr, 10);
        switch (freqType) {
          case 's':
            frequency = freqValue * 1000;
            break;
          case 'm':
            frequency = freqValue * 1000 * 60;
            break;
          case 'h':
            frequency = freqValue * 1000 * 60 * 60;
            break;
          case 'd':
            frequency = freqValue * 1000 * 60 * 60 * 24;
            break;
          case 'w':
            frequency = freqValue * 1000 * 60 * 60 * 24 * 7;
            break;
          default:
            break;
        }
      } else {
        return msg.channel.createMessage(`You must specify frequency. Frequency formats consist of number and unit. Valid units are **s**, **m**, **h**, **d**, **w**.  Say **${msg.prefix}help wotd** for help!`);
      }
      if (frequency < FREQUENCY_CHECK) {
        return msg.channel.createMessage(`That frequency is too short. The minimum frequency is ${formatFrequency(FREQUENCY_CHECK)}. Say **${msg.prefix}help wotd** for help!`);
      }
      break;
    }
  }

  switch (suffixStart) {
    case 'now': {
      // We sync the time with the frequencyCheck value
      const offset = start.getTime() % FREQUENCY_CHECK;
      if (offset > 0) {
        start.setTime(start.getTime() + (FREQUENCY_CHECK - offset));
        rounded = true;
      }
      break;
    }
    default: {
      const [, hours, minutes] = suffixArray[1].match(/([0-9]{1,2}):([0-9]{2})/) || [];
      if (hours) {
        start.setHours(hours);
        start.setMinutes(minutes);
        start.setSeconds(0);
        start.setMilliseconds(0);
        // We sync the time with the frequencyCheck value
        const offset = start.getTime() % FREQUENCY_CHECK;
        if (offset > 0) {
          start.setTime(start.getTime() + (FREQUENCY_CHECK - offset));
          rounded = true;
        }
        // If it's already due it should start tomorrow
        if (start < new Date()) {
          start.setDate(start.getDate() + 1);
        }
      } else {
        return msg.channel.createMessage(`Start time must be in the format **hh:mm** (UTC). Say **${msg.prefix}help wotd** for help!`);
      }
      break;
    }
  }

  if (length === 3) {
    switch (suffixLevel) {
      case 'n1':
      case 'n2':
      case 'n3':
      case 'n4':
      case 'n5':
      case '10k':
      case '9k':
      case '8k':
      case '7k':
      case '6k':
      case '5k':
      case '4k':
      case '3k':
      case 'j2k':
      case '2k':
      case 'j1k':
      case '1k':
        break;
      default:
        return msg.channel.createMessage('Level must be one of: N1, N2, N3, N4, N5, 10k, 9k, 8k, 7k, 6k, 5k, 4k, 3k, j2k, 2k, j1k, 1k.');
    }
  }

  const updateSchedule = await WordScheduleModel.findById(channelId);

  if (updateSchedule) {
    updateSchedule.frequency = frequency;
    updateSchedule.start = start;
    updateSchedule.level = suffixLevel;
    updateSchedule.status = StatusConstants.RUNNING;
    updateSchedule.lastSent = null;
    await updateSchedule.save(); // put it into the database
    if (rounded) {
      return msg.channel.createMessage(`Your schedule has been rounded up to the nearest ${formatFrequency(FREQUENCY_CHECK)}. It will start at ${start.toLocaleString()} UTC.`);
    }
    return msg.channel.createMessage(`Your schedule has been updated successfully. Next word in ${getNextTime(updateSchedule.start, updateSchedule.frequency)}.`);
  }

  const schedule = new WordScheduleModel({
    _id: channelId,
    serverId,
    frequency,
    start,
    level: suffixLevel,
    status: StatusConstants.RUNNING,
  });

  await schedule.save(); // put it into the database
  if (rounded) {
    return msg.channel.createMessage(`Your schedule has been rounded up to the nearest ${formatFrequency(FREQUENCY_CHECK)}. It will start at ${start.toLocaleString()} UTC.`);
  }
  return msg.channel.createMessage(`Your schedule has been created successfully. First word in ${getNextTime(schedule.start, schedule.frequency)}.`);
}

let startedPollLoop = false;

async function loadIntervals(monochrome) {
  if (!startedPollLoop) {
    startedPollLoop = true;
    pollLoop(monochrome);
  }
}

module.exports = {
  setSchedule,
  loadIntervals,
};
