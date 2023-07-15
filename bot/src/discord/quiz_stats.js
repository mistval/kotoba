const axios = require('axios').create({ timeout: 10000 });
const moment = require('moment');
const constants = require('../common/constants.js');

const WORKER_HOST = process.env.WORKER_HOST || 'localhost';

async function sendStats(msg, requestedUserId) {
  let userId = msg.author.id;

  // Lemme look at other user's stats for testing
  if (requestedUserId && msg.author.id === '243703909166612480') {
    userId = requestedUserId;
  }

  let stats;
  try {
    stats = (await axios.get(`http://${WORKER_HOST}/users/${userId}/quizstats`)).data;
  } catch (err) {
    if (!err.response || err.response.status !== 404) {
      throw err;
    }

    return msg.channel.createMessage({
      embeds: [{
        title: 'Quiz Stats',
        description: 'I don\'t have any stats for you in the past 30 days. Do some quizzes and try again!',
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
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
    embeds: [{
      title: `Points per deck since ${firstDayStr}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      image: {
        url: 'attachment://chart.png',
      },
    }],
    attachments: [{
      filename: 'chart.png',
      file: Buffer.from(deckPieChart, 'base64'),
    }],
  });

  await msg.channel.createMessage({
    embeds: [{
      description: ':purple_heart: = Answered correctly.\n:large_orange_diamond: = Seen but not answered.',
      title: `Points per day (answered and unanswered) since ${firstDayStr}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      image: {
        url: 'attachment://chart.png',
      },
    }],
    attachments: [{
      filename: 'chart.png',
      file: Buffer.from(pointsPerDayChart, 'base64'),
    }],
  });

  return msg.channel.createMessage({
    embeds: [{
      title: `Percent correct per day since ${firstDayStr}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      image: {
        url: 'attachment://chart.png',
      },
    }],
    attachments: [{
      filename: 'chart.png',
      file: Buffer.from(percentCorrectChart, 'base64'),
    }],
  });
}

module.exports = sendStats;
