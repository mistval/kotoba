const shiritoriManager = require('shiritori');
const globals = require('./../common/globals.js');
const constants = require('./../common/constants.js');
const retryPromise = require('./../common/util/retry_promise.js');

const japaneseGameStrategy = shiritoriManager.strategies.japanese;

const SHIRITORI_CHANNELS_LIST_KEY = 'shiritoriForeverChannels';
const CHANNEL_SHIRITORI_KEY_PREFIX = 'shiritoriChannel_';

let shiritoriChannels;

function createKeyForChannel(channelID) {
  return `${CHANNEL_SHIRITORI_KEY_PREFIX}${channelID}`;
}

function sendDisabledMessage(monochrome, channelID) {
  return retryPromise(() => monochrome.getErisBot().createMessage(channelID, {
    embed: {
      title: 'Shiritori Forever disabled',
      description: 'Shiritori is no longer running in this channel',
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  }));
}

function sendEnabledMessage(monochrome, channelID) {
  return retryPromise(() => monochrome.getErisBot().createMessage(channelID, {
    embed: {
      title: 'Shiritori Forever enabled',
      description: 'Shiritori forever is now running in this channel. I\'ll go first!',
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  }));
}

function createMarkdownLinkForWord(word) {
  return `[${word}](http://jisho.org/search/${encodeURIComponent(word)})`;
}

function createMessageForTurnTaken(monochrome, channelID, userID, wordInformation, userScore) {
  const bot = monochrome.getErisBot();
  const username = bot.users.get(userID).username;
  const { word, reading, meaning, nextWordMustStartWith } = wordInformation;
  const readingStringPart = reading ? ` (${reading})` : '';
  const scoreStringPart = userScore ? ` (${userScore})` : '';

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
    }
  ];

  return retryPromise(() => bot.createMessage(channelID, {
    embed: {
      fields,
      color: constants.EMBED_NEUTRAL_COLOR,
    }
  }));
}

async function sendFirstWord(monochrome, channelID) {
  const persistence = monochrome.getPersistence();
  const result = await japaneseGameStrategy.getViableNextResult([]);
  const wordInformation = result.word;

  await persistence.editData(createKeyForChannel(channelID), (data) => {
    data.previousWordInformation = wordInformation;
    return data;
  });

  return createMessageForTurnTaken(
    monochrome,
    channelID,
    monochrome.getErisBot().user.id,
    wordInformation,
  );
}

async function handleEnabledChanged(channelID, newInternalValue) {
  const { monochrome } = globals;
  const persistence = monochrome.getPersistence();

  let changed = false;
  await persistence.editData(SHIRITORI_CHANNELS_LIST_KEY, (data) => {
    changed = newInternalValue != data[channelID];

    if (newInternalValue) {
      data[channelID] = true;
    } else {
      delete data[channelID];
    }

    shiritoriChannels = data;
    return data;
  });

  const shiritoriDataKey = createKeyForChannel(channelID);

  await persistence.editData(SHIRITORI_CHANNELS_LIST_KEY, (data) => {
    if (changed || !newInternalValue) {
      return {};
    }

    return data;
  });

  if (changed) {
    if (newInternalValue) {
      await sendEnabledMessage(monochrome, channelID);
      await sendFirstWord(monochrome, channelID);
    } else {
      await sendDisabledMessage(monochrome, channelID);
    }
  }
}

module.exports = {
  handleEnabledChanged,
};
