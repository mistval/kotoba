const {throwPublicErrorInfo} = require('./../common/util/errors.js');
const {Navigation, NavigationChapter, FulfillmentError} = require('monochrome-bot');
const axios = require('axios').create({timeout: 10000, validateStatus: () => true});
const constants = require('./../common/constants.js');

const jibikiApiUri = 'https://api.jibiki.app';
const maxFieldsPerPage = 8;

module.exports = {
  commandAliases: ['jibiki', 'jb'],
  cooldown: 3,
  uniqueId: 'best_dictionary',
  shortDescription: 'Search Jibiki for words, kanji and sentences.',
  usageExample: '<prefix>jibiki 女らしい',
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const {prefix} = msg;
      return throwPublicErrorInfo('jibiki', `Say **${prefix}jibiki [text]** to search for words. For example: **${prefix}jibiki dance**`, 'No suffix');
    }

    let response;
    try {
      response = await axios.get(`${jibikiApiUri}/all?query=${encodeURIComponent(suffix)}&sentenceCount=5`);
    } catch (exception) {
      throw new FulfillmentError({
        publicMessage: {
          embed: {
            title: 'Amy is dead!',
            description: 'It looks like Jibiki servers are not responding!\nTry again later.',
            color: constants.EMBED_WRONG_COLOR,
          }
        },
        logDescription: 'Jibiki timeout',
      })
    }

    if (response.status === 200) {
      if (response.data.length === 0) {
        return msg.channel.createMessage({
          embed: {
            title: `No results for ${suffix}`,
            description: 'You might want to try searching for a different term',
            color: constants.EMBED_NEUTRAL_COLOR,
          }
        });
      }

      const wordPages = [];
      const kanjiPages = [];
      const sentencePages = [];

      for (let page = 0; page < Math.ceil(response.data.length / maxFieldsPerPage); page += 1) {
        const wordFields = [];

        for (
          let field = 0;
          field < response.data.length - (page * maxFieldsPerPage);
          field += 1
        ) {
          const entry = response.data[(page * maxFieldsPerPage) + field];
          let word = '';

          if (entry.word.forms[0].kanji.info !== null) {
            word += `*Kanji note; ${entry.word.forms[0].kanji.info}*\n`;
          }
          if (entry.word.forms[0].reading.info !== null) {
            word += `*Reading note; ${entry.word.forms[0].reading.info}*\n`;
          }

          if (entry.word.jlpt !== null) {
            word += `**JLPT N${entry.word.jlpt}**\n`;
          }

          Object.values(entry.word.senses).forEach((sens, i) => {
            if (sens.part_of_speech.length !== 0) {
              word += `${i + 1}. (`;
            }
            word += sens.part_of_speech.map(pos => pos.short).join(', ');
            if (sens.part_of_speech.length !== 0) {
              word += ') ';
            }

            if (sens.field_of_use.length !== 0) {
              word += '[';
            }
            word += sens.field_of_use.map(fld => fld.long).join(', ');
            if (sens.field_of_use.length !== 0) {
              word += '] ';
            }

            word += `${sens.definitions.join('; ')}\n`;
            if (sens.miscellaneous.length > 0) {
              word += `*${sens.miscellaneous.join('; ')}*`;
            }
          });

          wordFields.push({
            name: entry.word.forms[0].kanji.literal === null
              ? entry.word.forms[0].reading.literal
              : `${entry.word.forms[0].kanji.literal}【${entry.word.forms[0].reading.literal}】`,
            value: word,
          });

          if (entry.kanji.length > 0) {
            const kanjiFields = [];

            Object.values(entry.kanji).forEach((kanji) => {
              let value = '';

              value += `**Onyomi**\n${kanji.readings.onyomi.join(', ')}\n`;
              value += `**Kunyomi**\n${kanji.readings.kunyomi.join(', ')}\n\n`;

              value += '**Definitions**\n';
              kanji.definitions.forEach((definition, i) => {
                value += `${i + 1}. ${definition}\n`;
              });

              value += '\n';

              if (kanji.miscellaneous.jlpt !== null) {
                value += `JLPT N${kanji.miscellaneous.jlpt}\n`;
              }
              if (kanji.miscellaneous.grade !== null) {
                value += `Grade ${kanji.miscellaneous.grade}\n`;
              }
              if (kanji.miscellaneous.variant_type !== null) {
                value += `Variant type ${kanji.miscellaneous.variant_type}\n`;
              }
              if (kanji.miscellaneous.variant !== null) {
                value += `Variant ${kanji.miscellaneous.variant}\n`;
              }
              if (kanji.miscellaneous.frequency !== null) {
                value += `Frequency #${kanji.miscellaneous.frequency}\n`;
              }
              if (kanji.miscellaneous.radical_name !== null) {
                value += `Radical name ${kanji.miscellaneous.radical_name}\n`;
              }
              if (kanji.miscellaneous.stroke_count !== null) {
                value += `Stroke count ${kanji.miscellaneous.stroke_count}`;
              }

              kanjiFields.push({
                name: kanji.literal,
                value,
              });
            });

            kanjiPages.push({
              embed: {
                title: `Showing kanji for word ${entry.word.forms[0].kanji.literal !== null
                  ? entry.word.forms[0].kanji.literal
                  : entry.word.forms[0].reading.literal}`,
                url: `https://jibiki.app?query=${encodeURIComponent(suffix)}`,
                color: 16740862,
                footer: {
                  icon_url: 'https://jibiki.app/logo_circle.png',
                  text: 'Powered by Jibiki',
                },
                author: {
                  name: 'Powered by Jibiki',
                  url: `https://jibiki.app?query=${encodeURIComponent(suffix)}`,
                  icon_url: 'https://jibiki.app/logo_circle.png',
                },
                fields: kanjiFields,
              },
            });
          }

          if (entry.sentences.length > 0) {
            const sentenceFields = [];

            Object.values(entry.sentences).forEach((sentence) => {
              let name = '';
              let value = '';

              if (sentence.tags.length > 0) {
                name += '(';
              }
              name += sentence.tags.join(', ');
              if (sentence.tags.length > 0) {
                name += ') ';
              }
              name += sentence.sentence;

              Object.values(sentence.translations).forEach((translation, i) => {
                value += `${i + 1}. `;
                if (translation.tags.length > 0) {
                  value += '(';
                }
                value += translation.tags.join(', ');
                if (translation.tags.length > 0) {
                  value += ') ';
                }
                value += translation.sentence;
              });

              sentenceFields.push({
                name,
                value,
              });
            });

            sentencePages.push({
              embed: {
                title: `Showing sentences for word ${entry.word.forms[0].kanji.literal !== null
                  ? entry.word.forms[0].kanji.literal
                  : entry.word.forms[0].reading.literal}`,
                url: `https://jibiki.app?query=${encodeURIComponent(suffix)}`,
                color: 16740862,
                footer: {
                  icon_url: 'https://jibiki.app/logo_circle.png',
                  text: 'Powered by Jibiki',
                },
                author: {
                  name: 'Powered by Jibiki',
                  url: `https://jibiki.app?query=${encodeURIComponent(suffix)}`,
                  icon_url: 'https://jibiki.app/logo_circle.png',
                },
                fields: sentenceFields,
              },
            });
          }
        }

        wordPages.push({
          embed: {
            title: `Showing results for ${suffix}`,
            description: `Page ${page + 1} out of ${Math.ceil(response.data.length / maxFieldsPerPage)} (${response.data.length} results)`,
            url: `https://jibiki.app?query=${encodeURIComponent(suffix)}`,
            color: 16740862,
            footer: {
              icon_url: 'https://jibiki.app/logo_circle.png',
              text: 'Powered by Jibiki',
            },
            author: {
              name: 'Powered by Jibiki',
              url: `https://jibiki.app?query=${encodeURIComponent(suffix)}`,
              icon_url: 'https://jibiki.app/logo_circle.png',
            },
            fields: wordFields,
          },
        });
      }

      return monochrome.getNavigationManager().show(
        new Navigation(
          msg.author.id,
          true,
          '🇯',
          {
            '🇯': NavigationChapter.fromContent(wordPages),
            '🇰': NavigationChapter.fromContent(kanjiPages),
            '🇪': NavigationChapter.fromContent(sentencePages),
          },
        ),
        constants.NAVIGATION_EXPIRATION_TIME,
        msg.channel,
        msg,
      );
    } else if (response.status === 500) {
      throw new FulfillmentError({
        publicMessage: {
          embed: {
            title: 'Amy says no.',
            description: 'Jibiki; Internal server error.\nTry again later!',
            color: constants.EMBED_WRONG_COLOR,
          }
        },
        logDescription: `Jibiki internal server error`,
      });
    }

    throw new FulfillmentError({
      publicMessage: {
        embed: {
          title: `Jibiki returned an unexpected code (${response.status})`,
          description: 'You might want to try again later.',
          color: constants.EMBED_WRONG_COLOR,
        }
      },
      logDescription: `Jibiki ${response.status} status`,
    });
  },
};
