const dbConnection = require('kotoba-node-common').database.connection;
const WordScheduleModel = require('kotoba-node-common').models.createWordSchedulesModel(dbConnection);
const showRandomWord = require('./show_random_word.js');

const frequencyCheck = 60 * 1000;

const statusConstants = {
  running: 'running',
  paused: 'paused',
};

/**
 * Starts the interval
 * @param {Monochrome} monochrome
 * @param {boolean} firstCall
 */
async function setTimer(monochrome, firstCall) {
  let now = (new Date()).getTime();
  // The first time this function is called we don't want to run the command,
  // just set the timer so it runs in sync with the frequencyCheck value
  if (!firstCall) {
    const pendingSchedules = await WordScheduleModel.find({ status: statusConstants.running });
    pendingSchedules.forEach(async (schedule) => {
      // We check if the schedule has reached the start date and if it's in sync
      // with the frequency, with an error margin of 0.1s
      if (now >= schedule.start && (now - schedule.start) % schedule.frequency < 100) {
        const channel = monochrome.getErisBot()
          .guilds.get(schedule.serverId)
          .channels.get(schedule.id);
        await showRandomWord(schedule.level, channel, monochrome);
      }
    });
  }
  // Since it's an asynchronous function, we sync it manually with the clock for it's next execution
  now = (new Date()).getTime();
  const offset = now % frequencyCheck;
  const nextTime = frequencyCheck - offset;

  setTimeout(() => {
    setTimer(monochrome);
  }, nextTime);
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
 * @param {number} start
 * @param {number} frequency
 */
function getNextTime(start, frequency) {
  const now = (new Date()).getTime();
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

  let serverSchedules = await WordScheduleModel.find({ serverId });

  if (!serverSchedules) {
    serverSchedules = [];
  }

  let freq = '';
  let start = '';
  const suffixArray = suffix.split(' ')
    .map(s => s.trim().toLowerCase())
    .filter(s => s);
  const { length } = suffixArray;

  if (length === 1) {
    let index;
    switch (suffixArray[0]) {
      case 'clear':
        await WordScheduleModel.deleteMany({ serverId });
        return msg.channel.createMessage('All scheduled commands have been cleared.');

      case 'list':
        if (serverSchedules.length > 0) {
          const list = serverSchedules
            .map(i => `**Channel:** ${msg.channel.guild.channels.get(i.id).name}, **Frequency:** ${formatFrequency(i.frequency)}, **Start time:** ${new Date(i.start).toLocaleString()}, **Level:** ${i.level ? i.level : 'any'}, **Status:** ${i.status}, **Next word in** ${getNextTime(i.start, i.frequency)}.`)
            .join('\n');
          return msg.channel.createMessage(list);
        }
        return msg.channel.createMessage('List is empty.');

      case 'stop':
        index = serverSchedules.findIndex(i => i.id === channelId);
        if (index !== -1) {
          clearTimeout(serverSchedules[index].interval);
          await WordScheduleModel.deleteOne({ _id: channelId });
          return msg.channel.createMessage('Scheduled command stopped succesfully.');
        }
        return msg.channel.createMessage('Error: Scheduled command not found in this channel.');

      case 'pause':
        index = serverSchedules.findIndex(i => i.id === channelId);
        if (index !== -1) {
          if (serverSchedules[index].status === statusConstants.paused) {
            return msg.channel.createMessage('Scheduled command is already paused.');
          }
          serverSchedules[index].status = statusConstants.paused;
          await serverSchedules[index].save(); // put it into the database
          return msg.channel.createMessage('Scheduled command paused succesfully.');
        }
        return msg.channel.createMessage('Error: Scheduled command not found in this channel.');

      case 'pauseall':
        await serverSchedules.forEach(async (schedule, i) => {
          if (schedule.status === statusConstants.running) {
            serverSchedules[i].status = statusConstants.paused;
            await serverSchedules[i].save(); // put it into the database
          }
        });
        return msg.channel.createMessage('All server\'s scheduled command have been paused.');

      case 'resume':
        index = serverSchedules.findIndex(i => i.id === channelId);
        if (index !== -1) {
          if (serverSchedules[index].status === statusConstants.running) {
            return msg.channel.createMessage('Scheduled command is already running.');
          }
          serverSchedules[index].status = statusConstants.running;
          await serverSchedules[index].save(); // put it into the database
          return msg.channel.createMessage(`Scheduled command resumed succesfully. Next word in ${getNextTime(serverSchedules[index].start, serverSchedules[index].frequency)}.`);
        }
        return msg.channel.createMessage('Error: Scheduled command not found in this channel.');

      case 'resumeall':
        await serverSchedules.forEach(async (schedule, i) => {
          if (schedule.status === statusConstants.paused) {
            serverSchedules[i].status = statusConstants.running;
            await serverSchedules[i].save(); // put it into the database
          }
        });
        return msg.channel.createMessage('All server\'s scheduled command have been resumed.');

      default:
    }
  }

  if (length !== 2 && length !== 3) {
    return msg.channel.createMessage('Error: You must specify frequency in hours (or use \'daily\' or \'weekly\'), and a starting time (or use \'now\'). Frequency formats consist of number and unit. Valid units are \'s\', \'m\', \'h\', \'d\', \'w\'. Starting time valid fotmat is \'hh:mm\'.');
  }

  const [suffixFreq, suffixStart, suffixLevel] = suffixArray;

  switch (suffixFreq) {
    case 'daily':
      freq = 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      freq = 7 * 24 * 60 * 60 * 1000;
      break;
    default: {
      const [, freqStr, freqType] = suffixFreq.match(/([0-9]+)([smhdw])/i) || [];
      if (freqStr) {
        const freqValue = Number.parseInt(freqStr, 10);
        switch (freqType) {
          case 's':
            freq = freqValue * 1000;
            break;
          case 'm':
            freq = freqValue * 1000 * 60;
            break;
          case 'h':
            freq = freqValue * 1000 * 60 * 60;
            break;
          case 'd':
            freq = freqValue * 1000 * 60 * 60 * 24;
            break;
          case 'w':
            freq = freqValue * 1000 * 60 * 60 * 24 * 7;
            break;
          default:
            break;
        }
      } else {
        return msg.channel.createMessage('Error: You must specify frequency. Frequency formats consist of number and unit. Valid units are \'s\', \'m\', \'h\', \'d\', \'w\'.');
      }
      if (freq < frequencyCheck) {
        return msg.channel.createMessage(`Error: Minimum frequency is ${formatFrequency(frequencyCheck)}.`);
      }
      break;
    }
  }

  switch (suffixStart) {
    case 'now':
      start = new Date();
      start.setSeconds(0);
      start.setMilliseconds(0);
      start.setMinutes(start.getMinutes() + 1);
      break;
    default: {
      const [, hours, minutes] = suffixArray[1].match(/([0-9]{1,2}):([0-9]{2})/) || [];
      if (hours) {
        start = new Date();
        start.setHours(hours);
        start.setMinutes(minutes);
        start.setSeconds(0);
        start.setMilliseconds(0);
        if (start < new Date()) {
          start.setDate(start.getDate() + 1);
        }
      } else {
        return msg.channel.createMessage('Error: Start time must be in format hh:mm.');
      }
      break;
    }
  }

  if (length === 3) {
    switch (suffixLevel.toLowerCase()) {
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
        return msg.channel.createMessage('Error: Level must be one of these: N1, N2, N3, N4, N5, 10k, 9k, 8k, 7k, 6k, 5k, 4k, 3k, j2k, 2k, j1k, 1k.');
    }
  }

  const updateSchedule = await WordScheduleModel.findById(channelId);

  if (updateSchedule) {
    updateSchedule.frequency = freq;
    updateSchedule.start = start.getTime();
    updateSchedule.level = suffixLevel;
    updateSchedule.status = statusConstants.running;
    await updateSchedule.save(); // put it into the database
    return msg.channel.createMessage(`Scheduled updated correctly. Next word in ${getNextTime(updateSchedule.start, updateSchedule.frequency)}.`);
  }
  const schedule = new WordScheduleModel({
    _id: channelId,
    serverId,
    frequency: freq,
    start: start.getTime(),
    level: suffixLevel,
    status: statusConstants.running,
  });
  await schedule.save(); // put it into the database
  return msg.channel.createMessage(`Scheduled created correctly. First word in ${getNextTime(schedule.start, schedule.frequency)}.`);
}

async function loadIntervals(monochrome) {
  monochrome.getErisBot().on('ready', () => {
    setTimer(monochrome, true);
  });
}

module.exports = {
  setSchedule,
  loadIntervals,
};
