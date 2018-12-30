'use strict'
const reload = require('require-reload')(require);
const path = require('path');
const renderText = reload('./../render_text.js').render;
const convertToHiragana = reload('./../util/convert_to_hiragana.js');
const shuffleArray = reload('./../util/shuffle_array.js');
const forvoAudioCache = reload('./../forvo_cache.js');

const URI_MAX_LENGTH = 2048;
const JLPT_AUDIO_FILE_DIRECTORY = path.resolve(__dirname, '..', '..', '..', 'resources', 'quiz_audio');

let BetterEnglishDefinitions;
try {
  BetterEnglishDefinitions = reload('./../BetterEnglishDefinitions.js');
} catch (err) {
  // The better english definitions are not available in the public repo. The crappy definitions will be used.
}

const DEFAULT_WITH_HINT_TIME_LIMIT_IN_MS = 28000;
const DEFAULT_GRAMMAR_TIME_LIMIT_IN_MS = 45000;
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

function answerCompareConvertKana(card, answerCandidate) {
  let convertedAnswerCandidate = convertToHiragana(answerCandidate);
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
  return arrayToLowerCase(card.answer).indexOf(answerCandidate);
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
  PROVIDED_ON_CARD: card => card.dictionaryLinkUri,
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
  let answer = card.options ? card.answer[1] : card.answer[0];
  if (quizState.textQuestionWithHintStrategyState.cardId !== card.id) {
    quizState.textQuestionWithHintStrategyState.cardId = card.id;
    let totalNumberOfCharactersToReveal = Math.ceil(answer.length * NUMBER_OF_REVEALS_PER_CARD * FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL);
    totalNumberOfCharactersToReveal = Math.min(totalNumberOfCharactersToReveal, answer.length - 1);

    // Randomize which indices to reveal in which order
    let allCharacterIndices = [];
    for (let i = 0; i < answer.length; ++i) {
      allCharacterIndices.push(i);
    }
    let shuffledIndices = shuffleArray(allCharacterIndices);
    let revealIndexQueue = shuffledIndices.slice(0, totalNumberOfCharactersToReveal);
    let revelationState = Array(answer.length + 1).join('_');
    quizState.textQuestionWithHintStrategyState.revealIndexQueue = revealIndexQueue;
    quizState.textQuestionWithHintStrategyState.revelationState = revelationState;
  } else {
    let numberOfIndicesToReveal = Math.ceil(FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL * answer.length);
    let revealIndexQueue = quizState.textQuestionWithHintStrategyState.revealIndexQueue;
    let revelationStateArray = quizState.textQuestionWithHintStrategyState.revelationState.split('');
    for (let i = 0; i < numberOfIndicesToReveal && revealIndexQueue.length > 0; ++i) {
      let indexToReveal = revealIndexQueue.pop();
      revelationStateArray[indexToReveal] = answer[indexToReveal];
    }
    let oldRevelationState = quizState.textQuestionWithHintStrategyState.revelationState;
    let newRevelationState = revelationStateArray.join('');

    // If no changes to the revelation state, return undefined to indicate so.
    if (oldRevelationState === newRevelationState) {
      return Promise.resolve();
    }

    quizState.textQuestionWithHintStrategyState.revelationState = newRevelationState;
  }

  let revelationString = quizState.textQuestionWithHintStrategyState.revelationState.split('').join(' ');
  let question = createQuestionCommon(card);
  question.bodyAsText = card.question;
  question.hintString = revelationString;
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
  let newQuestion = shuffleArray(card.question.split('')).join('');

  // If the new question is the same as the original one, swap one random character with one other.
  if (newQuestion === card.question) {
    let newQuestionCharArray = newQuestion.split('');
    let randomIndex1 = Math.floor(Math.random() * newQuestionCharArray.length);
    let randomIndex2 = Math.floor(Math.random() * (newQuestionCharArray.length - 1));
    if (randomIndex2 >= randomIndex1) {
      ++randomIndex2;
    }
    let temp = newQuestionCharArray[randomIndex1];
    newQuestionCharArray[randomIndex1] = newQuestionCharArray[randomIndex2];
    newQuestionCharArray[randomIndex2] = temp;
    newQuestion = newQuestionCharArray.join('');
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

module.exports.CardPreprocessingStrategy = {
  BETTER_ENGLISH_DEFINITIONS: updateWithBetterEnglishDefinition,
  RANDOMIZE_QUESTION_CHARACTERS: randomizeQuestionCharacters,
  FORVO_AUDIO: updateWithForvoAudioUri,
  NONE: card => Promise.resolve(card),
};

/* TIMING STRATEGIES */

module.exports.AnswerTimeLimitStrategy = {
  GRAMMAR: settings => {return settings.answerTimeLimitOverriden ? settings.answerTimeLimitInMs : DEFAULT_GRAMMAR_TIME_LIMIT_IN_MS;}, // HACK TODO: This should be an override type thing
  JAPANESE_SETTINGS: settings => {return settings.answerTimeLimitInMs;},
  WITH_HINT: settings => {return settings.answerTimeLimitOverriden ? settings.answerTimeLimitInMs : DEFAULT_WITH_HINT_TIME_LIMIT_IN_MS;}, // HACK TODO: This should be an override type thing
};

module.exports.AdditionalAnswerWaitStrategy = {
  JAPANESE_SETTINGS: settings => {return settings.additionalAnswerWaitTimeInMs;},
  MULTIPLE_ANSWERS: settings => {return ADDITIONAL_ANSWER_WAIT_TIME_FOR_MULTIPLE_ANSWERS;}
};

module.exports.RevealsLeftStrategy = {
  GRAMMAR: () => 0,
  JAPANESE_SETTINGS: () => 0,
  WITH_HINT: () => 2,
}

module.exports.createTextQuestionWithHint = createTextQuestionWithHint;
