const { FulfillmentError, PaginatedMessage } = require('monochrome-bot');
const jishoWordSearch = require('../common/jisho_word_search.js');
const JishoDiscordContentFormatter = require('./jisho_discord_content_formatter.js');
const constants = require('../common/constants.js');
const jishoSearch = require('./jisho_search.js');
const globals = require('../common/globals.js');
const createKanjiSearchPage = require('./create_kanji_search_page.js');
const createExampleSearchPages = require('./create_example_search_pages.js');

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
  showStrokeOrder = false,
  showExamples = false,
) {
  if (retriesRemaining <= 0) {
    throw new FulfillmentError({
      publicMessage: jishoNotRespondingResponse,
      logDescription: `Failed to get a random word ${NUMBER_OF_RETRIES} times`,
      logLevel: 'error',
    });
  }

  const word = globals.resourceDatabase.getRandomWord(level);

  let jishoData;
  try {
    jishoData = await jishoWordSearch(word);
  } catch (err) {
    throw new FulfillmentError({
      publicMessage: jishoNotRespondingResponse,
      logDescription: 'Jisho request error',
      error: err,
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

    const paginatedMessageId = `random_word_${word}`;
    return PaginatedMessage.sendAsMessageReply(msg, navigation, { id: paginatedMessageId });
  }
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    jishoData,
    false,
  );

  const firstPage = discordContents[0];
  if (showStrokeOrder || showExamples) {
    if (firstPage.embed.fields.length > 1) {
      firstPage.embed.title += ' (click here for more results)';
    }
    firstPage.embed.fields = [firstPage.embed.fields[0]]; // discards the rest of the results
    await channel.createMessage(firstPage);
  }
  if (showStrokeOrder) {
    const kanji = word.match(/([\u4e00-\u9faf])/g) || [];
    const kanjiPages = await Promise.all(
      kanji.map((char) => createKanjiSearchPage(char, undefined, true)),
    );

    for (let i = 0; i < kanjiPages.length; i += 1) {
      /* eslint-disable-next-line no-await-in-loop */
      await channel.createMessage(kanjiPages[i]); // we need to show the kanjis in the correct order
    }
    if (!showExamples) return null;
  }
  if (showExamples) {
    const examples = await createExampleSearchPages(word);
    if (examples.length > 1) {
      [examples[0].embed.title] = examples[0].embed.title.split(' ('); // removes the '(Page 1 of X)' from the title
      examples[0].embed.title += ' (click here for more examples)';
    }
    const example = examples[0]; // discards the other pages
    return channel.createMessage(example);
  }
  return channel.createMessage(firstPage);
}

module.exports = showRandomWord;
