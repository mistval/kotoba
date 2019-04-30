/*
 * This code is no longer maintained.
 * It is still used for Glosbe dictionary searches.
 * If it breaks, the Glosbe dictionary search
 * feature may be removed from the bot.
 */


const assert = require('assert');

function cleanMeaning(str) {
  str = str.replace(/&lt;/g, '<');
  str = str.replace(/&gt;/g, '>');
  str = str.replace(/<i>/g, '');
  str = str.replace(/<\/i>/g, '');
  str = str.replace(/<b>/g, '');
  str = str.replace(/<\/b>/g, '');
  str = str.replace(/<u>/g, '');
  str = str.replace(/<\/u>/g, '');
  str = str.replace(/&#39;/g, '\'');
  str = str.replace(/&quot;/g, '"');

  return str;
}

function tagArrayToString(tagArray) {
  if (Array.isArray(tagArray) && tagArray.length > 0) {
    let result = '[';
    result += tagArray.join(', ');
    result += ']';
    return result;
  }
  return '';
};

class WordMeaning {
  constructor(meaning, meaningTags) {
    this.meaning_ = meaning;
    this.meaningTags_ = meaningTags;
  }

  toDiscordBotString() {
    let response = this.meaning_;
    if (this.meaningTags_.length > 0) {
      response += ' *' + cleanMeaning(tagArrayToString(this.meaningTags_) + '*');
    }
    return response;
  }
}

module.exports = WordMeaning;
