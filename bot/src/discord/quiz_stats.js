const axios = require('axios').create({ timeout: 1000 });
const constants = require('./../common/constants.js');
const moment = require('moment');

const WORKER_HOST = process.env.WORKER_HOST || 'localhost';

async function sendStats(msg) {
  const stats = (await axios.get(`http://${WORKER_HOST}/users/${msg.author.id}/quizstats`)).data;
  if (!stats) {
    return msg.channel.createMessage({
      embed: {
        title: 'Quiz Stats',
        description: 'I don\'t have any stats for you. Do some quizzes and try again!',
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  const {
    dailyStats,
    charts: {
      deckPieChart,
      pointsPerDayChart,
      percentCorrectChart,
    },
  } = stats;

  const firstDay = dailyStats[0].dateInt;
  const firstDayStr = moment(firstDay).format('MMM Do');
  await msg.channel.createMessage({
    embed: {
      title: `Points per deck since ${firstDayStr}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      image: {
        url: 'attachment://chart.png',
      },
    },
  }, {
    name: 'chart.png',
    file: Buffer.from(deckPieChart, 'base64'),
  });

  await msg.channel.createMessage({
    embed: {
      description: ':purple_heart: = Answered correctly.\n:large_orange_diamond: = Seen but not answered.',
      title: `Points per day (answered and unanswered) since ${firstDayStr}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      image: {
        url: 'attachment://chart.png',
      },
    },
  }, {
    name: 'chart.png',
    file: Buffer.from(pointsPerDayChart, 'base64'),
  });

  return msg.channel.createMessage({
    embed: {
      title: `Percent correct per day since ${firstDayStr}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      image: {
        url: 'attachment://chart.png',
      },
    },
  }, {
    name: 'chart.png',
    file: Buffer.from(percentCorrectChart, 'base64'),
  });
}

module.exports = sendStats;
