const reload = require('require-reload')(require);

const ScoreStorageUtils = reload('./../common/quiz/score_storage_utils.js');
const constants = reload('./../common/constants.js');
const { Navigation } = require('monochrome-bot');

const MAX_SCORERS_PER_PAGE = 20;

const deckNamesForGroupAlias = {
  anagrams: [
    'anagrams3',
    'anagrams4',
    'anagrams5',
    'anagrams6',
    'anagrams7',
    'anagrams8',
    'anagrams9',
    'anagrams10',
  ],
  jlpt: [
    'n1',
    'n2',
    'n3',
    'n4',
    'n5',
  ],
  kanken: [
    '1k',
    'j1k',
    '2k',
    'j2k',
    '3k',
    '4k',
    '5k',
    '6k',
    '7k',
    '8k',
    '9k',
    '10k',
  ],
};

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

function sendScores(msg, scores, title, description, footer, navigationManager, prefix) {
  const navigationContents = [];
  const numPages = Math.max(Math.ceil(scores.length / MAX_SCORERS_PER_PAGE), 1);

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
        description: `${description}\n${createScoreTotalString(scores)}\nSay **${prefix}help lb** for help viewing leaderboards.`,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [],
        footer,
      },
    };

    for (let i = elementStartIndex; i <= elementEndIndex; i += 1) {
      const username = sortedScores[i].username || '<Name Unknown>';
      const { score } = sortedScores[i];
      content.embed.fields.push(createFieldForScorer(i, username, score));
    }

    const commandInvokersIndex = sortedScores.findIndex(row => row.userId === msg.author.id);

    if (commandInvokersIndex !== -1) {
      const commandInvokersRow = sortedScores[commandInvokersIndex];

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

  const authorId = msg.author.id;
  const navigation = Navigation.fromOneDimensionalContents(authorId, navigationContents);
  return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

function notifyDeckNotFound(msg, deckName) {
  const content = {
    embed: {
      title: 'Leaderboard',
      description: `I don't have a deck named **${deckName}**.`,
      color: constants.EMBED_WRONG_COLOR,
    },
  };

  return msg.channel.createMessage(content);
}

function getDeckNamesArray(deckNamesString) {
  const deckNamesStringTrimmed = deckNamesString.trim();
  const didSpecifyDecks = !!deckNamesStringTrimmed;
  if (!didSpecifyDecks) {
    return [];
  }

  const deckNamesArray = deckNamesStringTrimmed.split(/ *\+ */);

  const deckNamesArrayUnaliased = [];
  for (let i = 0; i < deckNamesArray.length; i += 1) {
    const deckName = deckNamesArray[i];
    const deckNames = deckNamesForGroupAlias[deckName];
    if (deckNames) {
      deckNamesArrayUnaliased.push(...deckNames);
    } else {
      deckNamesArrayUnaliased.push(deckName);
    }
  }

  return deckNamesArrayUnaliased;
}

function getDeckNamesTitlePart(deckNamesArray) {
  let deckNamesTitlePart = '';
  if (deckNamesArray.length > 0) {
    deckNamesTitlePart = deckNamesArray.slice(0, 5).join(', ');
    if (deckNamesArray.length > 5) {
      deckNamesTitlePart += ', ...';
    }

    deckNamesTitlePart = ` (${deckNamesTitlePart})`;
  }

  return deckNamesTitlePart;
}

function createFooter(text) {
  return {
    text,
    icon_url: constants.FOOTER_ICON_URI,
  };
}

module.exports = {
  commandAliases: ['leaderboard', 'lb'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'leaderboard409359',
  shortDescription: 'View leaderboards for quiz and/or shiritori',
  longDescription: 'View leaderboards for quiz and/or shiritori. I keep track of scores per server and per deck. Here are some example commands:\n\n**<prefix>lb** - View all quiz scores in this server\n**<prefix>lb shiritori** - View shiritori scores in this server\n**<prefix>lb global** - View all quiz scores globally\n**<prefix>lb global N1** - View the global leaderboard for the N1 quiz deck\n**<prefix>lb global N1+N2+N3** - View the combined global leaderboard for the N1, N2, and N3 decks.\n\nThere are also three deck groups that you can view easily like this:\n\n**<prefix>lb anagrams**\n**<prefix>lb jlpt**\n**<prefix>lb kanken**',
  action: async function action(bot, msg, suffix, monochrome) {
    let title = '';
    let footer = {};
    let description = '';
    let scoresResult;

    let suffixReplaced = suffix.toLowerCase();
    const isGlobal = suffixReplaced.indexOf('global') !== -1 || !msg.channel.guild;
    suffixReplaced = suffixReplaced.replace(/global/g, '');

    const deckNamesArray = getDeckNamesArray(suffixReplaced);
    const didSpecifyDecks = deckNamesArray.length > 0;
    const deckNamesTitlePart = getDeckNamesTitlePart(deckNamesArray);

    const { prefix } = msg;
    if (isGlobal) {
      title = `Global leaderboard${deckNamesTitlePart}`;
      description = 'The top scorers in the whole wide world.';

      if (!didSpecifyDecks) {
        footer = createFooter(`Say '${prefix}lb global deckname' to see the global leaderboard for a deck.`);
      }

      scoresResult = await ScoreStorageUtils.getGlobalScores(deckNamesArray);
    } else {
      title = `Server leaderboard for **${msg.channel.guild.name}** ${deckNamesTitlePart}`;
      description = 'The top scorers in this server.';
      footer = createFooter(`Say '${prefix}lb global' to see the global leaderboard. Say '${prefix}lb deckname' to see a deck leaderboard.`);
      scoresResult = await ScoreStorageUtils.getServerScores(msg.channel.guild.id, deckNamesArray);
    }

    if (scoresResult.unfoundDeckName !== undefined) {
      return notifyDeckNotFound(msg, scoresResult.unfoundDeckName);
    }

    if (!footer.text) {
      footer = createFooter(`You can mix any decks by using the + symbol. For example: ${prefix}lb N5+N4+N3`);
    }

    return sendScores(
      msg,
      scoresResult.rows,
      title,
      description,
      footer,
      monochrome.getNavigationManager(),
      prefix,
    );
  },
};
