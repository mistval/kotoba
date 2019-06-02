const FULL_NAME_MAX_LENGTH = 60;
const SHORT_NAME_MAX_LENGTH = 25;
const INSTRUCTIONS_MAX_LENGTH = 400;
const IMAGE_QUESTION_MAX_LENGTH = 20;
const TEXT_QUESTION_MAX_LENGTH = 400;
const ANSWERS_TOTAL_MAX_LENGTH = 200;
const COMMENT_MAX_LENGTH = 600;
const MAX_CARDS = 20000;
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
];

const maxLengthForQuestionCreationStrategy = {
  IMAGE: IMAGE_QUESTION_MAX_LENGTH,
  TEXT: TEXT_QUESTION_MAX_LENGTH,
};

const allowedQuestionCreationStrategies = Object.keys(maxLengthForQuestionCreationStrategy);

const successValidationResult = { success: true };

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

  const deckCopy = { ...deck, cards: deck.cards.slice() };

  if (typeof deckCopy.shortName === typeof '') {
    deckCopy.shortName = deckCopy.shortName.trim().toLowerCase();
  }

  if (typeof deckCopy.name === typeof '') {
    deckCopy.name = deckCopy.name.trim();
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

    cardCopy.answers = cardCopy.answers
      .filter(x => typeof x === typeof '')
      .map(x => x.trim())
      .filter(x => x);

    deckCopy.cards[cardIndex] = cardCopy;
  }

  return deckCopy;
}

function validateCards(cards) {
  for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
    const card = cards[cardIndex];

    if (card === null) {
      continue;
    }

    if (typeof card !== typeof {}) {
      return createFailureValidationResult(cardIndex, 'Question is not an object. Please report this error.', card);
    }

    if (typeof card.questionCreationStrategy !== typeof '') {
      return createFailureValidationResult(cardIndex, 'Question creation strategy is not a string. Please report this error.', card);
    }

    if (!card.questionCreationStrategy) {
      return createFailureValidationResult(cardIndex, 'No value for Render As. Render As must be either Image or Text.', card);
    }

    if (!allowedQuestionCreationStrategies.some(strat => strat === card.questionCreationStrategy)) {
      return createFailureValidationResult(cardIndex, 'Invalid Render As strategy. It must be either Image or Text.', card);
    }

    if (typeof card.question !== typeof '') {
      return createFailureValidationResult(cardIndex, 'Question is not a string. Please report this error.', card);
    }

    if (card.question.length < 1) {
      return createFailureValidationResult(cardIndex, 'No question. Please add a question or clear out the row.', card);
    }

    if (card.questionCreationStrategy === 'IMAGE' && card.question.length > IMAGE_QUESTION_MAX_LENGTH) {
      return createFailureValidationResult(cardIndex, `That question is too long to render as an image. Only questions ${IMAGE_QUESTION_MAX_LENGTH} characters long or shorter can be rendered as an image. Consider shortening the question or setting its Render As to 'Text'.`, card);
    }

    if (card.questionCreationStrategy === 'TEXT' && card.question.length > TEXT_QUESTION_MAX_LENGTH) {
      return createFailureValidationResult(cardIndex, `That question is too long. Questions must be ${TEXT_QUESTION_MAX_LENGTH} characters long or shorter.`, card);
    }

    if (card.questionCreationStrategy !== 'IMAGE' && card.questionCreationStrategy !== 'TEXT') {
      throw new Error('Unexpected question creation strategy');
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

  for (let card1Index = 0; card1Index < cards.length; card1Index += 1) {
    const card1 = cards[card1Index];
    if (!card1) {
      continue;
    }

    for (let card2Index = card1Index + 1; card2Index < cards.length; card2Index += 1) {
      const card2 = cards[card2Index];
      if (!card2) {
        continue;
      }

      if (card1.question.trim() === card2.question.trim()) {
        return createFailureValidationResult(card1Index, `Questions #${card1Index} and #${card2Index} have the same question. All questions must be unique.`, card1);
      }
    }
  }

  return successValidationResult;
}

function validateDeck(deck) {
  if (typeof deck !== typeof {}) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck is not an object. Please report this error.');
  }

  if (typeof deck.name !== typeof '') {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck name is not a string. Please report this error.');
  }

  if (typeof deck.shortName !== typeof '') {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'Deck short name is not a string. Please report this error.');
  }

  if (reservedWords.some(reservedName => reservedName === deck.shortName)) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, 'That short deck name is reserved. Please choose a different short name.');
  }

  if (deck.shortName.length < 1 || deck.shortName.length > SHORT_NAME_MAX_LENGTH) {
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's short name must be more than 0 and less than ${SHORT_NAME_MAX_LENGTH} characters long.`);
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
    return createFailureValidationResult(NON_LINE_ERROR_LINE, `The deck's full name must be more than 0 and less than ${FULL_NAME_MAX_LENGTH} characters long.`);
  }

  return validateCards(deck.cards);
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
  allowedQuestionCreationStrategies,
  validateDeck,
  sanitizeDeckPreValidation,
};
