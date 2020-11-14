const { Permissions } = require('monochrome-bot');
const randomHelper = require('./random.js');

let intervals = [];

const NUMBER_OF_RETRIES = 50;

function randomAction(msg, suffix, monochrome) {
  const suffixLowerCase = suffix.toLowerCase();
  monochrome.updateUserFromREST(msg.author.id).catch(() => {});

  return randomHelper.getRandomWordRecursive(
    suffixLowerCase,
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
  let index = intervals.findIndex(i => i.id === id);
  if (index !== -1) {
    intervals[index].interval = setTimeout(() => {
      randomAction(msg, level, monochrome);
      setTimer(id, msg, level, monochrome, freq);
    }, nextTime)
  }
}

async function setSchedule(suffix, msg, monochrome) {
  let freq = '';
  let freqType = '';
  let start = '';
  let level = '';
  let suffixArray = suffix.split(" ");
  if (suffixArray.length === 1 && suffixArray[0] === 'clear') {
    intervals.forEach(i => clearTimeout(i.interval));
    intervals = [];
    msg.channel.createMessage('All scheduled commands have been cleared.');
  } else if (suffixArray.length === 1 && suffixArray[0] === 'list') {
    if (intervals.length > 0) {
      let list = '';
      intervals.forEach(i => list = (list === '' ? '' : list + '\n') + 'ID: ' + i.id +
                                            ', Channel: ' + i.channel +
                                            ', Frequency: ' + i.frequency +
                                            ', Start time: ' + i.start +
                                            ', Level: ' + i.level);
      msg.channel.createMessage(list);
    } else {
      msg.channel.createMessage('List is empty');
    }
  } else if (suffixArray.length === 2 && suffixArray[0] === 'stop') {
    let index = intervals.findIndex(i => i.id = suffixArray[1]);
    if (index !== -1) {
      clearTimeout(intervals[index].interval);
      intervals.splice(index, 1);
      msg.channel.createMessage('Scheduled command stopped succesfully.');
    } else {
      msg.channel.createMessage('Error: Scheduled command with ID ' + suffixArray[1] + ' not found.');
    }
  } else if (suffixArray.length !== 3) {
    msg.channel.createMessage('Error: You must specify frequency in hours (or use \'daily\' or \'weekly\'), and a starting time (or use \'now\'). Frequency formats consist of number and unit. Valid units are \'s\', \'m\', \'h\', \'d\', \'w\'. Starting time valid fotmat is \'hh:mm\'.');
  } else {
    switch (suffixArray[0]) {
      case 'daily':
        freq = 24 * 60 * 60 * 1000;
        freqType = "d";
        break;
      case 'weekly':
        freq = 7 * 24 * 60 * 60 * 1000;
        freqType = "w";
        break;
      default:
        let regex = new RegExp(/[0-9]+[smhdw]/, 'i');
        if (regex.test(suffixArray[0])) {
          let index = suffixArray[0].length - 1;
          let freqValue = Number.parseInt(suffixArray[0].substring(0, index));
          freqType = suffixArray[0].substring(index);
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
          }
        } else {
          msg.channel.createMessage('Error: You must specify frequency. Frequency formats consist of number and unit. Valid units are \'s\', \'m\', \'h\', \'d\', \'w\'.');
          return;
        }
        break;
    }
    switch(suffixArray[1]) {
      case 'now':
        start = new Date();
        start.setSeconds(0);
        start.setMilliseconds(0);
        break;
      default:
        let regex = new RegExp(/[0-9]{1,2}:[0-9]{2}/, 'i');
        if (regex.test(suffixArray[1])) {
          start = new Date();
          let hours = suffixArray[1].split(':')[0];
          let minutes = suffixArray[1].split(':')[1];
          start.setHours(hours);
          start.setMinutes(minutes);
          start.setSeconds(0);
          start.setMilliseconds(0);
        } else {
          msg.channel.createMessage('Error: Start time must be in format hh:mm.');
          return;
        }
        break;
    }
    level = suffixArray[2];
    let id = intervals.length > 0 ? intervals[intervals.length-1].id + 1 : 0;
    intervals.push({
      id: id,
      channel: msg.channel.name,
      frequency: suffixArray[0],
      start: start.toString(),
      level: level,
      interval: setTimeout(() => {
        setTimer(id, msg, level, monochrome, freq, start);
      }, 0)
    });
  }
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
    if(!monochrome.userIsServerAdmin(msg)){return;}
    return setSchedule(
      suffix,
      msg,
      monochrome
    );
  },
};
