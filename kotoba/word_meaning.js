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
    assert(typeof meaning === 'string' && meaning !== '', 'WordMeaning meaning parameter bad');
    assert(Array.isArray(meaningTags), 'WordMeaning meaningTags parameter bad');
    this.meaning = meaning;
    this.meaningTags = meaningTags;
  }

  toDiscordBotString() {
    let response = '*' + this.meaning;

    if (KotobaUtils.isNonEmptyArray(this.meaningTags)) {
      response += ' ' + cleanMeaning(KotobaUtils.tagArrayToString(this.meaningTags));
    }

    response += '*';

    return response;
  }
}

module.exports = WordMeaning;
