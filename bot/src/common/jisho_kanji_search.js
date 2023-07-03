const axios = require('axios').create({ timeout: 10000 });
const cheerio = require('cheerio');
const { cache } = require('kotoba-node-common');
const jishoApi = require('./cached_jisho_api.js');
const errors = require('./util/errors.js');
const extractKanji = require('./util/extract_kanji.js');

async function searchKanjiFromWord(word) {
  return cache.getCachedInDatabase(
    `jisho_kanji_from_word:${word}`,
    60 * 60 * 24 * 90,
    async () => {
      const kanjiURI = jishoApi.getUriForKanjiSearch(word);

      try {
        const response = await axios({
          method: 'get',
          url: kanjiURI,
          headers: {
            'User-Agent': 'Kotoba Discord Bot (https://github.com/mistval/kotoba)',
          },
        });

        const $ = cheerio.load(response.data);
        const kanjis = $('.character a').text();
        return extractKanji(kanjis);
      } catch (err) {
        return errors.throwPublicErrorFatal('Jisho', 'Sorry, Jisho is not responding. Please try again later.', 'Error fetching from Jisho', err);
      }
    },
  );
}

module.exports = searchKanjiFromWord;
