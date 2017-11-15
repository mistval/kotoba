'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
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

class WordMeaning {
  constructor(meaning, meaningTags) {
    KotobaUtils.assertIsString(meaning);
    KotobaUtils.assertIsArray(meaningTags);
    this.meaning_ = meaning;
    this.meaningTags_ = meaningTags;
  }

  toDiscordBotString() {
    let response = '*' + this.meaning_;
    if (this.meaningTags_.length > 0) {
      response += ' ' + cleanMeaning(KotobaUtils.tagArrayToString(this.meaningTags_));
    }
    response += '*';
    return response;
  }
}

module.exports = WordMeaning;
