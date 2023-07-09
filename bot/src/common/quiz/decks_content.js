const fetch = require('node-fetch');
const Cache = require('kotoba-node-common').cache;
const staticDecks = require('./deck_list.json');
const constants = require('./../constants.js');
const config = require('../../../../config/config.js');

const DECKS_CACHE_KEY = 'quizDeckList';
const CACHE_EXPIRATION_SECONDS = 60 * 60; // 1 hour

function getDecks() {
  return Cache.getCachedInProcess(DECKS_CACHE_KEY, CACHE_EXPIRATION_SECONDS, async () => {
    if (!config.bot.dynamicDecksUrl) {
      return staticDecks;
    }

    const response = await fetch(config.bot.dynamicDecksUrl);
    if (!response.ok) {
      return staticDecks;
    }

    return response.json();
  });
}

module.exports.createContent = async function(prefix) {
  const decks = await getDecks();

  return {
    embeds: [{
      title: 'Quiz',
      description: `Say **${prefix}quiz deckname** to start a quiz (Example: **${prefix}quiz N5**). Say **${prefix}quiz stop** to stop a quiz. Say **nodelay** after the deck name for a lightning fast quiz, for example: **k!quiz N1 nodelay**. For advanced help, say **${prefix}quiz help** or [visit me on the web](https://kotobaweb.com/bot/quiz).`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: decks.mainDecks.map(field => ({ name: field.name, value: field.value.replace(/<prefix>/g, prefix) })),
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `You can mix any decks by using the + symbol. For example: ${prefix}quiz N5+N4+N3`,
      },
    }],
  };
};

module.exports.getCategoryHelp = async function(keyword) {
  const decks = await getDecks();
  const subCategory = decks.subCategories.find(category => category.keyword === keyword);

  if (!subCategory) {
    return;
  }

  return `${subCategory.description}  \`\`\`${subCategory.decks.join(', ')}\`\`\``
};

module.exports.defaultDeckOptionsForInteraction = [{
  name: 'n5 (JLPT N5 Reading Quiz)',
  value: 'n5',
},{
  name: 'n4 (JLPT N4 Reading Quiz)',
  value: 'n4',
},{
  name: 'n3 (JLPT N3 Reading Quiz)',
  value: 'n3',
},{
  name: 'n2 (JLPT N2 Reading Quiz)',
  value: 'n2',
},{
  name: 'n1 (JLPT N1 Reading Quiz)',
  value: 'n1',
},{
  name: 'hiragana (Hiragana Reading Quiz)',
  value: 'hiragana',
},{
  name: 'katakana (Katakana Reading Quiz)',
  value: 'katakana',
},{
  name: 'kanawords (Kana Words Reading Quiz)',
  value: 'kanawords',
},{
  name: 'common (Common Words Reading Quiz)',
  value: 'common',
},{
  name: 'hard (Hard Reading Quiz)',
  value: 'hard',
},{
  name: 'haard (Haard Reading Quiz)',
  value: 'haard',
},{
  name: 'cities (Cities Reading Quiz)',
  value: 'cities',
},{
  name: 'namae (Namae Reading Quiz)',
  value: 'namae',
},{
  name: 'myouji (Myouji Reading Quiz)',
  value: 'myouji',
},{
  name: 'prefectures (Prefectures Reading Quiz)',
  value: 'prefectures',
},{
  name: 'anagrams5 (English Anagrams Length 5 Quiz)',
  value: 'anagrams5',
},{
  name: 'anagrams6 (English Anagrams Length 6 Quiz)',
  value: 'anagrams6',
},{
  name: 'anagrams7 (English Anagrams Length 7 Quiz)',
  value: 'anagrams7',
},{
  name: 'anagrams8 (English Anagrams Length 8 Quiz)',
  value: 'anagrams8',
},{
  name: 'easymix (Easy Mix)',
  value: 'easymix',
},{
  name: 'medmix (Medium Mix)',
  value: 'medmix',
},{
  name: 'hardmix (Hard Mix)',
  value: 'hardmix',
},{
  name: 'hardermix (Harder Mix)',
  value: 'hardermix',
},{
  name: 'insanemix (Insane Mix)',
  value: 'insanemix',
}];
