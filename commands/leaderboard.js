const reload = require('require-reload')(require);

const ScoreStorageUtils = reload('./../kotoba/quiz/score_storage_utils.js');
const constants = reload('./../kotoba/constants.js');
const {
  NavigationChapter,
  Navigation,
  navigationManager,
} = reload('monochrome-bot');

const MAX_SCORERS_PER_PAGE = 20;
const NAVIGATION_EXPIRATION_TIME = 600000; // Ten minutes

function createFieldForScorer(index, username, score) {
  return {
    name: `${(index + 1).toString()}) ${username}`,
    value: `${score.toString()} points`,
    inline: true,
  };
}

function createScoreTotalString(scores) {
  let scoreTotal = 0;
  const users = {};
  scores.forEach((score) => {
    scoreTotal += score.score;
    users[score.username] = true;
  });

  const usersTotal = Object.keys(users).length;
  const scoreTotalString = scoreTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${scoreTotalString} points have been scored by ${usersTotal} players.`;
}

function sendScores(bot, msg, scores, title, description, footer) {
  const navigationContents = [];
  const numPages = scores.length % MAX_SCORERS_PER_PAGE === 0 ?
    Math.max(scores.length / MAX_SCORERS_PER_PAGE, 1) :
    Math.floor(scores.length / MAX_SCORERS_PER_PAGE) + 1;

  const sortedScores = scores.sort((a, b) => b.score - a.score);

  for (let pageIndex = 0; pageIndex < numPages; pageIndex += 1) {
    const elementStartIndex = pageIndex * MAX_SCORERS_PER_PAGE;
    const elementEndIndex = Math.min(
      ((pageIndex + 1) * MAX_SCORERS_PER_PAGE) - 1,
      sortedScores.length - 1,
    );

    const content = {
      embed: {
        title,
        description: `${description}\n${createScoreTotalString(scores)}`,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [],
      },
    };
    if (footer) {
      content.embed.footer = footer;
    }

    for (let i = elementStartIndex; i <= elementEndIndex; i += 1) {
      let userName = sortedScores[i].username;
      const { score } = sortedScores[i];
      if (!userName) {
        userName = '<Name Unknown>';
      }
      content.embed.fields.push(createFieldForScorer(i, userName, score));
    }

    const commandInvokersRow = sortedScores.find(row => row.userId === msg.author.id);

    if (commandInvokersRow) {
      const commandInvokersIndex = sortedScores.indexOf(commandInvokersRow);

      if (commandInvokersIndex < elementStartIndex || commandInvokersIndex > elementEndIndex) {
        content.embed.fields.push(createFieldForScorer(
          commandInvokersIndex,
          commandInvokersRow.username,
          commandInvokersRow.score,
        ));
      }
    }

    navigationContents.push(content);
  }

  const navigationChapter = NavigationChapter.fromContent(navigationContents);
  const chapterForReaction = { a: navigationChapter };
  const hasMultiplePages = navigationContents.length > 1;
  const authorId = msg.author.id;
  const navigation = new Navigation(authorId, hasMultiplePages, 'a', chapterForReaction);
  return navigationManager.register(navigation, NAVIGATION_EXPIRATION_TIME, msg);
}

function notifyDeckNotFound(msg, isGlobal, deckName) {
  const content = {
    embed: {
      title: 'Leaderboard',
      description: `I don't have a deck named **${deckName}**.`,
      color: constants.EMBED_WRONG_COLOR,
    },
  };

  return msg.channel.createMessage(content);
}

module.exports = {
  commandAliases: ['k!lb', 'k!leaderboard'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'leaderboard409359',
  action: async function action(bot, msg, suffix) {
    let title = '';
    let footer = {};
    let description = '';
    let scores;

    let suffixReplaced = suffix.toLowerCase();
    const isGlobal = suffixReplaced.indexOf('global') !== -1 || !msg.channel.guild;

    suffixReplaced = suffixReplaced.replace(/global/g, '');
    const deckName = suffixReplaced.trim();

    const deckNameTitlePart = deckName ? ` (${deckName})` : '';

    if (isGlobal) {
      title = `Global leaderboard ${deckNameTitlePart}`;
      description = 'The top scorers in the whole wide world.';

      if (!deckName) {
        footer = {
          text: 'Say \'k!lb global deckname\' to see the global leaderboard for a deck.',
          icon_url: constants.FOOTER_ICON_URI,
        };
      }

      scores = await ScoreStorageUtils.getGlobalScores(deckName);
    } else {
      title = `Server leaderboard for **${msg.channel.guild.name}** ${deckNameTitlePart}`;
      description = 'The top scorers in this server.';
      footer = {
        text: 'Say \'k!lb global\' to see the global leaderboard. Say \'k!lb deckname\' to see a deck leaderboard.',
        icon_url: constants.FOOTER_ICON_URI,
      };
      scores = await ScoreStorageUtils.getServerScores(msg.channel.guild.id, deckName);
    }

    if (!scores) {
      return notifyDeckNotFound(msg, isGlobal, deckName);
    }

    return sendScores(bot, msg, scores, title, description, footer);
  },
};
