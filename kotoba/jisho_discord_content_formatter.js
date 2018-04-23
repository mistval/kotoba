/* The functions in this file take cross-platform Jisho data
 * and convert it into an array of Discord message contents. */

const reload = require('require-reload')(require);

const constants = reload('./constants.js');

const { throwPublicErrorInfo } = reload('./util/errors.js');

const MAX_LINES_PER_BIG_PAGE = 11;

function throwForEmptyJishoData(jishoData) {
  return throwPublicErrorInfo('Jisho', `I didn't find any results for **${jishoData.searchPhrase}**.`, 'No results');
}

function nextEntryFitsOnPage(linesSoFar, nextEntry) {
  if (linesSoFar === 0) {
    return true;
  }

  return linesSoFar + 1 + nextEntry.resultMeanings.length <= MAX_LINES_PER_BIG_PAGE;
}

function getFieldNameForEntry(entry) {
  return entry.wordsAndReadings.map((wordAndReadings) => {
    const { word, readings } = wordAndReadings;
    if (readings.length === 0) {
      return word;
    }

    return `${word} (${readings.join(', ')})`;
  }).join(', ');
}

function getFieldValueForEntry(entry) {
  return entry.resultMeanings.map((meaning, index) => {
    const meaningNumber = index + 1;
    const { definition, tags } = meaning;

    let line = `${meaningNumber}. ${definition}`;
    if (tags.length > 0) {
      line += ` *[${tags.join(', ')}]*`;
    }

    return line;
  }).join('\n');
}

function getFieldForEntry(entry) {
  return {
    name: getFieldNameForEntry(entry),
    value: getFieldValueForEntry(entry),
  };
}

function formatJishoDataBig(
  jishoData,
  pagingPermitted,
  forMultiChapterNavigation,
  callerName,
) {
  if (!jishoData.hasResults) {
    return throwForEmptyJishoData(jishoData);
  }

  const discordContents = [];
  const dictionaryEntriesQueue = jishoData.dictionaryEntries.slice().reverse();

  while (dictionaryEntriesQueue.length > 0) {
    const embed = {
      title: jishoData.searchPhrase,
      color: constants.EMBED_NEUTRAL_COLOR,
      url: jishoData.uri,
      fields: [],
    };

    let nextEntry = dictionaryEntriesQueue.pop();
    let lines = 0;
    while (!!nextEntry && nextEntryFitsOnPage(lines, nextEntry)) {
      lines += 1 + nextEntry.resultMeanings.length;
      embed.fields.push(getFieldForEntry(nextEntry));
      nextEntry = dictionaryEntriesQueue.pop();
    }

    // The entry exists but doesn't fit on this page.
    // Put it back on the queue for next page.
    if (nextEntry) {
      dictionaryEntriesQueue.push(nextEntry);
    }

    discordContents.push({ embed });
  }

  const numberOfPages = discordContents.length;
  if (pagingPermitted && (numberOfPages > 1 || forMultiChapterNavigation)) {
    for (let index = 0; index < numberOfPages; index += 1) {
      const discordContent = discordContents[index];
      discordContent.embed.title += ` (page ${index + 1} of ${numberOfPages})`;
      discordContent.embed.footer = {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${callerName} can use the reaction buttons below to see more information!`,
      };
    }
  }

  return discordContents;
}

module.exports = {
  formatJishoDataBig,
};
