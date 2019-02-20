const reload = require('require-reload')(require);
const { PublicError } = require('monochrome-bot');

const getRandomWord = reload('./../common/get_random_word.js');
const jishoWordSearch = reload('./../common/jisho_word_search.js');
const constants = reload('./../common/constants.js');
const jishoSearch = reload('./../common/jisho_search.js');

const NUMBER_OF_RETRIES = 50;

const jishoNotRespondingResponse = {
  embed: {
    title: 'Jisho',
    description: 'Sorry, Jisho is not responding, please try again later.',
    color: constants.EMBED_NEUTRAL_COLOR,
  },
};

async function getRandomWordRecusive(suffix, msg, retriesRemaining, logger, navigationManager) {
  if (retriesRemaining <= 0) {
    throw PublicError.createWithCustomPublicMessage(
      jishoNotRespondingResponse,
      false,
      `Failed to get a random word ${NUMBER_OF_RETRIES} times`,
      err
    );
  }

  const word = getRandomWord(suffix);

  let jishoData;
  try {
    jishoData = await jishoWordSearch(word);
  } catch (err) {
    throw PublicError.createWithCustomPublicMessage(jishoNotRespondingResponse, false, 'Jisho request error', err);
  }

  if (!jishoData.hasResults) {
    return getRandomWordRecusive(suffix, msg, retriesRemaining - 1, logger);
  }

  return jishoSearch.createNavigationForJishoResults(
    msg,
    msg.author.username,
    msg.author.id,
    jishoData,
    navigationManager,
  );
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
  action(bot, msg, suffix, monochrome) {
    const suffixLowerCase = suffix.toLowerCase();
    return getRandomWordRecusive(
      suffixLowerCase,
      msg,
      NUMBER_OF_RETRIES,
      monochrome.getLogger(),
      monochrome.getNavigationManager(),
    );
  },
};
