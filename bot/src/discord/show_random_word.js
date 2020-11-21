const { FulfillmentError } = require('monochrome-bot');
const jishoWordSearch = require('./../common/jisho_word_search.js');
const JishoDiscordContentFormatter = require('./jisho_discord_content_formatter.js');
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

async function showRandomWord(
  level,
  channel,
  monochrome,
  msg = undefined,
  retriesRemaining = NUMBER_OF_RETRIES,
) {
  const navigationManager = monochrome.getNavigationManager();

  if (retriesRemaining <= 0) {
    throw new FulfillmentError({
      publicMessage: jishoNotRespondingResponse,
      logDescription: `Failed to get a random word ${NUMBER_OF_RETRIES} times`,
      logLevel: 'error',
    });
  }

  const word = await globals.resourceDatabase.getRandomWord(level);

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
    return showRandomWord(level, channel, monochrome, msg, retriesRemaining - 1);
  }

  if (msg) {
    const navigation = jishoSearch.createNavigationForJishoResults(
      msg,
      msg.author.username,
      msg.author.id,
      jishoData,
    );

    return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, channel, msg);
  }
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    jishoData,
    false,
  );

  const firstPage = discordContents[0];
  return channel.createMessage(firstPage);
}

module.exports = showRandomWord;
