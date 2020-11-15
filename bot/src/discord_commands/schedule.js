const { Permissions } = require('monochrome-bot');
const randomHelper = require('./random.js');

let intervals = [];

const NUMBER_OF_RETRIES = 50;

function randomAction(msg, suffix, monochrome) {
  monochrome.updateUserFromREST(msg.author.id).catch(() => {});

  return randomHelper.getRandomWordRecursive(
    suffix,
    msg,
    NUMBER_OF_RETRIES,
    monochrome,
  );
}

function setTimer(id, msg, level, monochrome, freq, startTime) {
  let nextTime = 0;
  if (startTime) {
    nextTime = startTime.getTime() - (new Date()).getTime();
    while (nextTime < 0) {
      nextTime += freq;
    }
  } else {
    nextTime = freq;
  }
  const index = intervals.findIndex(i => i.id === id);
  if (index !== -1) {
    intervals[index].interval = setTimeout(() => {
      randomAction(msg, level, monochrome);
      setTimer(id, msg, level, monochrome, freq);
    }, nextTime);
  }
}

async function setSchedule(suffix, msg, monochrome) {
  let freq = '';
  let start = '';
  const suffixArray = suffix.split(' ')
    .map(s => s.trim().toLowerCase())
    .filter(s => s);
  const { length } = suffixArray;

  if (length === 1 && suffixArray[0] === 'clear') {
    intervals.forEach(i => clearTimeout(i.interval));
    intervals = [];
    return msg.channel.createMessage('All scheduled commands have been cleared.');
  }

  if (length === 1 && suffixArray[0] === 'list') {
    if (intervals.length > 0) {
      const list = intervals
        .map(i => `ID: ${i.id}, Channel: ${i.channel}, Frequency: ${i.frequency}, Start time: ${i.start}, Level: ${i.level}`)
        .join('\n');
      return msg.channel.createMessage(list);
    }
    return msg.channel.createMessage('List is empty.');
  }

  if (length === 2 && suffixArray[0] === 'stop') {
    const index = intervals.findIndex(i => i.id === suffixArray[1]);
    if (index !== -1) {
      clearTimeout(intervals[index].interval);
      intervals.splice(index, 1);
      return msg.channel.createMessage('Scheduled command stopped succesfully.');
    }
    return msg.channel.createMessage(`Error: Scheduled command with ID ${suffixArray[1]} not found.`);
  }

  if (length !== 3) {
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
      break;
    }
  }

  switch (suffixStart) {
    case 'now':
      start = new Date();
      start.setSeconds(0);
      start.setMilliseconds(0);
      break;
    default: {
      const [, hours, minutes] = suffixArray[1].match(/([0-9]{1,2}):([0-9]{2})/) || [];
      if (hours) {
        start = new Date();
        start.setHours(hours);
        start.setMinutes(minutes);
        start.setSeconds(0);
        start.setMilliseconds(0);
      } else {
        return msg.channel.createMessage('Error: Start time must be in format hh:mm.');
      }
      break;
    }
  }

  const id = intervals.length > 0 ? intervals[intervals.length - 1].id + 1 : 0;

  intervals.push({
    id,
    channel: msg.channel.name,
    frequency: suffixFreq,
    start: start.toString(),
    level: suffixLevel,
  });

  setTimer(id, msg, suffixLevel, monochrome, freq, start);

  return null;
}

module.exports = {
  commandAliases: ['schedule', 'sch'],
  canBeChannelRestricted: true,
  uniqueId: 'schedule',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Schedule the \'random\' command to run periodically. This command can be only used by a server Admin.',
  longDescription: 'Schedule the \'random\' command to run periodically. This command can be only used by a server Admin. You must specify frequency (or use \'daily\' or \'weekly\'), and a starting time (or use \'now\'). Frequency formats consist of number and unit. Valid units are \'s\', \'m\', \'h\', \'d\', \'w\'. Starting time valid fotmat is \'hh:mm\'. You can see all the scheduled commands by using \'<prefix>schedule list\'. You can clear all scheduled commands by using \'<prefix>schedule clear\' or cancel one by using \'<prefix>schedule stop ID\'.',
  usageExample: '<prefix>schedule 1h now N3, <prefix>schedule daily 18:00 2k',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  action(bot, msg, suffix, monochrome) {
    if (!monochrome.userIsServerAdmin(msg)) { return; }
    setSchedule(
      suffix,
      msg,
      monochrome,
    );
  },
};
