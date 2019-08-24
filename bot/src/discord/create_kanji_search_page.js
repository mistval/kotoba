const UnofficialJishoApi = require('unofficial-jisho-api');
const { throwPublicErrorFatal } = require('../common/util/errors.js');
const constants = require('./../common/constants.js');

const jishoApi = new UnofficialJishoApi();

const MAXIMUM_EXAMPLE_COUNT = 4;
const MAXIMUM_EXAMPLE_LENGTH_IN_CHARS = 300;

function exampleToDiscordBotString(example) {
  let { meaning } = example;
  if (meaning.length > MAXIMUM_EXAMPLE_LENGTH_IN_CHARS) {
    meaning = `${meaning.substring(0, MAXIMUM_EXAMPLE_LENGTH_IN_CHARS - 3)}...`;
  }
  return `${example.example} (${example.reading})\n\t${meaning}`;
}

function commaSepartedStringForYomi(yomiArray) {
  if (!yomiArray || yomiArray.length === 0) {
    return 'N/A';
  }
  return yomiArray.join(', ');
}

function addEmbedFieldsForRadical(kanjiData, embedFields) {
  if (!kanjiData.radical || !kanjiData.radical.symbol) {
    return embedFields;
  }

  const embedFieldsCopy = [...embedFields];

  let value = kanjiData.radical.symbol;
  if (kanjiData.radical.meaning) {
    value += ` (${kanjiData.radical.meaning})`;
  }

  embedFieldsCopy.push({ name: 'Radical', value, inline: true });
  if (kanjiData.radical.forms) {
    embedFieldsCopy.push({ name: 'Radical forms', value: kanjiData.radical.forms.join(', '), inline: true });
  }

  return embedFieldsCopy;
}

function addEmbedFieldsForParts(kanjiData, embedFields) {
  if (!kanjiData.parts || kanjiData.parts.length <= 0) {
    return embedFields;
  }

  const partsField = { name: 'Parts', value: kanjiData.parts.join(', '), inline: true };
  return [...embedFields, partsField];
}

function sortExamplesByHaveDesiredKanji(examples, desiredKanji) {
  const examplesWithDesiredKanji = examples.filter(ex =>
    ex.example.indexOf(desiredKanji) !== -1);

  const examplesWithoutDesiredKanji = examples.filter(ex =>
    ex.example.indexOf(desiredKanji) === -1);

  return examplesWithDesiredKanji.concat(examplesWithoutDesiredKanji);
}

function getExamplesString(kanjiData) {
  let onyomiExamples = sortExamplesByHaveDesiredKanji(
    kanjiData.onyomiExamples,
    kanjiData.query,
  );

  let kunyomiExamples = sortExamplesByHaveDesiredKanji(
    kanjiData.kunyomiExamples,
    kanjiData.query,
  );

  const desiredExamplesCount = MAXIMUM_EXAMPLE_COUNT;

  let desiredOnyomiExamplesCount = Math.min(desiredExamplesCount / 2, onyomiExamples.length);
  let desiredKunyomiExamplesCount = Math.min(desiredExamplesCount / 2, kunyomiExamples.length);

  if (desiredOnyomiExamplesCount + desiredKunyomiExamplesCount < desiredExamplesCount) {
    if (desiredOnyomiExamplesCount < desiredKunyomiExamplesCount) {
      desiredKunyomiExamplesCount = Math.min(
        MAXIMUM_EXAMPLE_COUNT - desiredOnyomiExamplesCount,
        kunyomiExamples.length,
      );
    } else {
      desiredOnyomiExamplesCount = Math.min(
        MAXIMUM_EXAMPLE_COUNT - desiredKunyomiExamplesCount,
        onyomiExamples.length,
      );
    }
  }

  kunyomiExamples = kunyomiExamples.slice(0, desiredKunyomiExamplesCount);
  onyomiExamples = onyomiExamples.slice(0, desiredOnyomiExamplesCount);

  const examples = sortExamplesByHaveDesiredKanji(
    kunyomiExamples.concat(onyomiExamples),
    kanjiData.query,
  );

  return examples.map(exampleToDiscordBotString).join('\n');
}

function getDescriptionString(kanjiData) {
  const descriptionLines = [];
  if (kanjiData.taughtIn) {
    descriptionLines.push(`Taught in ${kanjiData.taughtIn}`);
  }
  if (kanjiData.jlptLevel) {
    descriptionLines.push(`JLPT ${kanjiData.jlptLevel}`);
  }
  if (kanjiData.newspaperFrequencyRank) {
    descriptionLines.push(`newspaper frequency rank #${kanjiData.newspaperFrequencyRank}.`);
  }
  return descriptionLines.join(', ');
}

function createPageForKanjiData(kanjiData, prefix) {
  if (!kanjiData.found) {
    return {
      embed: {
        url: kanjiData.uri,
        title: 'Jisho Kanji Search',
        description: `I didn't find any results for [${kanjiData.query}](${kanjiData.uri}).`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
  }

  let embedFields = [
    { name: 'Kunyomi', inline: true, value: commaSepartedStringForYomi(kanjiData.kunyomi) },
    { name: 'Onyomi', inline: true, value: commaSepartedStringForYomi(kanjiData.onyomi) },
  ];

  embedFields = addEmbedFieldsForRadical(kanjiData, embedFields);
  embedFields = addEmbedFieldsForParts(kanjiData, embedFields);

  if (kanjiData.strokeCount) {
    embedFields.push({ name: 'Stroke Count', inline: true, value: kanjiData.strokeCount });
  }
  if (kanjiData.meaning) {
    embedFields.push({ name: 'Meaning', inline: true, value: kanjiData.meaning });
  }

  const examplesStr = getExamplesString(kanjiData);
  if (examplesStr) {
    embedFields.push({ name: 'Examples', inline: true, value: examplesStr });
  }

  const unicodeString = kanjiData.query.codePointAt(0).toString(16);
  const fileName = `${unicodeString}.png`;
  const thumbnailInfo = { url: `https://raw.githubusercontent.com/mistval/kanji_images/master/pngs/${fileName}` };

  return {
    embed: {
      title: kanjiData.query,
      description: getDescriptionString(kanjiData),
      url: kanjiData.uri,
      fields: embedFields,
      thumbnail: thumbnailInfo,
      color: constants.EMBED_NEUTRAL_COLOR,
      footer: {
        text: `Wanna see detailed stroke information for this Kanji? Try '${prefix}so ${kanjiData.query}'`,
        icon_url: constants.FOOTER_ICON_URI,
      },
    },
  };
}

async function createPage(kanji, prefix) {
  let kanjiData;

  try {
    kanjiData = await jishoApi.searchForKanji(kanji);
  } catch (err) {
    return throwPublicErrorFatal('Jisho Kanji Search', 'Jisho is not responding. Please try again later.', 'Jisho fetch fail', err);
  }

  return createPageForKanjiData(kanjiData, prefix);
}

module.exports = createPage;
