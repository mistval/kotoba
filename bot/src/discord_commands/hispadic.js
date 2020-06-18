const { Navigation } = require('monochrome-bot');
const axios = require('axios').create({ timeout: 10000 });
const constants = require('../common/constants.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = require('./../common/util/errors.js');
const { hispadicApiUri } = require('./../../../config/config.js').bot;

const MAX_LINES_PER_PAGE = 16;

function createFieldForResult(result) {
  const readingsPart = result.readings.length > 0 ? ` (${result.readings.join(', ')})` : '';

  return {
    name: `${result.kanji.join(', ')}${readingsPart}`,
    value: result.glosses.map((gloss, i) => `${i + 1}. ${gloss.definition}`).join('\n'),
  };
}

function createMessageContentsForResults(pages, query, username) {
  let footer;
  if (pages.length > 1) {
    footer = {
      icon_url: constants.FOOTER_ICON_URI,
      text: `${username} puede usar las reacciones abajo para ver más información.`,
    };
  }

  const numPages = pages.length;
  return pages.map((results, i) => ({
    embed: {
      title: `${query} (Página ${i + 1} de ${numPages})`,
      url: `http://hispadic.byethost3.com/searchres.php?jp=${encodeURIComponent(query)}&accion=Buscar`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: results.map(createFieldForResult),
      footer,
    },
  }));
}

function createNavigationContents(results, query, username) {
  const pages = [];
  let resultsForCurrentPage = [];
  let currentPageLines = 0;

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const thisResultLines = result.glosses.length + 1;

    if (currentPageLines > 0 && currentPageLines + thisResultLines > MAX_LINES_PER_PAGE) {
      pages.push(resultsForCurrentPage);
      resultsForCurrentPage = [result];
      currentPageLines = thisResultLines;
    } else {
      resultsForCurrentPage.push(result);
      currentPageLines += thisResultLines;
    }
  }

  if (resultsForCurrentPage.length > 0) {
    pages.push(resultsForCurrentPage);
  }

  return createMessageContentsForResults(pages, query, username);
}

module.exports = {
  commandAliases: ['español', 'es'],
  uniqueId: 'hispadic_search',
  cooldown: 3,
  shortDescription: 'Buscar Hispadic para resultados del diccionaro Español-Japonés.',
  canBeChannelRestricted: false,
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Español', `Usa ${prefix}español [palabra] para buscar una palabra. Por ejemplo: ${prefix}español 瞬間`, 'No suffix');
    }

    let allResults;
    try {
      allResults = (await axios.get(`${hispadicApiUri}?query=${encodeURIComponent(suffix)}`)).data;
    } catch (err) {
      return throwPublicErrorFatal(
        'Hispadic',
        'Sorry, there was a problem communicating with the Hispadic service, please try again later.', 'Hispadic CF error',
        err,
      );
    }

    const qualityResults = allResults.filter(r => r.matchType > 1);
    const results = qualityResults.length > 0 ? qualityResults : allResults;

    if (results.length === 0) {
      return throwPublicErrorInfo('Español', `No encontré ningún resultado para **${suffix}**.`, 'No results');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const contents = createNavigationContents(results, suffix, msg.author.username);
    const navigation = Navigation.fromOneDimensionalContents(msg.author.id, contents);

    return monochrome.getNavigationManager().show(
      navigation,
      constants.NAVIGATION_EXPIRATION_TIME,
      msg.channel,
      msg,
    );
  },
};
