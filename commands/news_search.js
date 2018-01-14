'use strict'
const reload = require('require-reload')(require);
const searchNews = reload('./../kotoba/news_search.js');
const constants = reload('./../kotoba/constants.js');
const NavigationPage = reload('monochrome-bot').NavigationPage;
const NavigationChapter = reload('monochrome-bot').NavigationChapter;
const Navigation = reload('monochrome-bot').Navigation;
const navigationManager = reload('monochrome-bot').navigationManager;
const PublicError = reload('monochrome-bot').PublicError;

const RESULTS_PER_PAGE = 1;

function createDescriptionForArticle(article) {
  return '[**' + article.name + '**](' + article.uri + ')\n**' + article.datePublished + '** ' + article.description;
}

class NavigationChapterDataSource {
  constructor(results) {
    this.results_ = results;
    this.totalPages = Math.floor(results.articles.length / RESULTS_PER_PAGE) + 1;
    if (results.articles.length % RESULTS_PER_PAGE === 0) {
      --this.totalPages;
    }
  }

  prepareData() {
  }

  getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex >= this.results_.articles.length) {
      return;
    }
    let indexStart = pageIndex * RESULTS_PER_PAGE;
    let indexEnd = Math.min(indexStart + RESULTS_PER_PAGE - 1, this.results_.articles.length - 1);
    let embed = {
      title: 'News About ' + this.results_.q + ' (page ' + (pageIndex + 1) + ' of ' + this.totalPages + ')',
      color: constants.EMBED_NEUTRAL_COLOR,
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: 'Results from Bing News',
      },
    };

    let imageUri = this.results_.articles[indexStart].imageUri;
    if (imageUri) {
      embed.image = {
        url: imageUri,
      };
    }

    let articles = this.results_.articles.slice(indexStart, indexEnd + 1);
    embed.description = articles.map(article => createDescriptionForArticle(article)).join('\n\n');
    return new NavigationPage({embed: embed});
  }
}

function createNoResultsEmbed(q) {
  let title = 'Didn\'t find any results';
  if (q) {
    title += ' for the keyword: ' + q;
  }
  title += '.';
  return {
    embed: {
      title: title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

module.exports = {
  commandAliases: ['k!news', 'k!n'],
  canBeChannelRestricted: true,
  cooldown: 5,
  uniqueId: 'news28404',
  shortDescription: 'Search for news about a topic (in any language).',
  longDescription: 'Search the web for news about a given topic in any language. If you don\'t specify a topic then I\'ll search for general news in Japan.',
  usageExample: 'k!news ボーカロイド',
  action(bot, msg, suffix) {
    return searchNews.search(suffix).then(results => {
      if (results.articles.length === 0) {
        throw PublicError.createWithCustomPublicMessage(createNoResultsEmbed(suffix), false, 'No results');
      }

      let dataSource = new NavigationChapterDataSource(results);
      let chapter = new NavigationChapter(dataSource);
      let navigation = new Navigation(msg.author.id, dataSource.totalPages > 1, 'a', {a: chapter});
      return navigationManager.register(navigation, 6000000, msg);
    });
  },
};
