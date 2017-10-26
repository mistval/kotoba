'use strict'
const assert = require('assert');
const KotobaUtils = require('./utils.js');

class KanjiInformation {
  constructor(kanji, kunyomi, onyomi, meanings, strokeCount, gradeLevel, strokeAnimationBuffer, examples) {
    KotobaUtils.assertIsString(kanji, gradeLevel);
    KotobaUtils.assertIsArray(kunyomi, onyomi, meanings, examples);
    KotobaUtils.assertIsNumber(strokeCount);

    this.kanji = kanji;
    this.kunyomi = kunyomi;
    this.onyomi = onyomi;
    this.meanings = meanings;
    this.strokeCount = strokeCount;
    this.gradeLevel = gradeLevel;
    this.strokeAnimationBuffer = strokeAnimationBuffer;
    this.examples = examples;
  }
}

module.exports = KanjiInformation;
