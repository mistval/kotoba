const axios = require('axios').create({ timeout: 10000 });
const cheerio = require('cheerio');
const UnofficialJishoApi = require('unofficial-jisho-api');

const errors = require('./util/errors.js');
const extractKanji = require('./util/extract_kanji.js');

const jishoApi = new UnofficialJishoApi();

async function searchKanjiFromWord(word) {
  const kanjiURI = jishoApi.getUriForKanjiSearch(word);

  try {
    const response = await axios.get(kanjiURI);
    const $ = cheerio.load(response.data);
    const kanjis = $('.character a').text();
    return extractKanji(kanjis);
  } catch (err) {
    return errors.throwPublicErrorFatal('Jisho', 'Sorry, Jisho is not responding. Please try again later.', 'Error fetching from Jisho', err);
  }
}

module.exports = searchKanjiFromWord;
