/* The functions in this file take cross-platform Jisho data
 * and convert it into an array of Discord message contents. */

const constants = require('../common/constants.js');
const { throwPublicErrorInfo } = require('../common/util/errors.js');
const trimEmbed = require('../common/util/trim_embed.js');

const MAX_LINES_PER_BIG_PAGE = 11;
const MAX_MEANINGS_SMALL = 3;

function throwForEmptyJishoData(jishoData) {
  return throwPublicErrorInfo('Jisho', `I didn't find any results for **${jishoData.searchPhrase}**.`, 'No results');
}

function nextEntryFitsOnPage(linesSoFar, nextEntry) {
  if (linesSoFar === 0) {
    return true;
  }

  const hasTags = nextEntry.resultTags.length > 0;
  const numTagRows = hasTags ? 1 : 0;
  return linesSoFar + 1 + nextEntry.resultMeanings.length + numTagRows <= MAX_LINES_PER_BIG_PAGE;
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

function getLineForMeaning(meaning, meaningNumber) {
  const { definition, tags, seeAlso } = meaning;

  let line = `${meaningNumber}. ${definition}`;
  if (tags.length > 0) {
    line += ` *[${tags.join(', ')}]*`;
  }
  if (seeAlso.length > 0) {
    const linkListString = seeAlso.map((seeAlsoEntry) => `[${seeAlsoEntry.word}](${seeAlsoEntry.uri})`)
      .join(', ');
    line += `  (See also: ${linkListString})`;
  }

  return line;
}

function getFieldValueForEntry(entry) {
  const lines = [];

  if (entry.resultTags.length > 0) {
    lines.push(`\`${entry.resultTags.join(', ')}\``);
  }

  lines.push(...entry.resultMeanings.map((meaning, index) => {
    const meaningNumber = index + 1;
    return getLineForMeaning(meaning, meaningNumber);
  }));

  return lines.join('\n');
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
      lines += 1 + nextEntry.resultMeanings.length + (nextEntry.resultTags.length > 0 ? 1 : 0);
      embed.fields.push(getFieldForEntry(nextEntry));
      nextEntry = dictionaryEntriesQueue.pop();
    }

    // The entry exists but doesn't fit on this page.
    // Put it back on the queue for next page.
    if (nextEntry) {
      dictionaryEntriesQueue.push(nextEntry);
    }

    const trimmedContent = trimEmbed({ embeds: [embed] });
    discordContents.push(trimmedContent);
  }

  const numberOfPages = discordContents.length;
  if (pagingPermitted && (numberOfPages > 1 || forMultiChapterNavigation)) {
    for (let index = 0; index < numberOfPages; index += 1) {
      const discordContent = discordContents[index];
      discordContent.embeds[0].title += ` (page ${index + 1} of ${numberOfPages})`;
    }
  }

  return discordContents;
}

function formatJishoDataSmall(jishoData) {
  if (!jishoData.hasResults) {
    return throwForEmptyJishoData(jishoData);
  }

  const embed = {
    color: constants.EMBED_NEUTRAL_COLOR,
    title: jishoData.searchPhrase,
    url: jishoData.uri,
    fields: [],
  };

  const entry = jishoData.dictionaryEntries[0];
  const { word, readings } = entry.wordsAndReadings[0];
  const meanings = entry.resultMeanings;
  const wordField = {
    name: 'Word',
    value: word,
    inline: true,
  };

  embed.fields.push(wordField);

  if (readings.length > 0) {
    const readingField = {
      name: 'Readings',
      value: readings.join(', '),
      inline: true,
    };

    embed.fields.push(readingField);
  }

  if (meanings.length > 0) {
    const meaningsString = meanings.slice(0, MAX_MEANINGS_SMALL).map((meaning, index) => {
      const meaningNumber = index + 1;
      return getLineForMeaning(meaning, meaningNumber);
    }).join('\n');

    const meaningsField = { name: 'Meanings', value: meaningsString };
    embed.fields.push(meaningsField);
  }

  const trimmedContent = trimEmbed({ embeds: [embed] });
  return trimmedContent;
}

module.exports = {
  formatJishoDataBig,
  formatJishoDataSmall,
};
