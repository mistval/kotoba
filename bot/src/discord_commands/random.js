const { FulfillmentError, Permissions } = require('monochrome-bot');
const jishoWordSearch = require('./../common/jisho_word_search.js');
const constants = require('./../common/constants.js');
const jishoSearch = require('./../discord/jisho_search.js');
const globals = require('./../common/globals.js');

const NUMBER_OF_RETRIES = 50;

const jishoNotRespondingResponse = {
  embed: {
    title: 'Jisho',
    description: 'Sorry, Jisho is not responding, please try again later.',
    color: constants.EMBED_NEUTRAL_COLOR,
  },
};

async function getRandomWordRecursive(suffix, msg, retriesRemaining, monochrome) {
  const navigationManager = monochrome.getNavigationManager();

  if (retriesRemaining <= 0) {
    throw new FulfillmentError({
      publicMessage: jishoNotRespondingResponse,
      logDescription: `Failed to get a random word ${NUMBER_OF_RETRIES} times`,
      logLevel: 'error',
    });
  }

  const word = await globals.resourceDatabase.getRandomWord(suffix);

  let jishoData;
  try {
    jishoData = await jishoWordSearch(word);
  } catch (err) {
    throw new FulfillmentError({
      publicMessage: jishoNotRespondingResponse,
      logDescription: 'Jisho request error',
      err,
    });
  }

  if (!jishoData.hasResults) {
    return getRandomWordRecursive(suffix, msg, retriesRemaining - 1, monochrome);
  }

  const navigation = jishoSearch.createNavigationForJishoResults(
    msg,
    msg.author.username,
    msg.author.id,
    jishoData,
  );

  return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

module.exports = {
  commandAliases: ['random', 'r'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'randomword49390',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for a random word. You can specify a JLPT or 漢検 level if you want.',
  longDescription: 'Search Jisho for a random word. You can specify a JLPT or 漢検 level. The available levels are: N1, N2, N3, N4, N5, 10k, 9k, 8k, 7k, 6k, 5k, 4k, 3k, j2k, 2k, j1k, 1k',
  usageExample: '<prefix>random N3, <prefix>random 2k',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  action(bot, msg, suffix, monochrome) {
    const suffixLowerCase = suffix.toLowerCase();
    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    return getRandomWordRecursive(
      suffixLowerCase,
      msg,
      NUMBER_OF_RETRIES,
      monochrome,
    );
  },
};
