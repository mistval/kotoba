const Cache = require('node-cache');
const fetch = require('node-fetch');
const staticDecks = require('./deck_list.json');
const constants = require('./../constants.js');
const config = require('../../../../config/config.js');

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const DYNAMIC_DECKS_CACHE_KEY = 'dynamicDecks';

let expired = false;

const dynamicDeckCache = new Cache({
  stdTTL: CACHE_TTL_SECONDS,
  deleteOnExpire: false,
});

function refreshDynamicDeckCache() {
  if (!config.bot.dynamicDecksUrl) {
    return;
  }

  fetch(config.bot.dynamicDecksUrl)
    .then(res => res.json())
    .then(json => {
      dynamicDeckCache.set(DYNAMIC_DECKS_CACHE_KEY, json);
    }).catch(() => {
      dynamicDeckCache.set(
        DYNAMIC_DECKS_CACHE_KEY,
        dynamicDeckCache.get(DYNAMIC_DECKS_CACHE_KEY),
      );
    });
}

dynamicDeckCache.on( "expired", () => {
  expired = true;
});

refreshDynamicDeckCache();

module.exports.createContent = function(prefix) {
  if (expired) {
    refreshDynamicDeckCache();
    expired = false;
  }

  const decks = dynamicDeckCache.get(DYNAMIC_DECKS_CACHE_KEY) ?? staticDecks;

  return {
    embed: {
      title: 'Quiz',
      description: `Say **${prefix}quiz deckname** to start a quiz (Example: **${prefix}quiz N5**). Say **${prefix}quiz stop** to stop a quiz. Say **nodelay** after the deck name for a lightning fast quiz, for example: **k!quiz N1 nodelay**. For advanced help, say **${prefix}quiz help** or [visit me on the web](https://kotobaweb.com/bot/quiz).`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: decks.mainDecks.map(field => ({ name: field.name, value: field.value.replace(/<prefix>/g, prefix) })),
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `You can mix any decks by using the + symbol. For example: ${prefix}quiz N5+N4+N3`,
      },
    },
  };
};

module.exports.getCategoryHelp = function(keyword) {
  const decks = dynamicDeckCache.get(DYNAMIC_DECKS_CACHE_KEY) ?? staticDecks;
  const subCategory = decks.subCategories.find(category => category.keyword === keyword);

  if (!subCategory) {
    return;
  }

  return `${subCategory.description}  \`\`\`${subCategory.decks.join(', ')}\`\`\``
};

module.exports.deckOptionsForInteraction = [{
  name: 'JLPT N5',
  value: 'n5',
},{
  name: 'JLPT N4',
  value: 'n4',
},{
  name: 'JLPT N3',
  value: 'n3',
},{
  name: 'JLPT N2',
  value: 'n2',
},{
  name: 'JLPT N1',
  value: 'n1',
},{
  name: 'Hiragana',
  value: 'hiragana',
},{
  name: 'Katakana',
  value: 'katakana',
},{
  name: 'Hiragana Words',
  value: 'kanawords',
},{
  name: 'Common',
  value: 'common',
},{
  name: 'Hard',
  value: 'hard',
},{
  name: 'Haard',
  value: 'haard',
},{
  name: 'Cities',
  value: 'cities',
},{
  name: 'First Names',
  value: 'namae',
},{
  name: 'Last Names',
  value: 'myouji',
},{
  name: 'Prefectures',
  value: 'prefectures',
},{
  name: 'English Anagrams Length 5',
  value: 'anagrams5',
},{
  name: 'English Anagrams Length 6',
  value: 'anagrams6',
},{
  name: 'English Anagrams Length 7',
  value: 'anagrams7',
},{
  name: 'English Anagrams Length 8',
  value: 'anagrams8',
},{
  name: 'Easy Mix',
  value: 'easymix',
},{
  name: 'Medium Mix',
  value: 'medmix',
},{
  name: 'Hard Mix',
  value: 'hardmix',
},{
  name: 'Harder Mix',
  value: 'hardermix',
},{
  name: 'Insane Mix',
  value: 'insanemix',
}];
