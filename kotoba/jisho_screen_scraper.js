'use strict'
const reload = require('require-reload')(require);
const request = require('request-promise');
const htmlparser = require('htmlparser');
const KanjiInformation = reload('./kanji_information.js');
const KanjiExample = reload('./kanji_example.js');
const renderText = reload('./render_text.js').render;
const PublicError = reload('./../core/public_error.js');

const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;

function superTrim(str) {
  str = str.replace(/(?:\r\n|\r|\n)/g, '');
  str = str.trim();
  return str;
}

function getDataBetweenIndicies(data, startIndex, endIndex) {
  let result = data.substring(startIndex, endIndex);
  return superTrim(result);
}

function getDataBetweenStrings(data, startString, endString) {
  let startStringLocation = data.indexOf(startString);
  if (startStringLocation === -1) {
    return;
  }
  let startIndex = startStringLocation + startString.length;
  let endIndex = data.indexOf(endString, startIndex);
  if (endIndex >= 0) {
    return getDataBetweenIndicies(data, startIndex, endIndex);
  };
}

function getOnExample(data) {
  return getExample(data, '<h2>On reading compounds</h2>');
}

function getKunExample(data) {
  return getExample(data, '<h2>Kun reading compounds</h2>');
}

function getExample(data, exampleIdentifier) {
  let onStartIndex = data.indexOf(exampleIdentifier);
  let onEndIndex = data.indexOf('</li>', onStartIndex);
  if (onStartIndex === -1 || onEndIndex === -1) {
    return;
  }
  data = data.substring(onStartIndex, onEndIndex);
  data = data.replace(exampleIdentifier, '');
  data = data.replace('<ul class=\"no-bullet\">', '');
  data = data.replace('<li>', '');

  let arr = data.split('\n');

  arr = arr.filter(element => {
    return element.trim() !== '';
  }).map(element => {
    return superTrim(element).replace(/&quot;/g, '"');
  });

  if (arr.length !== 3) {
    return;
  }

  return new KanjiExample(arr[0] + ' ' + arr[1].replace('【', '(').replace('】', ')'), arr[2]);
}

function extractReadings(readingsString) {
  const closeAnchor = '</a>';
  let rest = readingsString;
  let readings = [];

  while (rest.indexOf('<') !== -1) {
    let reading = getDataBetweenStrings(rest, '>', '<');
    readings.push(reading);
    rest = rest.substring(rest.indexOf(closeAnchor) + closeAnchor.length);
  }

  return readings;
}

function containsKanjiGlyph(data, kanji) {
  let kanjiGlyphToken = '<h1 class=\"character\" data-area-name=\"print\" lang=\"ja\">' + kanji + '</h1>';
  return data.indexOf(kanjiGlyphToken) !== -1;
}

function parseKanjiLine(japaneseSectionDom) {
  let res = [];
  for (let i = 0; i < japaneseSectionDom.length - 1; ++i) {
    let kanjiFuriganaPair = japaneseSectionDom[i].children;
    if (kanjiFuriganaPair) {
      res.push(kanjiFuriganaPair[kanjiFuriganaPair.length - 1].children[0].raw);
    } else {
      let kanji = japaneseSectionDom[i].raw.replace(/\\n/g, '').trim();
      if (!kanji || kanji.length === 0) {
        res.push(undefined);
      } else {
        res.push(kanji);
      }
    }
  }

  return res;
}

function parseKanaLine(japaneseSectionDom, parsedKanjiLine) {
  let res = [];
  for (let i = 0; i < japaneseSectionDom.length - 1; ++i) {
    let kanjiFuriganaPair = japaneseSectionDom[i].children;
    if (kanjiFuriganaPair && kanjiFuriganaPair[0].children) {
      let kana = kanjiFuriganaPair[0].children[0].raw;
      let kanji = parsedKanjiLine[i];
      let matches = kanji.match(kanjiRegex);

      if (kanji.startsWith(kana)) {
        res.push(kanji);
      } else if (matches) {
        let lastMatch = matches[matches.length - 1];
        let lastMatchIndex = kanji.lastIndexOf(lastMatch);
        let nonFuriPart = kanji.substring(lastMatchIndex + 1);
        res.push(kana + nonFuriPart);
      } else {
        res.push(kanji);
      }
    } else if (parsedKanjiLine[i]) {
      res.push(parsedKanjiLine[i]);
    }
  }

  return res;
}

function parseDivSection(sentenceSection) {
  let result = {};

  const englishSectionStartString = '<span class=\"english\">';
  const englishSectionEndString = '</span';
  let englishSectionStartIndex = sentenceSection.indexOf(englishSectionStartString);
  let englishSectionEndIndex = sentenceSection.indexOf(englishSectionEndString, englishSectionStartIndex);
  result.englishLine = sentenceSection.substring(englishSectionStartIndex + englishSectionStartString.length, englishSectionEndIndex);

  const japaneseSectionStartString = '<ul class=\"japanese_sentence japanese japanese_gothic clearfix\" lang=\"ja\">';
  const japaneseSectionEndString = '</ul>';
  let japaneseSectionStartIndex = sentenceSection.indexOf(japaneseSectionStartString) + japaneseSectionStartString.length;
  let japaneseSectionEndIndex = sentenceSection.indexOf(japaneseSectionEndString);
  let japaneseSectionText = sentenceSection.substring(japaneseSectionStartIndex, japaneseSectionEndIndex);
  let parseHandler = new htmlparser.DefaultHandler(function(error, dom) {});
  let parser = new htmlparser.Parser(parseHandler);
  parser.parseComplete(japaneseSectionText);
  let japaneseDom = parseHandler.dom;

  let parsedKanjiLine = parseKanjiLine(japaneseDom);
  result.kanjiLine = parsedKanjiLine.join('');
  result.kanaLine = parseKanaLine(japaneseDom, parsedKanjiLine).join('');

  return result;
}

function parseExamplesData(data, suffix) {
  const sectionStartString = '<ul class=\"japanese_sentence japanese japanese_gothic clearfix\" lang=\"ja\">';
  const sectionEndString = '<span class=\"inline_copyright\">';
  let results = {};
  results.sentenceInformation = [];

  let sectionStartIndex = 0;
  while (true) {
    sectionStartIndex = data.indexOf(sectionStartString, sectionStartIndex) + 1;
    let sectionEndIndex = data.indexOf(sectionEndString, sectionStartIndex);
    if (sectionStartIndex !== 0 && sectionEndIndex !== -1) {
      let section = data.substring(sectionStartIndex, sectionEndIndex + sectionEndString.length);
      results.sentenceInformation.push(parseDivSection(section));
    } else {
      break;
    }
  }

  results.extra = 'I got these from Jisho. See more: http://jisho.org/search/' + encodeURIComponent(suffix) + '%23sentences';
  return results;
}

function parseKanjiData(inData, kanji) {
  let gradeLevelOut = '';
  let strokeCountOut = -1;
  let meaningOut = '';
  let kunyomiHiraganaOut = ['n/a'];
  let onyomiKatakanaOut = ['n/a'];
  let examplesOut = [];

  let gradeNumber = getDataBetweenStrings(inData, 'taught in <strong>grade ', '</strong>');
  let gradeLevel = getDataBetweenStrings(inData, 'taught in <strong>', '</strong>');

  if (gradeNumber) {
    gradeLevelOut = gradeNumber;
  } else if (gradeLevel) {
    gradeLevelOut = gradeLevel;
  }

  let strokeCount = getDataBetweenStrings(inData, '<strong>', '</strong> strokes');
  if (strokeCount) {
    strokeCountOut = parseInt(strokeCount);
  }

  let meaning = getDataBetweenStrings(inData, '<div class=\"kanji-details__main-meanings\">', '</div>');
  if (meaning) {
    meaningOut = superTrim(meaning);
  }

  let kunyomiString = getDataBetweenStrings(inData, '<dt>Kun:</dt>', '</dl>');
  if (kunyomiString) {
    kunyomiString = getDataBetweenStrings(kunyomiString, '<dd class=\"kanji-details__main-readings-list\" lang=\"ja\">', '</dd>');
    if (kunyomiString) {
      let readings = extractReadings(kunyomiString);
      kunyomiHiraganaOut = readings;
    }
  }

  let onyomiString = getDataBetweenStrings(inData, '<dt>On:</dt>', '</dl>');
  if (onyomiString) {
    onyomiString = getDataBetweenStrings(onyomiString, '<dd class=\"kanji-details__main-readings-list\" lang=\"ja\">', '</dd>');
    if (onyomiString) {
      let readings = extractReadings(onyomiString);
      onyomiKatakanaOut = readings;
    }
  }

  let onExample = getOnExample(inData);
  let kunExample = getKunExample(inData);

  if (onExample) {
    examplesOut.push(onExample);
  }

  if (kunExample) {
    examplesOut.push(kunExample);
  }

  return renderText(kanji).then(buffer => {
    return new KanjiInformation(kanji, kunyomiHiraganaOut, onyomiKatakanaOut, meaningOut.split(', '), strokeCountOut, gradeLevelOut, buffer, examplesOut);
  });
}

function throwTimeoutError(err) {
  throw new PublicError('Sorry, Jisho is not responding. Please try again later.', 'Error', err);
}

exports.searchExamples = function(language, phrase) {
  let jishoUri = 'http://jisho.org/search/' + encodeURIComponent(phrase) + '%23sentences';
  return request({uri: jishoUri, json: false, timeout: 10000}).then(data => {
    return parseExamplesData(data, phrase);
  }).catch(throwTimeoutError);
};

// The queryApi argument is a function pointer that should return results for a dictionary lookup. See GlosbeUtils.js for an example.
exports.searchKanji = function(kanji) {
  let jishoUri = 'http://jisho.org/search/' + encodeURIComponent(kanji) + '%23kanji';
  return request({uri: jishoUri, json: false, timeout: 10000}).then(data => {
    if (containsKanjiGlyph(data, kanji)) {
      return parseKanjiData(data, kanji);
    }
  }).catch(throwTimeoutError);
};
