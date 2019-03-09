const reload = require('require-reload')(require);
const Kitsu = require('kitsu');

const constants = reload('./constants.js');
const trimEmbed = reload('./util/trim_embed.js');
const { throwPublicErrorInfo } = reload('./util/errors.js');
const { Navigation, NavigationChapter } = reload('monochrome-bot');

const api = new Kitsu();

async function createAnimeResult(authorName, authorId, keyword, msg, navigationManager) {
    const result = await api.get('anime', {
        fields: {
            anime: 'canonicalTitle,synopsis,posterImage,averageRating,favoritesCount'
        },
        filter: { text: keyword },
        page: { limit: 5 }
    });

    console.log(result);

    const discordContent = []
    for (item of result.data) {
        const embed = {
            title: item.canonicalTitle,
            description: item.synopsis,
            color: constants.EMBED_NEUTRAL_COLOR,
            fields: [
                { name: 'Rating:', value: `:star: ${item.averageRating}`, inline: true },
                { name: 'Favorites:', value: `:heart: ${item.favoritesCount}`, inline: true },
            ],
            thumbnail: { url: item.posterImage.tiny },
            footer: { 
                icon_url: constants.FOOTER_ICON_URI, 
                text: `${authorName} can use the reaction buttons below to see more information!`
            }
        }

        const trimmed = trimEmbed({ embed });
        discordContent.push(trimmed);
    }

    const navigation = Navigation.fromOneDimensionalContents(authorId, discordContent);
    return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

module.exports = {
    createAnimeResult
}