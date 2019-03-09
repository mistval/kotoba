const reload = require('require-reload')(require);
const Kitsu = require('kitsu');

const constants = reload('./constants.js');
const trimEmbed = reload('./util/trim_embed.js');
const { throwPublicErrorInfo } = reload('./util/errors.js');

const api = new Kitsu();

async function createAnimeResult(term) {
    const result = await api.get('anime', {
        fields: {
            anime: 'canonicalTitle,synopsis'
        },
        filter: {
            text: term
        }
    });

    console.log(result);

    const embed = {
        color: constants.EMBED_NEUTRAL_COLOR,
        title: `${result.meta.count} anime found:`,
        url: '',
        fields: [],
    };

    for (item of result.data) {
        const animeField = {
            name: item.canonicalTitle,
            value: item.synopsis,
            inline: false,
        };
        
        embed.fields.push(animeField);
    }

    const trimmed = trimEmbed({ embed })
    return trimmed;
}

module.exports = {
    createAnimeResult
}