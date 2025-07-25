
const FULL_NAME_MAX_LENGTH = 60;
const SHORT_NAME_MAX_LENGTH = 25;
const INSTRUCTIONS_MAX_LENGTH = 400;
const IMAGE_QUESTION_MAX_LENGTH = 20;
const TEXT_QUESTION_MAX_LENGTH = 400;
const DESCRIPTION_MAX_LENGTH = 500;
const MAX_NEWLINES_IN_DESCRIPTION = 8;
const ANSWERS_TOTAL_MAX_LENGTH = 200;
const COMMENT_MAX_LENGTH = 600;
const MAX_CARDS = 10000;
const IMAGE_URI_MAX_LENGTH = 400;
const NON_LINE_ERROR_LINE = -1;
const SHORT_NAME_ALLOWED_CHARACTERS_REGEX_HTML = '^[a-zA-Z0-9_]{1,25}$';
const SHORT_NAME_ALLOWED_CHARACTERS_REGEX = /^[a-z0-9_]{1,25}$/;
const DECK_VALIDATION_ERROR_TYPE = 'deck validation error';

const reservedWords = [
  'hardcore',
  'conquest',
  'inferno',
  'nodelay',
  'norace',
  'search',
  'settings',
  'setting',
  'noshuffle',
  'shuffle',
  'fast',
  'faster',
  'slow',
  'review',
  'reviewme',
];

const maxLengthForQuestionCreationStrategy = {
  IMAGE: IMAGE_QUESTION_MAX_LENGTH,
  TEXT: TEXT_QUESTION_MAX_LENGTH,
  IMAGE_WITH_HINT: IMAGE_QUESTION_MAX_LENGTH,
  TEXT_WITH_HINT: TEXT_QUESTION_MAX_LENGTH,
  IMAGE_URI: IMAGE_URI_MAX_LENGTH,
};

const globallyAllowedQuestionCreationStrategies = [
  'IMAGE',
  'TEXT',
  'IMAGE_WITH_HINT',
  'TEXT_WITH_HINT',
];

const additionalQuestionCreationStrategiesForPrivilege = {
  image_cards: ['IMAGE_URI'],
};

const successValidationResult = { success: true };

function getAllowedQuestionCreationStrategies(userPrivileges = []) {
  return globallyAllowedQuestionCreationStrategies
    .concat(
      (userPrivileges || [])
        .filter(p => p.value)
        .flatMap(p => additionalQuestionCreationStrategiesForPrivilege[p.id] || []),
    );
}

function createFailureValidationResult(rejectedLine, rejectionReason, card) {
  return {
    success: false,
    rejectedLine,
    rejectionReason,
    rejectedCard: card,
  };
}

function sanitizeDeckPreValidation(deck) {
  if (!deck || !Array.isArray(deck.cards)) {
    return deck;
  }

  if (!deck.restrictToServers) {
    deck.restrictToServers = [];
  }

  if (!deck.hidden) {
    deck.hidden = false;
  }

  if (typeof deck.restrictToServers === 'string') {
    deck.restrictToServers = deck.restrictToServers.split(',').filter(Boolean);
  }

  if (deck.public) {
    deck.restrictToServers = [];
  }

  const deckCopy = { ...deck, cards: deck.cards.slice() };

  if (typeof deckCopy.shortName === typeof '') {
    deckCopy.shortName = deckCopy.shortName.trim().toLowerCase();
  }

  if (typeof deckCopy.name === typeof '') {
    deckCopy.name = deckCopy.name.trim();
  }

  if (typeof deckCopy.description === typeof '') {
    deckCopy.description = deckCopy.description.trim();
  }

  for (let cardIndex = 0; cardIndex < deckCopy.cards.length; cardIndex += 1) {
    const card = deckCopy.cards[cardIndex];

    if (!card) {
      continue;
    }

    const cardCopy = { ...card };

    if (typeof cardCopy.question === typeof '') {
      cardCopy.question = cardCopy.question.trim();
    }

    if (typeof cardCopy.instructions === typeof '') {
      cardCopy.instructions = cardCopy.instructions.trim();
    }

    if (typeof cardCopy.comment === typeof '') {
      cardCopy.comment = cardCopy.comment.trim();
    }

    if (typeof cardCopy.questionCreationStrategy === typeof '') {
      cardCopy.questionCreationStrategy = cardCopy.questionCreationStrategy.trim();
    }

    if (cardCopy.questionCreationStrategy.includes('HINT')) {
      cardCopy.answerTimeLimitStrategy = 'WITH_HINT';
    }

    cardCopy.answers = cardCopy.answers
      .filter(x => typeof x === typeof '')
      .map(x => x.trim())
      .filter(x => x);

    deckCopy.cards[cardIndex] = cardCopy;
  }

  return deckCopy;
}

function validateCards(cards, userPrivileges = []) {
  const allowedQuestionCreationStrategies = getAllowedQuestionCreationStrategies(userPrivileges);

  for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
    const card = cards[cardIndex];

    if (card === null) {
      continue;
    }

    if (typeof card !== typeof {}) {
      return createFailureValidationResult(cardIndex, 'Question is not an object. Please report this error.', card);
    }

    if (!allowedQuestionCreationStrategies.some(strat => strat === card.questionCreationStrategy)) {
      return createFailureValidationResult(cardIndex, `Invalid Render As strategy. It must be either Image, Text, Image with hint, or Text with hint.`, card);
    }

    if (typeof card.question !== typeof '') {
      return createFailureValidationResult(cardIndex, 'Question is not a string. Please report this error.', card);
    }

    if (card.question.length < 1) {
      return createFailureValidationResult(cardIndex, 'No question. Please add a question or clear out the row.', card);
    }

    if (card.question.length > maxLengthForQuestionCreationStrategy[card.questionCreationStrategy]) {
      return createFailureValidationResult(cardIndex, `That question is too long for that render mode. Questions must be ${maxLengthForQuestionCreationStrategy[card.questionCreationStrategy]} characters long or shorter.`, card);
    }

    if (card.questionCreationStrategy.includes('HINT') !== (card.answerTimeLimitStrategy === 'WITH_HINT')) {
      return createFailureValidationResult(cardIndex, 'Mismatch between question creation strategy and answer time limit strategy.', card);
    }

    if (card.questionCreationStrategy === 'IMAGE_URI') {
      if (!card.question.startsWith('http://') && !card.question.startsWith('https://')) {
        return createFailureValidationResult(cardIndex, 'Image URI questions must be links to images, starting with https:// or http://', card);
      }
    }

    if (!Array.isArray(card.answers)) {
      return createFailureValidationResult(cardIndex, 'Answers is not an array. Please report this error.', card);
    }

    if (card.answers.length === 0) {
      return createFailureValidationResult(cardIndex, 'No answers. Please add at least one answer or clear out the row. You can separate multiple answers with commas.', card);
    }

    const answersTotalLength = card.answers.reduce((sum, answer) => sum + answer.length, 0);
    if (answersTotalLength > ANSWERS_TOTAL_MAX_LENGTH) {
      return createFailureValidationResult(cardIndex, `The answers are too long. All answers combined must be ${ANSWERS_TOTAL_MAX_LENGTH} characters long or fewer.`, card);
    }

    if (typeof card.comment !== typeof '') {
      return createFailureValidationResult(cardIndex, 'Comment is not a string. Please report this error.', card);
    }

    if (card.comment.length > COMMENT_MAX_LENGTH) {
      return createFailureValidationResult(cardIndex, `Comment is too long. Comment must be ${COMMENT_MAX_LENGTH} characters or fewer.`, card);
    }

    if (typeof card.instructions !== typeof '') {
      return createFailureValidationResult(cardIndex, 'Instructions is not a string. Please report this error.', card);
    }

    if (card.instructions.length > INSTRUCTIONS_MAX_LENGTH) {
      return createFailureValidationResult(cardIndex, `Instructions is too long. Instructions must be ${COMMENT_MAX_LENGTH} characters or fewer.`, card);
    }
  }

  const indexForQuestion = new Map();

  for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
    const card = cards[cardIndex];
    if (!card) {
      continue;
    }

    const existingIndex = indexForQuestion.get(card.question);
    if (existingIndex === undefined) {
      indexForQuestion.set(card.question, cardIndex);
    } else {
      return createFailureValidationResult(cardIndex, `Questions #${existingIndex} and #${cardIndex} have the same question. All questions must be unique.`, card);
    }
  }

  return successValidationResult;
}

function countOccurrences(str, character) {
  let count = 0;
  for (let i = 0; i < str.length; ++i) {
    count += str[i] === character ? 1 : 0;
  }

  return count;
}

function validateDeck(deck, userPrivileges = []) {
  if (typeof deck !== typeof {}) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck is not an object. Please report this error.');
  }

  if (typeof deck.hidden !== typeof true) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Hidden is not boolean. Please report this error.');
  }

  if (typeof deck.public !== typeof true) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Public is not boolean. Please report this error.');
  }

  if (deck.hidden && deck.public) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'A deck cannot be both public and hidden');
  }

  if (!Array.isArray(deck.restrictToServers)) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Restrict to servers is not an array. Please report this error.');
  }

  if (deck.restrictToServers.some(s => !/^[0-9]+$/.test(s))) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Invalid server ID to restrict usage to. Server IDs must be numbers.');
  }

  if (deck.public && deck.restrictToServers.length > 0) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'A deck cannot be public and also restricted to specific servers. If you want to restrict to specific servers, make the deck hidden.');
  }

  if (typeof deck.name !== typeof '') {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck name is not a string. Please report this error.');
  }

  if (typeof deck.shortName !== typeof '') {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck short name is not a string. Please report this error.');
  }

  if (typeof deck.description !== typeof '') {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck description is not a string. Please report this error.');
  }

  if (reservedWords.some(reservedName => reservedName === deck.shortName)) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'That short deck name is reserved. Please choose a different short name.');
  }

  if (deck.shortName.length < 1 || deck.shortName.length > SHORT_NAME_MAX_LENGTH) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's short name must be more than 0 and no more than ${SHORT_NAME_MAX_LENGTH} characters long.`);
  }

  if (!deck.shortName.match(SHORT_NAME_ALLOWED_CHARACTERS_REGEX)) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's short name must contain only letters, numbers, and underscores.`);
  }

  if (!Array.isArray(deck.cards)) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Cards is not an array. Please report this error.');
  }

  if (deck.cards.length === 0) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'No questions. Please add at least one question.');
  }

  if (deck.cards.length > MAX_CARDS) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `Too many questions. Decks must have ${MAX_CARDS} or fewer questions. If you have legitimate reasons for needing a bigger deck, contact me.`);
  }

  if (deck.name.length < 1 || deck.name.length > FULL_NAME_MAX_LENGTH) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's full name must be more than 0 and no more than ${FULL_NAME_MAX_LENGTH} characters long.`);
  }

  if (deck.name.includes('\n')) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's full name must not contain newlines.`);
  }

  if (deck.description.length > DESCRIPTION_MAX_LENGTH) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's description must be no more than than ${DESCRIPTION_MAX_LENGTH} characters long.`);
  }

  if (countOccurrences(deck.description, '\n') > MAX_NEWLINES_IN_DESCRIPTION) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's description must have no more than ${MAX_NEWLINES_IN_DESCRIPTION} newlines.`);
  }

  return validateCards(deck.cards, userPrivileges);
}

module.exports = {
  FULL_NAME_MAX_LENGTH,
  SHORT_NAME_MAX_LENGTH,
  INSTRUCTIONS_MAX_LENGTH,
  IMAGE_QUESTION_MAX_LENGTH,
  TEXT_QUESTION_MAX_LENGTH,
  ANSWERS_TOTAL_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  NON_LINE_ERROR_LINE,
  DECK_VALIDATION_ERROR_TYPE,
  SHORT_NAME_ALLOWED_CHARACTERS_REGEX,
  SHORT_NAME_ALLOWED_CHARACTERS_REGEX_HTML,
  getAllowedQuestionCreationStrategies,
  validateDeck,
  sanitizeDeckPreValidation,
};
