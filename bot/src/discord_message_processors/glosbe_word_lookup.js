
const glosbe = require('./../common/glosbe_word_search.js');
const dictionaryQuery = require('./../common/dictionary_query.js');

module.exports = {
  name: 'Glosbe',
  action: (bot, msg, monochrome) => {
    if (!msg.content.startsWith('k!')) {
      return false;
    }
    let tail = msg.content.substring(msg.content.indexOf('!') + 1);
    var commandPartEndIndex = tail.indexOf(' ');
    commandPartEndIndex = commandPartEndIndex === -1 ? tail.length : commandPartEndIndex;
    var commandPart = tail.substring(0, commandPartEndIndex).toLowerCase();
    var queryPart = tail.substring(commandPartEndIndex + 1);
    let commandChunks = commandPart.split('-');
    if ((commandChunks.length === 1 || commandChunks.length === 2) && commandChunks[0]) {
      fromLanguage = commandChunks[0];
      toLanguage = commandChunks[1];
      if (glosbe.supportsLanguage(fromLanguage) && (!toLanguage || glosbe.supportsLanguage(toLanguage))) {
        return dictionaryQuery(msg, fromLanguage, toLanguage, queryPart, glosbe.search, 'big');
      }
    }

    return false;
  }
};
