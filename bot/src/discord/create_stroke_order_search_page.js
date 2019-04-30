const request = require('request-promise');
const constants = require('./../common/constants.js');
const UnofficialJishoApi = require('unofficial-jisho-api');
const { throwPublicErrorFatal } = require('./../common/util/errors.js');

const jishoApi = new UnofficialJishoApi();

function addEmbedFieldForRadical(kanjiInformation, embedFields) {
  const fieldsCopy = [...embedFields];

  if (kanjiInformation.radical && kanjiInformation.radical.symbol) {
    let value = kanjiInformation.radical.symbol;
    if (kanjiInformation.radical.meaning) {
      value += ` (${kanjiInformation.radical.meaning})`;
    }
    fieldsCopy.push({ name: 'Radical', value, inline: true });
    if (kanjiInformation.radical.forms) {
      fieldsCopy.push({ name: 'Radical forms', value: kanjiInformation.radical.forms.join(', '), inline: true });
    }
  }

  return fieldsCopy;
}

function addEmbedFieldForParts(kanjiInformation, embedFields) {
  if (!kanjiInformation.parts || kanjiInformation.parts.length === 0) {
    return embedFields;
  }

  const partsField = { name: 'Parts', value: kanjiInformation.parts.join(', '), inline: true };
  return [...embedFields, partsField];
}

function addEmbedFieldForStrokeCount(kanjiInformation, embedFields) {
  if (!kanjiInformation.strokeCount) {
    return embedFields;
  }

  const countField = {
    name: 'Strokes',
    value: kanjiInformation.strokeCount.toString(),
    inline: true,
  };

  return [...embedFields, countField];
}

function createPageForKanjiDataAndGif(kanjiData, gifUri) {
  if (kanjiData.found) {
    let embedFields = [];
    embedFields = addEmbedFieldForRadical(kanjiData, embedFields);
    embedFields = addEmbedFieldForParts(kanjiData, embedFields);
    embedFields = addEmbedFieldForStrokeCount(kanjiData, embedFields);

    return {
      embed: {
        title: kanjiData.query,
        url: kanjiData.uri,
        fields: embedFields,
        color: constants.EMBED_NEUTRAL_COLOR,
        image: { url: kanjiData.strokeOrderDiagramUri },
        thumbnail: { url: gifUri },
      },
    };
  }

  if (gifUri) {
    return {
      embed: {
        title: kanjiData.query,
        color: constants.EMBED_NEUTRAL_COLOR,
        image: { url: gifUri },
      },
    };
  }

  return {
    embed: {
      url: kanjiData.uri,
      title: 'Stroke Order Search',
      description: `I didn't find any results for [${kanjiData.query}](${kanjiData.uri}).`,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

async function getStrokeOrderGifUri(kanji) {
  const fileCodeStringLength = 5;
  const unicodeString = kanji.codePointAt(0).toString(16);
  const fillZeroes = fileCodeStringLength - unicodeString.length;
  const fileCode = new Array(fillZeroes + 1).join('0') + unicodeString;
  const fileName = `${fileCode}_anim.gif`;
  const animationUri = `https://raw.githubusercontent.com/mistval/kotoba/master/bot/resources/images/kanjianimations/${fileName}`;

  // Check if we can GET the animation.
  // We only need to know if it's available.
  // We don't need to download it.
  try {
    await request(animationUri);
    return animationUri;
  } catch (err) {
    return '';
  }
}

async function getKanjiData(kanji) {
  try {
    return await jishoApi.searchForKanji(kanji);
  } catch (err) {
    return throwPublicErrorFatal('Stroke Order Search', 'Jisho is not responding. Please try again later.', 'Jisho fetch fail', err);
  }
}

async function createPage(kanji) {
  const [kanjiData, strokeOrderGifUri] = await Promise.all([
    getKanjiData(kanji),
    getStrokeOrderGifUri(kanji),
  ]);

  return createPageForKanjiDataAndGif(kanjiData, strokeOrderGifUri);
}

module.exports = createPage;
