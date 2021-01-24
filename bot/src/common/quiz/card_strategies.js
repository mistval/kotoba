const path = require('path');
const globals = require('../globals.js');
const axios = require('axios').create({ timeout: 10000 });
const renderText = require('./../render_text.js').render;
const convertToHiragana = require('./../util/convert_to_hiragana.js');
const shuffleArray = require('./../util/array.js').shuffle;
const forvoAudioCache = require('./../forvo_cache.js');
const retryPromise = require('../util/retry_promise.js');
const WEBSTER_CTH_API_KEY = require('../../../../config/config.js').bot.apiKeys.websterCth;
const OXFORD_APP_ID = require('../../../../config/config.js').bot.apiKeys.oxfordAppId;
const OXFORD_API_KEY = require('../../../../config/config.js').bot.apiKeys.oxfordApiKey;

const URI_MAX_LENGTH = 2048;
const JLPT_AUDIO_FILE_DIRECTORY = path.resolve(__dirname, '..', '..', '..', '..', 'resources', 'quiz_audio');

let BetterEnglishDefinitions;
try {
  BetterEnglishDefinitions = require('./../BetterEnglishDefinitions.js');
} catch (err) {
  // The better english definitions are not available in the public repo. The crappy definitions will be used.
}

const DEFAULT_WITH_HINT_TIME_LIMIT_IN_MS = 28000;
const DEFAULT_GRAMMAR_TIME_LIMIT_IN_MS = 45000;
const DEFAULT_ANAGRAMS_BASE_TIME_LIMIT_IN_MS = 20000;
const NUMBER_OF_REVEALS_PER_CARD = 2;
const FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL = .25;
const ADDITIONAL_ANSWER_WAIT_TIME_FOR_MULTIPLE_ANSWERS = 10000;

/* UTIL */

function arrayToLowerCase(array) {
  let result = [];
  for (let str of array) {
    result.push(str.toLowerCase());
  }
  return result;
}

/* COMPARE ANSWER STRATEGIES */

function removeSpoilerTags(answerCandidate) {
  return answerCandidate.replace(/\|\|/g, '');
}

function answerCompareConvertKana(card, answerCandidate) {
  let convertedAnswerCandidate = convertToHiragana(removeSpoilerTags(answerCandidate));
  let correctAnswersLowercase = arrayToLowerCase(card.answer);
  for (let i = 0; i < correctAnswersLowercase.length; ++i) {
    let correctAnswer = correctAnswersLowercase[i];
    if (convertToHiragana(correctAnswer) === convertedAnswerCandidate) {
      return i;
    }
  }
  return -1;
}

function answerCompareStrict(card, answerCandidate) {
  return arrayToLowerCase(card.answer).indexOf(removeSpoilerTags(answerCandidate));
}

function createAggregateLink(queryParts, tag) {
  let aggregateLink = `http://jisho.org/search/${encodeURIComponent(queryParts.join(','))}`;

  if (tag) {
    aggregateLink += `%23${tag}`;
  }

  if (aggregateLink.length > URI_MAX_LENGTH) {
    return createAggregateLink(queryParts.slice(0, queryParts.length - 1), tag);
  }

  return aggregateLink;
}

module.exports.AnswerCompareStrategy = {
  CONVERT_KANA: answerCompareConvertKana,
  STRICT: answerCompareStrict,
};

/* DICTIONARY LINK STRATEGIES */

function getAnswerToLink(card) {
  if (card.options) {
    return card.answer[1];
  }
  return card.answer[0];
}

module.exports.CreateDictionaryLinkStrategy = {
  JISHO_QUESTION_WORD: card => `http://jisho.org/search/${encodeURIComponent(card.question)}`,
  JISHO_QUESTION_KANJI: card => `http://jisho.org/search/${encodeURIComponent(card.question)}%23kanji`,
  JISHO_ANSWER_WORD: card => `http://jisho.org/search/${encodeURIComponent(getAnswerToLink(card))}`,
  WEBSTER_ANSWER: card => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(getAnswerToLink(card))}`,
  WEBSTER_QUESTION: card => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(card.question)}`,
  WIKIPEDIA_QUESTION_FIRST_TOKEN: card => `https://ja.wikipedia.org/wiki/${encodeURIComponent(card.question.split(' ')[0])}`,
  PROVIDED_ON_CARD: card => card.dictionaryLinkUri ? card.dictionaryLinkUri.replace('%2Fwiki%2F%25', '/wiki/%') : '', // HACK: For some reason a minority of questions get their URIs messed up during the build process
  WEBLIO_QUESTION: card => `https://www.weblio.jp/content/${encodeURIComponent(card.question)}`,
  NONE: () => '',
};

module.exports.CreateAggregateDictionaryLinkStrategy = {
  JISHO_QUESTION_WORD: cards => createAggregateLink(cards.map(card => card.question)),
  JISHO_QUESTION_KANJI: cards => createAggregateLink(cards.map(card => card.question), 'kanji'),
  JISHO_ANSWER_WORD: cards => createAggregateLink(cards.map(card => card.answer[0])),
  WEBSTER_ANSWER: () => '',
  WEBSTER_QUESTION: () => '',
  WIKIPEDIA_QUESTION_FIRST_TOKEN: () => '',
  PROVIDED_ON_CARD: () => '',
  NONE: () => '',
};

/* QUESTION CREATION STRATEGIES */

function createQuestionCommon(card) {
  return {
    deckName: card.deckName,
    instructions: card.instructions,
    options: card.options,
    deckProgress: card.deckProgress,
  };
}

async function createImageQuestion(card) {
  let question = createQuestionCommon(card);

  const pngBuffer = await renderText(card.question, card.fontColor, card.backgroundColor, card.fontSize, card.font);

  question.bodyAsPngBuffer = pngBuffer;
  return question;
}

function createImageUriQuestion(card) {
  let question = createQuestionCommon(card);
  question.bodyAsImageUri = card.question;
  return Promise.resolve(question);
}


function createTextQuestion(card) {
  let question = createQuestionCommon(card);
  question.bodyAsText = card.question;
  return Promise.resolve(question);
}

function createJlptAudioFileQuestion(card) {
  const question = createQuestionCommon(card);
  const audioFileUri = path.join(JLPT_AUDIO_FILE_DIRECTORY, card.question);
  question.bodyAsAudioUri = audioFileUri;
  return Promise.resolve(question);
}

async function createForvoAudioFileQuestion(card) {
  const question = createQuestionCommon(card);
  const audioFileUri = card.question;
  question.bodyAsAudioUri = audioFileUri;
  return Promise.resolve(question);
}

function createTextQuestionWithHint(card, quizState) {
  if (!quizState.textQuestionWithHintStrategyState) {
    quizState.textQuestionWithHintStrategyState = {};
  }

  const cardKey = `${card.id}-${(card.answerHistory || []).length}`;

  const answer = card.options ? card.answer[1] : card.answer[0];
  const answerCharArray = answer.split('');

  if (quizState.textQuestionWithHintStrategyState.cardKey !== cardKey) {
    quizState.textQuestionWithHintStrategyState.cardKey = cardKey;

    const spaceIndices = answerCharArray
      .map((c, i) => c === ' ' ? i : -1)
      .filter(i => i !== -1);
    const nonSpaceIndices = answerCharArray
      .map((c, i) => c === ' ' ? -1 : i)
      .filter(i => i !== -1);

    const revealedIndices = spaceIndices.reduce((d, i) => { d[i] = true; return d; }, {});

    let totalNumberOfCharactersToReveal = Math.ceil(nonSpaceIndices.length * NUMBER_OF_REVEALS_PER_CARD * FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL);
    totalNumberOfCharactersToReveal = Math.min(totalNumberOfCharactersToReveal, nonSpaceIndices.length - 1);

    const revealIndexQueue = shuffleArray(nonSpaceIndices).slice(0, totalNumberOfCharactersToReveal);

    quizState.textQuestionWithHintStrategyState.numIndicesPerReveal = Math.ceil(FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL * nonSpaceIndices.length);
    quizState.textQuestionWithHintStrategyState.revealIndexQueue = revealIndexQueue;
    quizState.textQuestionWithHintStrategyState.revealedIndices = revealedIndices;
  } else {
    const { revealedIndices, revealIndexQueue, numIndicesPerReveal } = quizState.textQuestionWithHintStrategyState;

    if (revealIndexQueue.length === 0 || numIndicesPerReveal === 0) {
      return Promise.resolve();
    }

    for (let i = 0; i < numIndicesPerReveal && revealIndexQueue.length > 0; ++i) {
      revealedIndices[revealIndexQueue.pop()] = true;
    }
  }

  const { revealedIndices } = quizState.textQuestionWithHintStrategyState;
  const revealedAnswer = answerCharArray.map((c, i) => revealedIndices[i] ? c : '_').join(' ');

  let question = createQuestionCommon(card);
  question.bodyAsText = card.question;
  question.hintString = revealedAnswer;
  return Promise.resolve(question);
}

module.exports.CreateQuestionStrategy = {
  IMAGE: createImageQuestion,
  IMAGE_URI: createImageUriQuestion,
  TEXT_WITH_HINT: createTextQuestionWithHint,
  TEXT: createTextQuestion,
  JLPT_AUDIO_FILE: createJlptAudioFileQuestion,
  FORVO_AUDIO_FILE: createForvoAudioFileQuestion,
};

/* SCORING STRATEGIES */

function scoreOneAnswerOnePoint(userId, userName, answer, card, scores) {
  let correctAnswerIndex = card.compareAnswer(card, answer);
  if (correctAnswerIndex === -1) {
    return false;
  }
  return scores.submitAnswer(userId, userName, answer, 1, 1, false, card.deckId);
}

function scoreMultipleAnswersPositionPoints(userId, userName, answer, card, scores) {
  let answerIndex = card.compareAnswer(card, answer);
  let correctAnswer = answerIndex !== -1;
  if (!correctAnswer) {
    return false;
  }
  let points = 1;
  if (card.pointsForAnswer) {
    points = card.pointsForAnswer[answerIndex];
  }
  return scores.submitAnswer(userId, userName, answer, points, .65, true, card.deckId);
}

module.exports.ScoreAnswerStrategy = {
  ONE_ANSWER_ONE_POINT: scoreOneAnswerOnePoint,
  MULTIPLE_ANSWERS_POSITION_POINTS: scoreMultipleAnswersPositionPoints,
};

/* CARD PREPROCESSING STRATEGIES */

function updateWithBetterEnglishDefinition(card) {
  if (!BetterEnglishDefinitions) {
    return Promise.resolve(card);
  }
  return BetterEnglishDefinitions.getDefinition(card.answer[0]).then(result => {
    card.question = result.question;
    card.answer = [result.answer];
    return card;
  }).catch(err => {
    return false;
  });
}

function randomizeQuestionCharacters(card) {
  let newQuestion = card.question;

  // In theory this loop could never terminate, but not realistically.
  while (card.answer.indexOf(newQuestion) !== -1) {
    newQuestion = shuffleArray(card.question.split('')).join('');
  }

  card.question = newQuestion;
  return Promise.resolve(card);
}

async function updateWithForvoAudioUri(card) {
  const word = card.question;
  const uris = await forvoAudioCache.getPronunciationClipsForWord(word);

  if (uris.length === 0) {
    return false;
  }

  card.question = uris[Math.floor(Math.random() * uris.length)];
  return card;
}

function reduceArrays(arrs, reduced = []) {
  if (Array.isArray(arrs)) {
    arrs.forEach((arr) => {
      reduceArrays(arr, reduced);
    });
  } else {
    reduced.push(arrs);
  }

  return reduced;
}

async function applyWebsterSynonyms(card) {
  const uri = `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${card.question}?key=${WEBSTER_CTH_API_KEY}`;
  const response = await retryPromise(() => axios.get(uri));
  if (response.data.length > 0) {
    if (!response.data[0].meta) {
      return;
    }
    const stem = response.data[0].meta.stems[0];
    card.question = stem;
  }

  const syns = reduceArrays(response.data.map(entry => entry.meta.syns));
  const synsProcessed = [];
  syns.forEach((syn) => {
    const parenIndex = syn.indexOf('(');
    if (parenIndex !== -1) {
      syn = syn.substr(0, parenIndex).trim();
    }

    if (synsProcessed.indexOf(syn) === -1 && syn !== card.question) {
      synsProcessed.push(syn);
    }
  });

  card.answer = card.answer || [];
  card.answer = card.answer.concat(synsProcessed);

  if (synsProcessed.length > 0) {
    card.meaning += `\n[Merriam-Webster Thesaurus](https://www.merriam-webster.com/thesaurus/${card.question})`;
  }
}

async function applyOxfordSynonyms(card) {
  try {
    let syns = [];
    const response = await axios.get(
      `https://od-api.oxforddictionaries.com/api/v1/entries/en/${card.question}/synonyms`,
      {
        headers: {
          app_id: OXFORD_APP_ID,
          app_key: OXFORD_API_KEY,
      },
    });
    const lexEntries = reduceArrays(response.data.results.map(result => result.lexicalEntries));
    const entries = reduceArrays(lexEntries.map(lexEntry => lexEntry.entries));
    const senses = reduceArrays(entries.map(entry => entry.senses));
    syns = syns.concat(reduceArrays(senses.map(sense => sense.synonyms)).map(synInfo => synInfo.text));
    const subSenses = reduceArrays(senses.map(sense => sense.subSenses).filter(x => x));
    const synonymInfos = reduceArrays(subSenses.map(subSense => subSense.synonyms));
    syns = syns.concat(synonymInfos.map(synonymInfo => synonymInfo.text));

    const synsProcessed = [];
    syns.forEach((syn) => {
      const parenIndex = syn.indexOf('(');
      if (parenIndex !== -1) {
        syn = syn.substr(0, parenIndex).trim();
      }

      if (synsProcessed.indexOf(syn) === -1 && syn !== card.question) {
        synsProcessed.push(syn);
      }
    });

    card.answer = card.answer || [];
    card.answer = card.answer.concat(synsProcessed);

    if (synsProcessed.length > 0) {
      card.meaning += `\n[Oxford Thesaurus](https://en.oxforddictionaries.com/thesaurus/${card.question})`;
    }
  } catch (err) {
    if (!err.response || err.response.status !== 404) {
      globals.logger.error({
        event: 'FAILED TO ADD OXFORD SYNONYMS',
        err,
      });
    }
  }
}

function errorDelay() {
  return new Promise((fulfill) => {
    setTimeout(() => fulfill(), 4000);
  });
}

async function updateWithThesaurusSynonyms(card) {
  const cacheKey = `ThesaurusMisses_${card.question}`;
  const isThesaurusMiss = await globals.persistence.getData(cacheKey);
  if (isThesaurusMiss === true) {
    return false;
  }

  try {
    await applyWebsterSynonyms(card);
  } catch (err) {
    // hack to prevent the quiz manager from retrying too quickly
    await errorDelay();
    throw err;
  }

  if (card.answer.length === 0) {
    await globals.persistence.editData(cacheKey, () => true);

    globals.logger.warn({
      event: 'THESAURUS MISS',
      detail: card.question,
    });

    return false;
  }

  // The Oxford API free limit is meager compared to Webster's.
  // So if no result is found on Webster, don't bother checking Oxford.
  await applyOxfordSynonyms(card);

  card.answer = card.answer.filter((x, i) => card.answer.indexOf(x) === i);
  return card;
}

module.exports.CardPreprocessingStrategy = {
  BETTER_ENGLISH_DEFINITIONS: updateWithBetterEnglishDefinition,
  THESAURUS_SYNONYMS: updateWithThesaurusSynonyms,
  RANDOMIZE_QUESTION_CHARACTERS: randomizeQuestionCharacters,
  FORVO_AUDIO: updateWithForvoAudioUri,
  NONE: card => Promise.resolve(card),
};

/* TIMING STRATEGIES */

module.exports.AnswerTimeLimitStrategy = {
  ANAGRAMS: (settings, card) => settings.answerTimeLimitOverriden ? settings.answerTimeLimitInMs : Math.max(DEFAULT_ANAGRAMS_BASE_TIME_LIMIT_IN_MS + (Math.max(0, card.question.length - 5) * 2000), settings.answerTimeLimitInMs),
  GRAMMAR: settings => settings.answerTimeLimitOverriden ? settings.answerTimeLimitInMs : Math.max(DEFAULT_GRAMMAR_TIME_LIMIT_IN_MS, settings.answerTimeLimitInMs), // HACK TODO: This should be an override type thing
  JAPANESE_SETTINGS: settings => settings.answerTimeLimitInMs,
  WITH_HINT: settings => settings.answerTimeLimitOverriden ? settings.answerTimeLimitInMs : Math.max(DEFAULT_WITH_HINT_TIME_LIMIT_IN_MS, settings.answerTimeLimitInMs), // HACK TODO: This should be an override type thing
  ADD_TO_LENGTH: (settings, card) => (card.questionLengthInMs || 0) + settings.answerTimeLimitInMs,
};

module.exports.AdditionalAnswerWaitStrategy = {
  JAPANESE_SETTINGS: settings => {return settings.additionalAnswerWaitTimeInMs;},
  MULTIPLE_ANSWERS: settings => {return ADDITIONAL_ANSWER_WAIT_TIME_FOR_MULTIPLE_ANSWERS;}
};

module.exports.RevealsLeftStrategy = {
  ANAGRAMS: () => 0,
  GRAMMAR: () => 0,
  JAPANESE_SETTINGS: () => 0,
  WITH_HINT: () => 2,
  ADD_TO_LENGTH: () => 0,
}

module.exports.createTextQuestionWithHint = createTextQuestionWithHint;
