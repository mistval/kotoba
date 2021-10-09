const Kitsu = require('kitsu');
const { Navigation } = require('monochrome-bot');

const constants = require('../common/constants.js');
const trimEmbed = require('../common/util/trim_embed.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = require('../common/util/errors.js');

const api = new Kitsu();

const KITSU_PAGE_BASE_URI = 'https://kitsu.io/anime/';

async function searchAnime(keyword) {
  try {
    const { data } = await api.get('anime', {
      fields: {
        anime: 'canonicalTitle,synopsis,posterImage,averageRating,favoritesCount,slug,popularityRank,ratingRank',
      },
      filter: { text: keyword },
      page: { limit: 10 },
    });
    return data;
  } catch (error) {
    return throwPublicErrorFatal(
      'Kitsu Anime Search', // A user-facing module/command title
      'Sorry, Kitsu.io isn\'t responding. Please try again later.', // A user-facing description of what happened
      'Error fetching from Kitsu', // A log-facing description
      error, // The error that occured
    );
  }
}

function formatAnimeData(animeData, callerName) {
  return animeData.map((item, index) => {
    const embed = {
      title: `${item.canonicalTitle} (page ${index + 1} of ${animeData.length})`,
      description: item.synopsis,
      url: `${KITSU_PAGE_BASE_URI}${item.slug}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: [
        {
          name: 'Rating:',
          value: item.averageRating === null ? 'Unknown' : `:star: **${item.averageRating}** #${item.ratingRank}`,
          inline: true,
        },
        {
          name: 'Favorites:',
          value: `:heart: **${item.favoritesCount}** #${item.popularityRank}`,
          inline: true,
        },
      ],
      thumbnail: item.posterImage ? { url: item.posterImage.small } : undefined,
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${callerName} can use the reaction buttons below to see more information!`,
      },
    };

    return trimEmbed({ embed });
  });
}

async function createNavigationForAnime(authorName, authorId, keyword) {
  const searchResults = await searchAnime(keyword);

  if (searchResults.length === 0) {
    return throwPublicErrorInfo('Kitsu Anime Search', `I didn't find any results for **${keyword}**.`, 'No results');
  }

  const discordContent = formatAnimeData(searchResults, authorName);
  const navigation = Navigation.fromOneDimensionalContents(authorId, discordContent);

  return navigation;
}

module.exports = createNavigationForAnime;
