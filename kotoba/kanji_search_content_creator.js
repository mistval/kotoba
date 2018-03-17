'use strict'
const reload = require('require-reload')(require);
const searchForKanji = new (require('unofficial-jisho-api'))().searchForKanji;
const constants = reload('./constants.js');
const PublicError = reload('monochrome-bot').PublicError;

const MAXIMUM_EXAMPLE_COUNT = 4;
const MAXIMUM_EXAMPLE_LENGTH_IN_CHARS = 300;

function exampleToDiscordBotString(example) {
  let meaning = example.meaning;
  if (meaning.length > MAXIMUM_EXAMPLE_LENGTH_IN_CHARS) {
    meaning = meaning.substring(0, MAXIMUM_EXAMPLE_LENGTH_IN_CHARS - 3) + '...';
  }
  return example.example + ' (' + example.reading + ')\n\t' + meaning;
}

function commaSepartedStringForYomi(yomiArray) {
  if (!yomiArray || yomiArray.length === 0) {
    return 'N/A';
  } else {
    return yomiArray.join(', ');
  }
}

function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title: title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

function addEmbedFieldForRadical(kanjiInformation, embedFields) {
  if (kanjiInformation.radical && kanjiInformation.radical.symbol) {
    let value = kanjiInformation.radical.symbol;
    if (kanjiInformation.radical.meaning) {
      value += ' (' + kanjiInformation.radical.meaning + ')';
    }
    embedFields.push({name: 'Radical', value: value, inline: true});
    if (kanjiInformation.radical.forms) {
      embedFields.push({name: 'Radical forms', value: kanjiInformation.radical.forms.join(', '), inline: true});
    }
  }
}

function addEmbedFieldForParts(kanjiInformation, embedFields) {
  if (kanjiInformation.parts && kanjiInformation.parts.length > 0) {
    embedFields.push({name: 'Parts', value: kanjiInformation.parts.join(', '), inline: true});
  }
}

function sortExamplesByHaveDesiredKanji(examples, desiredKanji) {
  let examplesWithDesiredKanji = [];
  let examplesWithoutDesiredKanji = [];
  for (let example of examples) {
    if (example.example.indexOf(desiredKanji) !== -1) {
      examplesWithDesiredKanji.push(example);
    } else {
      examplesWithoutDesiredKanji.push(example);
    }
  }
  return examplesWithDesiredKanji.concat(examplesWithoutDesiredKanji);
}

function getExamplesString(kanjiInformation) {
  let onyomiExamples = sortExamplesByHaveDesiredKanji(kanjiInformation.onyomiExamples, kanjiInformation.query);
  let kunyomiExamples = sortExamplesByHaveDesiredKanji(kanjiInformation.kunyomiExamples, kanjiInformation.query);

  let desiredExamplesCount = MAXIMUM_EXAMPLE_COUNT;
  let desiredOnyomiExamplesCount = Math.min(MAXIMUM_EXAMPLE_COUNT / 2, onyomiExamples.length);
  let desiredKunyomiExamplesCount = Math.min(MAXIMUM_EXAMPLE_COUNT / 2, kunyomiExamples.length);
  if (desiredOnyomiExamplesCount + desiredKunyomiExamplesCount < desiredExamplesCount) {
    if (desiredOnyomiExamplesCount < desiredKunyomiExamplesCount) {
      desiredKunyomiExamplesCount = Math.min(MAXIMUM_EXAMPLE_COUNT - desiredOnyomiExamplesCount, kunyomiExamples.length);
    } else {
      desiredOnyomiExamplesCount = Math.min(MAXIMUM_EXAMPLE_COUNT - desiredKunyomiExamplesCount, onyomiExamples.length);
    }
  }

  kunyomiExamples = kunyomiExamples.slice(0, desiredKunyomiExamplesCount);
  onyomiExamples = onyomiExamples.slice(0, desiredOnyomiExamplesCount);
  let examples = sortExamplesByHaveDesiredKanji(kunyomiExamples.concat(onyomiExamples), kanjiInformation.query);

  let examplesStr = '';
  for (let example of examples) {
    examplesStr += exampleToDiscordBotString(example) + '\n';
  }

  return examplesStr;
}

function getDescriptionString(kanjiInformation) {
  let descriptionLines = [];
  if (kanjiInformation.taughtIn) {
    descriptionLines.push(`Taught in ${kanjiInformation.taughtIn}`);
  }
  if (kanjiInformation.jlptLevel) {
    descriptionLines.push(`JLPT ${kanjiInformation.jlptLevel}`);
  }
  if (kanjiInformation.newspaperFrequencyRank) {
    descriptionLines.push(`newspaper frequency rank #${kanjiInformation.newspaperFrequencyRank}.`);
  }
  return descriptionLines.join(', ');
}

function convertToDiscordBotContent(kanjiInformation) {
  if (!kanjiInformation.found) {
    return createTitleOnlyEmbed('No results found for the kanji: ' + kanjiInformation.query);
  }

  let content = {};
  let embedFields = [
    {name: 'Kunyomi', inline: true, value: commaSepartedStringForYomi(kanjiInformation.kunyomi)},
    {name: 'Onyomi', inline: true, value: commaSepartedStringForYomi(kanjiInformation.onyomi)},
  ];

  addEmbedFieldForRadical(kanjiInformation, embedFields);
  addEmbedFieldForParts(kanjiInformation, embedFields);

  if (kanjiInformation.strokeCount) {
    embedFields.push({name: 'Stroke Count', inline: true, value: kanjiInformation.strokeCount});
  }
  if (kanjiInformation.meaning) {
    embedFields.push({name: 'Meaning', inline: true, value: kanjiInformation.meaning});
  }

  let examplesStr = getExamplesString(kanjiInformation);

  const fileCodeStringLength = 5;
  let unicodeString = kanjiInformation.query.codePointAt(0).toString(10);
  let fileName = unicodeString + '.png';
  let thumbnailInfo = {url: 'https://raw.githubusercontent.com/mistval/kotoba/master/kotoba/resources/images/kanjipngs/' + fileName};

  if (examplesStr) {
    embedFields.push({name: 'Examples', inline: true, value: examplesStr});
  }

  content.embed = {
    'title': 'Information about the Kanji: ' + kanjiInformation.query,
    'description': getDescriptionString(kanjiInformation),
    'url': kanjiInformation.uri,
    'fields': embedFields,
    'thumbnail': thumbnailInfo,
    'color': constants.EMBED_NEUTRAL_COLOR,
    'footer': {
      'text': 'Wanna see detailed stroke information for this Kanji? Try k!so ' + kanjiInformation.query,
      'icon_url': constants.FOOTER_ICON_URI,
    }
  };

  return content;
}

module.exports.createContent = function(kanji) {
  if (!kanji) {
    throw new Error('No Kanji');
  }
  return searchForKanji(kanji).catch(err => {
    let embed = createTitleOnlyEmbed('Jisho is not responding. Please try again later.');
    throw PublicError.createWithCustomPublicMessage(embed, true, 'Jisho fetch fail', err);
  }).then(result => {
    return convertToDiscordBotContent(result);
  });
};
