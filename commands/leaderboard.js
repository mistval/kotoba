'use strict'
const reload = require('require-reload')(require);
const ScoreStorageUtils = reload('./../kotoba/quiz_score_storage_utils.js');
const constants = reload('./../kotoba/constants.js');
const MAX_SCORERS = 20;

function createFieldForScorer(index, username, score) {
  return {
    name: (index + 1).toString() + ') ' + username,
    value: score.toString() + ' points', inline: true,
  };
}

function sendScores(bot, msg, scores, title, description, footer) {
  let content = {};
  content.embed = {
    title: title,
    description: description,
    color: constants.EMBED_NEUTRAL_COLOR,
  };
  if (footer) {
    content.embed.footer = footer;
  }
  content.embed.fields = [];
  scores = scores.sort((a, b) => {
    return b.score - a.score;
  });
  for (let i = 0; i < scores.length && i < MAX_SCORERS; ++i) {
    let userName = scores[i].username;
    let score = scores[i].score;
    if (!userName) {
      userName = '<Name Unknown>';
    }
    content.embed.fields.push(createFieldForScorer(i, userName, score));
  }

  let commandInvokersRow = scores.find(row => {
    return row.userId === msg.author.id;
  });

  if (commandInvokersRow) {
    let commandInvokersIndex = scores.indexOf(commandInvokersRow);

    if (commandInvokersIndex >= MAX_SCORERS) {
      content.embed.fields.push(createFieldForScorer(commandInvokersIndex, commandInvokersRow.username, commandInvokersRow.score));
    }
  }

  return bot.createMessage(msg.channel.id, content);
}

module.exports = {
  commandAliases: ['k!leaderboard', 'k!lb'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'leaderboard409359',
  action(bot, msg, suffix) {
    let title = '';
    let footer = {};
    let description = '';

    if (!suffix && msg.channel.guild) {
      title = 'Server leaderboard for **' + msg.channel.guild.name + '**';
      description = 'The top scorers in this server.';
      footer = {
        'text': 'Say \'k!lb global\' to see the global leaderboard.',
        'icon_url': constants.FOOTER_ICON_URI,
      };
      return ScoreStorageUtils.getServerScores(msg.channel.guild.id).then(scores => {
        return sendScores(bot, msg, scores, title, description, footer);
      });
    } else {
      title = 'Global leaderboard';
      description = 'The top scorers in the whole wide world.';
      return ScoreStorageUtils.getGlobalScores().then(scores => {
        return sendScores(bot, msg, scores, title, description);
      });
    }
  },
};
