

const ScoreStorageUtils = require('./../common/quiz/score_storage_utils.js');
const constants = require('./../common/constants.js');
const { Navigation, FulfillmentError, NavigationChapter, Permissions } = require('monochrome-bot');

const MAX_SCORERS_PER_PAGE = 20;

const deckNamesForGroupAlias = {
  anagrams: [
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

function addCommasToNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function createFieldForScorer(index, username, score) {
  return {
    name: `${index + 1}) ${username}`,
    value: `${addCommasToNumber(score)} points`,
    inline: true,
  };
}

function notifyDeckNotFound(deckName) {
  const content = {
    embed: {
      title: 'Leaderboard',
      description: `I don't have a deck named **${deckName}**.`,
      color: constants.EMBED_WRONG_COLOR,
    },
  };

  throw new FulfillmentError({
    publicMessage: content,
    logDescription: 'No such deck found',
  });
}

function getDeckNames(argumentString) {
  const deckNamesStringTrimmed = argumentString.trim();
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

  return deckNamesArrayUnaliased.filter((e, i) => deckNamesArrayUnaliased.indexOf(e) === i);
}

function createFooter(isGlobal, deckNames, prefix) {
  let text = '';

  if (isGlobal) {
    if (deckNames.length === 0) {
      text = `Say '${prefix}lb global deckname' to see a global deck leaderboard. For example: k!lb global N5.`;
    } else if (deckNames.length === 1) {
      text = `You can combine deck leaderboards using the + symbol. Like this: ${prefix}lb global N1+N2+N3.`;
    } else {
      text = `Say '${prefix}help lb' for help viewing leaderboards.`;
    }
  } else {
    text = `Say '${prefix}lb global' to see the global leaderboard.`;
  }

  return {
    text,
    icon_url: constants.FOOTER_ICON_URI,
  };
}

function createDescription(numUsers, totalScore, isGlobal, prefix) {
  let description = '';
  if (isGlobal) {
    description += 'The top scorers in the whole wide world.\n';
  } else {
    description += 'The top scorers in this server.\n';
  }

  description += `${addCommasToNumber(totalScore)} points have been scored by ${addCommasToNumber(numUsers)} players.\n`;
  description += `Say **${prefix}help lb** for help viewing leaderboards.`;

  return description;
}

function createTitle(deckNamesArray, serverName) {
  let deckNamesString = '';
  if (deckNamesArray.length > 5) {
    deckNamesString = ` (${deckNamesArray.slice(0, 5).join(', ')}, ...)`;
  } else if (deckNamesArray.length > 0) {
    deckNamesString = ` (${deckNamesArray.join(', ')})`;
  }

  if (serverName) {
    return `Server Leaderboard for **${serverName}**${deckNamesString}`;
  }

  return `Global Leaderboard${deckNamesString}`;
}

function userRankIsInRange(startIndex, records, userRank) {
  return startIndex <= userRank && startIndex + records.length > userRank;
}

function createScorerFields(startIndex, records, userRank, userScore, userName) {
  const fields = records.map((record, index) =>
    createFieldForScorer(startIndex + index, record.lastKnownUsername, record.score));

  if (userRank !== undefined && !userRankIsInRange(startIndex, records, userRank)) {
    fields.push(createFieldForScorer(userRank, userName, userScore));
  }

  return fields;
}

class ScoresDataSource {
  constructor(deckNames, isGlobal, scoreQuery, msg) {
    this.deckNames = deckNames;
    this.isGlobal = isGlobal;
    this.scoreQuery = scoreQuery;
    this.msg = msg;
    this.getUserRankAndScorePromise = scoreQuery.getUserRankAndScore(msg.author.id);
    this.getNumUsersPromise = scoreQuery.countUsers();
    this.getTotalScorePromise = scoreQuery.countTotalScore();
  }

  prepareData() {
    // NOOP
  }

  async getPageFromPreparedData(_, pageIndex) {
    const startIndex = pageIndex * MAX_SCORERS_PER_PAGE;
    const endIndex = startIndex + MAX_SCORERS_PER_PAGE;
    const username = `${this.msg.author.username}#${this.msg.author.discriminator}`;

    if (startIndex > 0 && startIndex >= this.numUsers) {
      return undefined;
    }

    const [scores, numUsers, totalScore, userRankAndScore] = await Promise.all([
      this.scoreQuery.getScores(startIndex, endIndex),
      this.getNumUsersPromise,
      this.getTotalScorePromise,
      this.getUserRankAndScorePromise,
    ]);

    const userRank = (userRankAndScore || {}).rank;
    const userScore = (userRankAndScore || {}).score;

    return {
      embed: {
        color: constants.EMBED_NEUTRAL_COLOR,
        title: createTitle(this.deckNames, this.isGlobal ? undefined : this.msg.channel.guild.name),
        description: createDescription(numUsers, totalScore, this.isGlobal, this.msg.prefix),
        fields: createScorerFields(startIndex, scores, userRank, userScore, username),
        footer: createFooter(this.isGlobal, this.deckNames, this.msg.prefix),
      },
    };
  }
}

module.exports = {
  commandAliases: ['leaderboard', 'lb'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'leaderboard409359',
  shortDescription: 'View leaderboards for quiz and/or shiritori',
  longDescription: 'View leaderboards for quiz and/or shiritori. I keep track of scores per server and per deck. Here are some example commands:\n\n**<prefix>lb** - View all quiz scores in this server\n**<prefix>lb shiritori** - View shiritori scores in this server\n**<prefix>lb global** - View all quiz scores globally\n**<prefix>lb global N1** - View the global leaderboard for the N1 quiz deck\n**<prefix>lb global N1+N2+N3** - View the combined global leaderboard for the N1, N2, and N3 decks.\n\nThere are also three deck groups that you can view easily like this:\n\n**<prefix>lb anagrams**\n**<prefix>lb jlpt**\n**<prefix>lb kanken**\n\nA server admin can reset the server leaderboard with **<prefix>resetserverleaderboard**',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  async action(bot, msg, suffix, monochrome) {
    let suffixReplaced = suffix.toLowerCase();
    const isGlobal = suffixReplaced.indexOf('global') !== -1 || !msg.channel.guild;
    suffixReplaced = suffixReplaced.replace(/global/g, '');
    const deckNamesArray = getDeckNames(suffixReplaced);

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    let scoreQuery;

    try {
      if (isGlobal) {
        scoreQuery = await ScoreStorageUtils.getGlobalScores(deckNamesArray);
      } else {
        scoreQuery = await ScoreStorageUtils.getServerScores(msg.channel.guild.id, deckNamesArray);
      }
    } catch (err) {
      if (err.code === ScoreStorageUtils.DECK_NOT_FOUND_ERROR_CODE) {
        return notifyDeckNotFound(err.notFoundName);
      }

      throw err;
    }

    const numUsers = await scoreQuery.countUsers();

    const showArrows = numUsers > MAX_SCORERS_PER_PAGE;
    const navigationDataSource = new ScoresDataSource(
      deckNamesArray,
      isGlobal,
      scoreQuery,
      msg,
    );

    const navigationChapter = new NavigationChapter(navigationDataSource);
    const navigation = Navigation.fromOneNavigationChapter(
      msg.author.id,
      navigationChapter,
      showArrows,
    );

    return monochrome.getNavigationManager().show(
      navigation,
      constants.NAVIGATION_EXPIRATION_TIME,
      msg.channel,
      msg,
    );
  },
};
