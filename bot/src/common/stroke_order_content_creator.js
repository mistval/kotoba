const request = require('request-promise');
const constants = require('./constants.js');
const UnofficialJishoApi = require('unofficial-jisho-api');

const jishoApi = new UnofficialJishoApi();
const { PublicError } = require('monochrome-bot');

function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

function addEmbedFieldForRadical(kanjiInformation, embedFields) {
  if (kanjiInformation.radical && kanjiInformation.radical.symbol) {
    let value = kanjiInformation.radical.symbol;
    if (kanjiInformation.radical.meaning) {
      value += ` (${kanjiInformation.radical.meaning})`;
    }
    embedFields.push({ name: 'Radical', value, inline: true });
    if (kanjiInformation.radical.forms) {
      embedFields.push({ name: 'Radical forms', value: kanjiInformation.radical.forms.join(', '), inline: true });
    }
  }
}

function addEmbedFieldForParts(kanjiInformation, embedFields) {
  if (kanjiInformation.parts && kanjiInformation.parts.length > 0) {
    embedFields.push({ name: 'Parts', value: kanjiInformation.parts.join(', '), inline: true });
  }
}

function addEmbedFieldForStrokeCount(kanjiInformation, embedFields) {
  if (kanjiInformation.strokeCount) {
    embedFields.push({ name: 'Strokes', value: kanjiInformation.strokeCount.toString(), inline: true });
  }
}

function convertToDiscordBotContent(kanjiInformation) {
  const fileCodeStringLength = 5;
  const unicodeString = kanjiInformation.query.codePointAt(0).toString(16);
  const fillZeroes = fileCodeStringLength - unicodeString.length;
  const fileCode = new Array(fillZeroes + 1).join('0') + unicodeString;
  const fileName = `${fileCode}_anim.gif`;
  const animationUri = `https://raw.githubusercontent.com/mistval/kotoba/master/bot/resources/images/kanjianimations/${fileName}`;

  if (kanjiInformation.found) {
    const embedFields = [];
    addEmbedFieldForRadical(kanjiInformation, embedFields);
    addEmbedFieldForParts(kanjiInformation, embedFields);
    addEmbedFieldForStrokeCount(kanjiInformation, embedFields);

    return {
      embed: {
        title: `Information about the Kanji: ${kanjiInformation.query}`,
        url: kanjiInformation.uri,
        fields: embedFields,
        color: constants.EMBED_NEUTRAL_COLOR,
        image: { url: kanjiInformation.strokeOrderDiagramUri },
        thumbnail: { url: animationUri },
      },
    };
  }

  return request({
    uri: animationUri,
    json: false,
    timeout: 10000,
  }).then(() => ({
    embed: {
      color: constants.EMBED_NEUTRAL_COLOR,
      image: { url: animationUri },
    },
  })).catch(() => createTitleOnlyEmbed(`No results found for the kanji: ${kanjiInformation.query}`));
}

module.exports.createContent = function action(kanji) {
  if (!kanji) {
    throw new Error('No Kanji');
  }
  return jishoApi.searchForKanji(kanji).catch((err) => {
    const embed = createTitleOnlyEmbed('Jisho is not responding. Please try again later.');
    throw PublicError.createWithCustomPublicMessage(embed, true, 'Jisho fetch fail', err);
  }).then(result => convertToDiscordBotContent(result));
};
