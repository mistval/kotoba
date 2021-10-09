const shiritoriManager = require('kotoba-node-common').shiritori;
const assert = require('assert');
const { FulfillmentError } = require('monochrome-bot');
const { Navigation } = require('monochrome-bot');
const globals = require('../common/globals.js');
const state = require('../common/static_state.js');

const sendAndDelete = require('./util/send_and_delete.js');

const constants = require('../common/constants.js');
const retryPromise = require('../common/util/retry_promise.js');
const { chunk } = require('../common/util/array.js');

const JapaneseGameStrategy = shiritoriManager.strategies.japanese;
let japaneseGameStrategy;

const SHIRITORI_CHANNELS_LIST_KEY = 'shiritoriForeverDiscordChannels';
const CHANNEL_SHIRITORI_KEY_PREFIX = 'shiritoriChannelDiscord_';
const DELETE_MESSAGE_TIMEOUT_MS = 60000;

if (!state.shiritoriChannels) {
  state.shiritoriChannels = {};
}

function createMarkdownLinkForWord(word) {
  return `[${word}](http://jisho.org/search/${encodeURIComponent(word)})`;
}

function createKeyForChannel(channelID) {
  return `${CHANNEL_SHIRITORI_KEY_PREFIX}${channelID}`;
}

async function loadChannels(monochrome) {
  try {
    state.shiritoriChannels = await monochrome
      .getPersistence()
      .getData(SHIRITORI_CHANNELS_LIST_KEY);
  } catch (err) {
    const logger = monochrome.getLogger();
    logger.error({
      event: 'ERROR LOADING SHIRITORI CHANNELS',
      err,
    });
  }

  japaneseGameStrategy = new JapaneseGameStrategy(globals.resourceDatabase);
}

function createDiscordContentForScoresPage(scoresPage) {
  const fields = scoresPage.map((scoreInfo) => ({
    name: `${scoreInfo.rank}) ${scoreInfo.username}`,
    value: `${scoreInfo.score} points`,
    inline: true,
  }));

  return {
    embed: {
      title: 'Scores',
      description: 'Shiritori Forever scores in the current channel.\nYou get one point per character in your answer.',
      fields,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

function createScoresNavigation(monochrome, msg, scoresPages) {
  const contents = scoresPages.map((page) => createDiscordContentForScoresPage(page));
  const navigation = Navigation.fromOneDimensionalContents(msg.author.id, contents);

  return monochrome.getNavigationManager().show(
    navigation,
    constants.NAVIGATION_EXPIRATION_TIME,
    msg.channel,
    msg,
  );
}

function userNameForUserID(monochrome, userID) {
  const user = monochrome.getErisBot().users.get(userID);

  if (!user) {
    return 'Unknown User';
  }

  return `${user.username}#${user.discriminator}`;
}

async function sendScores(monochrome, msg) {
  const persistence = monochrome.getPersistence();
  const channelData = await persistence.getData(createKeyForChannel(msg.channel.id));

  const scoreForUserID = channelData.scores || {};
  const nameForUserId = channelData.names || {};

  const sortedScores = Object.keys(scoreForUserID)
    .map((userID) => ({
      username: nameForUserId[userID] || userNameForUserID(monochrome, userID),
      score: scoreForUserID[userID],
    }))
    .sort((a, b) => a.score - b.score)
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }));

  if (sortedScores.length === 0) {
    return msg.channel.createMessage('There aren\'t any Shiritori Forever scores in this channel yet. Maybe Shiritori Forever is not enabled here, or no one has played yet.');
  }

  const pages = chunk(sortedScores, 20);

  return createScoresNavigation(monochrome, msg, pages);
}

function getPrefixForChannelID(monochrome, channelID) {
  const serverID = monochrome.getErisBot().channelGuildMap[channelID];
  const prefixes = monochrome.getPersistence().getPrefixesForServer(serverID);
  return prefixes[0];
}

function createMessageForTurnTaken(monochrome, channelID, userID, wordInformation, userScore) {
  const bot = monochrome.getErisBot();
  const { username } = bot.users.get(userID);
  const {
    word, reading, meaning, nextWordMustStartWith,
  } = wordInformation;
  const readingStringPart = reading ? ` (${reading})` : '';
  const scoreStringPart = userScore ? ` (${userScore})` : '';
  const prefix = getPrefixForChannelID(monochrome, channelID);

  const fields = [
    {
      name: `${username}${scoreStringPart} said`,
      value: `${createMarkdownLinkForWord(word)}${readingStringPart}`,
    },
    {
      name: 'It means',
      value: meaning,
    },
    {
      name: 'Next word starts with',
      value: nextWordMustStartWith.join(', '),
    },
  ];

  return retryPromise(() => bot.createMessage(channelID, {
    embed: {
      fields,
      color: constants.EMBED_NEUTRAL_COLOR,
      footer: {
        text: `Say '${prefix}sf scores' to see the current scores.`,
        icon_url: constants.FOOTER_ICON_URI,
      },
    },
  }));
}

function getPluralizer(array) {
  if (array.length > 1) {
    return 's';
  }
  return '';
}

function discordDescriptionForRejection(rejectionReason, extraData) {
  if (rejectionReason === shiritoriManager.REJECTION_REASON.ReadingAlreadyUsed) {
    return `The reading: **${extraData.join(', ')}** was used recently. Try coming up with a different one ;)`;
  } else if (rejectionReason === shiritoriManager.REJECTION_REASON.ReadingEndsWithN) {
    return `Words in Shiritori can't have readings that end with ん! (**${extraData.join(', ')}**)`;
  } else if (rejectionReason === shiritoriManager.REJECTION_REASON.WrongStartSequence) {
    return `The next word must begin with ${extraData.expected.join(', ')}. I found these readings for that word but they don't start with the right kana: **${extraData.actual.join(', ')}**`;
  } else if (rejectionReason === shiritoriManager.REJECTION_REASON.NotNoun) {
    return `Shiritori words must be nouns! I didn't find any nouns for the reading${getPluralizer(extraData.join)}: **${extraData.join(', ')}**`;
  }

  assert(false, 'Unexpected branch');
  return undefined;
}

function canReact(msg, ownId) {
  if (!msg.channel.permissionsOf) {
    return true;
  }

  const ownPermissions = msg.channel.permissionsOf(ownId);
  return ownPermissions.has('addReactions') && ownPermissions.has('readMessageHistory');
}

async function handleRejectedResult(monochrome, msg, rejectedResult) {
  const { rejectionReason, extraData } = rejectedResult;
  const ownId = monochrome.getErisBot().user.id;

  if (rejectionReason === shiritoriManager.REJECTION_REASON.UnknownWord) {
    if (canReact(msg, ownId)) {
      try {
        return await retryPromise(() => msg.addReaction('❓'));
      } catch (err) {
        throw new FulfillmentError({
          logDescription: 'Failed to add question mark reaction',
          error: err,
        });
      }
    } else {
      throw new FulfillmentError({
        logDescription: 'No permission to add question mark reaction.',
      });
    }
  }

  const description = discordDescriptionForRejection(rejectionReason, extraData);
  try {
    return await retryPromise(() => sendAndDelete(
      monochrome,
      msg.channel.id,
      description,
      DELETE_MESSAGE_TIMEOUT_MS,
    ));
  } catch (err) {
    throw new FulfillmentError({
      logDescription: 'Failed to send rejection reason',
      error: err,
    });
  }
}

async function handleAcceptedResult(monochrome, msg, acceptedResult) {
  let userScore = 0;
  const persistence = monochrome.getPersistence();
  const channelID = msg.channel.id;

  monochrome.updateUserFromREST(msg.author.id).catch(() => {});

  await createMessageForTurnTaken(
    monochrome,
    msg.channel.id,
    msg.author.id,
    acceptedResult.word,
    userScore,
  );

  return persistence.editData(createKeyForChannel(channelID), (data) => {
    const dataCopy = { ...data };
    dataCopy.previousWordInformation = acceptedResult.word;

    if (!dataCopy.scores) {
      dataCopy.scores = {};
    }

    if (!dataCopy.scores[msg.author.id]) {
      dataCopy.scores[msg.author.id] = 0;
    }

    if (!dataCopy.names) {
      dataCopy.names = {};
    }

    dataCopy.names[msg.author.id] = `${msg.author.username}#${msg.author.discriminator}`;
    dataCopy.scores[msg.author.id] += acceptedResult.score;
    userScore = dataCopy.scores[msg.author.id];

    return dataCopy;
  });
}

function tryHandleMessage(monochrome, msg) {
  if (!state.shiritoriChannels[msg.channel.id]) {
    return false;
  }

  if (msg.content.indexOf(' ') !== -1) {
    return false;
  }

  let accepted = false;
  return monochrome.getPersistence().getData(createKeyForChannel(msg.channel.id)).then((data) => {
    const { previousWordInformation } = data;
    return japaneseGameStrategy.tryAcceptAnswer(
      msg.content,
      previousWordInformation ? [previousWordInformation] : [],
      false,
    );
  }).then((acceptanceResult) => {
    ({ accepted } = acceptanceResult);
    if (accepted) {
      return handleAcceptedResult(monochrome, msg, acceptanceResult);
    }
    return handleRejectedResult(monochrome, msg, acceptanceResult);
  })
    .then(() => accepted);
}

function sendDisabledMessage(monochrome, channelID) {
  return retryPromise(() => monochrome.getErisBot().createMessage(channelID, {
    embed: {
      title: 'Shiritori Forever disabled',
      description: 'Shiritori Forever is no longer running in this channel',
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  }));
}

function sendEnabledMessage(monochrome, channelID) {
  return retryPromise(() => monochrome.getErisBot().createMessage(channelID, {
    embed: {
      title: 'Shiritori Forever enabled',
      description: 'Shiritori Forever is now running in this channel. I\'ll go first!',
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  }));
}

async function sendFirstWord(monochrome, channelID) {
  const persistence = monochrome.getPersistence();
  const result = await japaneseGameStrategy.getViableNextResult([]);
  const wordInformation = result.word;

  await createMessageForTurnTaken(
    monochrome,
    channelID,
    monochrome.getErisBot().user.id,
    wordInformation,
  );

  return persistence.editData(createKeyForChannel(channelID), (data) => {
    const dataCopy = { ...data };
    dataCopy.previousWordInformation = wordInformation;
    return dataCopy;
  });
}

async function handleEnabledChanged(channelID, newInternalValue) {
  const { monochrome } = globals;
  const persistence = monochrome.getPersistence();

  let changed = false;
  await persistence.editData(SHIRITORI_CHANNELS_LIST_KEY, (data) => {
    const dataCopy = { ...data };
    changed = newInternalValue !== dataCopy[channelID];

    if (newInternalValue) {
      dataCopy[channelID] = true;
    } else {
      delete dataCopy[channelID];
    }

    state.shiritoriChannels = dataCopy;
    return dataCopy;
  });

  const shiritoriDataKey = createKeyForChannel(channelID);

  await persistence.editData(shiritoriDataKey, (data) => {
    if (changed || !newInternalValue) {
      return {};
    }

    return data;
  });

  try {
    if (changed) {
      if (newInternalValue) {
        await sendEnabledMessage(monochrome, channelID);
        await sendFirstWord(monochrome, channelID);
      } else {
        await sendDisabledMessage(monochrome, channelID);
      }
    }
  } catch (err) {
    monochrome.getLogger().error({
      event: 'SHIRITORI FOREVER ERROR',
      err,
    });
  }
}

module.exports = {
  handleEnabledChanged,
  tryHandleMessage,
  loadChannels,
  sendScores,
};
