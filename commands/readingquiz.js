'use strict'
const reload = require('require-reload')(require);
const quizManager = reload('./../kotoba/quiz_manager.js');
const content = reload('./../kotoba/quiz_decks_content.js').content;
const getCategoryHelp = reload('./../kotoba/quiz_decks_content.js').getHelpForCategory;
const constants = reload('./../kotoba/constants.js');
const logger = reload('monochrome-bot').logger;
const PublicError = reload('monochrome-bot').PublicError;

const LOGGER_TITLE = 'QUIZ';
const MAXIMUM_UNANSWERED_QUESTIONS_DISPLAYED = 20;
const MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH = 275;

function getFinalAnswerLineForQuestionAndAnswerLinkAnswer(card) {
  return card.question + ' ([' + card.answer.join(',') + '](' + card.dictionaryLink + '))';
}

function getFinalAnswerLineForQuestionAndAnswerLinkQuestion(card) {
  return '[' + card.question + '](' + card.dictionaryLink + ') (' + card.answer.join(', ') + ')';
}

function getFinalAnswerLineForAnswerOnly(card) {
  return '[' + card.answer.join(',') + '](' + card.dictionaryLink + ')';
}

function getFinalAnswerLineForQuestionOnly(card) {
  return '[' + card.question + '](' + card.dictionaryLink + ')';
}

const FinalAnswerListElementStrategy = {
  QUESTION_AND_ANSWER_LINK_QUESTION: getFinalAnswerLineForQuestionAndAnswerLinkQuestion,
  QUESTION_AND_ANSWER_LINK_ANSWER: getFinalAnswerLineForQuestionAndAnswerLinkAnswer,
  ANSWER_ONLY: getFinalAnswerLineForAnswerOnly,
  QUESTION_ONLY: getFinalAnswerLineForQuestionOnly,
};

function getIntermediateAnswerLineForCorrectAnswers(card) {
  return card.answer.join('\n');
}

function getIntermediateAnswerLineForAnswersWithScorersAndPointsFirst(card, answersForUser, pointsPerAnswerForUser) {
  let allUserAnswers = Object.keys(answersForUser).map(userId => answersForUser[userId]).reduce((a, b) => a.concat(b), []);
  let allAnswers = card.answer;
  let users = Object.keys(answersForUser);
  let lines = [];
  for (let userId of users) {
    let answers = answersForUser[userId];
    let points = pointsPerAnswerForUser[userId];
    for (let i = 0; i < answers.length; ++i) {
      let answer = answers[i];
      let point = points[i];
      lines.push(`${answer} (<@${userId}> got ${point} points)`);
    }
  }

  let scorersString = lines.join('\n');
  let totalString = scorersString += '\n\n';

  let nextAnswerIndex = 0;
  while (true) {
    if (nextAnswerIndex >= allAnswers.length) {
      break;
    }
    let nextAnswer = allAnswers[nextAnswerIndex];
    ++nextAnswerIndex;
    if (totalString.length + nextAnswer.length + 3 > MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH) {
      break;
    }

    if (nextAnswerIndex === 1) {
      totalString += nextAnswer;
    } else {
      totalString += '   ' + nextAnswer;
    }
  }

  if (nextAnswerIndex < allAnswers.length) {
    totalString += '  and more';
  }

  return totalString;
}

const IntermediateAnswerListElementStrategy = {
  CORRECT_ANSWERS: getIntermediateAnswerLineForCorrectAnswers,
  ANSWERS_WITH_SCORERS_AND_POINTS_FIRST: getIntermediateAnswerLineForAnswersWithScorersAndPointsFirst,
};

function createEndQuizMessage(quizName, scores, unansweredQuestions, aggregateLink, description) {
  let fields = [];

  if (scores.length > 0) {
    let finalScoresValue = scores.map(score => {
      let string = '<@' + score.userId + '> has ' + score.totalScore + ' points';
      if (score.totalScore !== score.normalizedScore) {
        string += ' (' + score.normalizedScore + ' for leaderboard)';
      }
      return string;
    }).join('\n');
    fields.push({name: 'Final Scores', value: finalScoresValue});
  }

  if (unansweredQuestions.length > 0) {
    let unansweredQuestionsLines = unansweredQuestions.map(card => {
      return FinalAnswerListElementStrategy[card.discordFinalAnswerListElementStrategy](card);
    });

    let unansweredQuestionsCharacters = 0;
    for (let i = 0; i < unansweredQuestionsLines.length; ++i) {
      unansweredQuestionsCharacters += unansweredQuestionsLines[i].length + '\n'.length;
      if (unansweredQuestionsCharacters > constants.MAXIMUM_FIELD_LENGTH || i >= MAXIMUM_UNANSWERED_QUESTIONS_DISPLAYED) {
        unansweredQuestionsLines = unansweredQuestionsLines.slice(0, i - 1);
        unansweredQuestionsLines.push('...More...');
        break;
      }
    }

    let unansweredQuestionsString = unansweredQuestionsLines.join('\n');
    fields.push({name: 'Unanswered Questions', value: unansweredQuestionsString});
  }

  let response = {
    embed: {
      title: quizName + ' Ended',
      url: aggregateLink,
      description: description,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: fields,
      footer: {icon_url: constants.FOOTER_ICON_URI, text: 'Say k!lb to see the server leaderboard.'}
    }
  };

  return response;
}

function createAfterQuizMessage(canReview) {
  if (canReview) {
    return {
      embed: {
        title: `Say 'k!quiz review' to review the questions that you missed.`,
        description: 'Check out my new JLPT kanji usage quizzes! They are called k_N5, k_N4, k_N3, k_N2, k_N1.',
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
  } else {
    return {
      embed: {
        title: 'Check out my new JLPT kanji usage quizzes! They are called k_N5, k_N4, k_N3, k_N2, k_N1.',
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
  }
}

function sendEndQuizMessages(bot, channelId, quizName, scores, unansweredQuestions, aggregateLink, canReview, description) {
  let endQuizMessage = createEndQuizMessage(quizName, scores, unansweredQuestions, aggregateLink, description);
  return bot.createMessage(channelId, endQuizMessage).then(() => {
    return bot.createMessage(channelId, createAfterQuizMessage(canReview));
  });
}

class DiscordMessageSender {
  constructor(bot, channelId) {
    this.bot_ = bot;
    this.channelId_ = channelId;
  }

  notifyStarting(inMs, quizName, quizArticle) {
    let inSeconds = inMs / 1000;
    return this.bot_.createMessage(this.channelId_, 'Starting ' + quizArticle + ' **' + quizName + '** in ' + inSeconds + ' seconds!');
  }

  showAnswerTimeout(card) {
    let correctAnswerText = IntermediateAnswerListElementStrategy[card.discordIntermediateAnswerListElementStrategy](card, {}, {});
    let fields = [
      {name: 'Correct Answers', value: correctAnswerText},
    ];
    if (card.meaning) {
      fields.push({name: 'Meaning', value: card.meaning});
    }
    let response = {
      embed: {
        title: card.deckName,
        url: card.dictionaryLink,
        description: 'Time\'s up!',
        color: constants.EMBED_WRONG_COLOR,
        fields: fields,
      },
    };
    return this.bot_.createMessage(this.channelId_, response);
  }

  outputQuestionScorers(card, scorers, scoreForUser, answersForUser, pointsPerAnswerForUser, messageId) {
    let scorersListText = scorers.map(userId => {
      return '<@' + userId + '> (' + scoreForUser[userId].totalScore + ' points)';
    }).join('\n');

    let correctAnswerText = IntermediateAnswerListElementStrategy[card.discordIntermediateAnswerListElementStrategy](card, answersForUser, pointsPerAnswerForUser);
    let fields = [
      {name: 'Correct Answers', value: correctAnswerText, inline: true},
      {name: 'Scorers', value: scorersListText, inline: true},
    ];
    if (card.meaning) {
      fields.push({name: 'Meaning', value: card.meaning});
    }

    let response = {
      embed: {
        title: card.deckName,
        url: card.dictionaryLink,
        description: '<@' + scorers[0] + '> guessed it first!',
        color: constants.EMBED_CORRECT_COLOR,
        fields: fields,
      },
    };
    if (messageId) {
      return this.bot_.editMessage(this.channelId_, messageId, response).then(() => {
        return messageId;
      });
    } else {
      return this.bot_.createMessage(this.channelId_, response).then(newMessage => {
        return newMessage && newMessage.id;
      });
    }
  }

  showQuestion(question, questionId) {
    let content = {
      embed: {
        title: question.deckName,
        description: question.instructions,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };

    let uploadInformation;
    if (question.bodyAsPngBuffer) {
      content.embed.image = {url: 'attachment://upload.png'};
      uploadInformation = {file: question.bodyAsPngBuffer, name: 'upload.png'};
    }
    if (question.bodyAsText) {
      content.embed.description = question.bodyAsText; // This overwrites the quiz instructions.
    }
    if (question.hintString) {
      content.embed.footer = {text: question.hintString};
    }

    if (!questionId) {
      return this.bot_.createMessage(this.channelId_, content, uploadInformation).then(msg => {
        return msg.id;
      });
    } else {
      return this.bot_.editMessage(this.channelId_, questionId, content, uploadInformation);
    }
  }

  notifyQuizEndedScoreLimitReached(quizName, scores, unansweredQuestions, aggregateLink, canReview, scoreLimit) {
    let description = 'The score limit of ' + scoreLimit + ' was reached by <@' + scores[0].userId +'>. Congratulations!';
    return sendEndQuizMessages(this.bot_, this.channelId_, quizName, scores, unansweredQuestions, aggregateLink, canReview, description);
  }

  notifyQuizEndedUserCanceled(quizName, scores, unansweredQuestions, aggregateLink, canReview, cancelingUserId) {
    let description = '<@' + cancelingUserId + '> asked me to stop the quiz.';
    return sendEndQuizMessages(this.bot_, this.channelId_, quizName, scores, unansweredQuestions, aggregateLink, canReview, description);
  }

  notifyQuizEndedTooManyWrongAnswers(quizName, scores, unansweredQuestions, aggregateLink, canReview, wrongAnswers) {
    let description = wrongAnswers + ' questions in a row went unanswered. So I stopped!';
    return sendEndQuizMessages(this.bot_, this.channelId_, quizName, scores, unansweredQuestions, aggregateLink, canReview, description);
  }

  notifyQuizEndedError(quizName, scores, unansweredQuestions, aggregateLink, canReview, wrongAnswers) {
    let description = 'Sorry, I had an error and had to stop the quiz :( The error has been logged and will be addressed.';
    return sendEndQuizMessages(this.bot_, this.channelId_, quizName, scores, unansweredQuestions, aggregateLink, canReview, description);
  }

  notifyQuizEndedNoQuestionsLeft(quizName, scores, unansweredQuestions, aggregateLink, canReview, wrongAnswers) {
    let description = 'No questions left in that deck. Impressive!';
    return sendEndQuizMessages(this.bot_, this.channelId_, quizName, scores, unansweredQuestions, aggregateLink, canReview, description);
  }
}

const createErrorMessageForErrorType = {};
createErrorMessageForErrorType[quizManager.CreateSessionFailureReason.ALREADY_RUNNING] = () => 'There is already a quiz running in this channel. I can\'t start another one, that would be confusing!';
createErrorMessageForErrorType[quizManager.CreateSessionFailureReason.DECK_NOT_FOUND] = (error) => `I don't have a deck named **${error.nonExistentDeckName}**. Say **k!quiz** to see the decks I have!`;
createErrorMessageForErrorType[quizManager.CreateSessionFailureReason.NO_REVIEW_DECK] = () => 'Sorry, I don\'t remember the session you want to review. Say **k!quiz** to start a new quiz.';

const mixtureReplacements = {
  easymix: 'n5+n4+defs1+anagrams3+anagrams4+10k+katakana',
  medmix: 'n3+defs7+9k+8k+7k+anagrams5+prefectures',
  hardmix: 'n2+n1+6k+5k+defs12+defs13+onomato+numbers+anagrams6',
  hardermix: '4k+3k+j2k+defs17+defs18+defs14+anagrams7+anagrams8+tokyo+stations+myouji+namae+ejtrans+hard+擬音語+kklc',
  insanemix: '2k+j1k+1k+anagrams9+anagrams10+yojijukugo+countries+animals',
};

module.exports = {
  commandAliases: ['k!quiz', 'k!readingQuiz', 'k!starttest', 'k!startquiz', 'k!rt', 'k!rq', 'k!q'],
  aliasesForHelp: ['k!quiz', 'k!q'],
  canBeChannelRestricted: true,
  uniqueId: 'readingQuiz14934',
  cooldown: 1,
  shortDescription: 'Start a quiz with the specified deck.',
  longDescription: 'See available quiz decks, or start a quiz.\n\nYou can configure some quiz settings. If you want a JLPT N4 quiz with a score limit of 30, only 1 second between questions, and only 10 seconds to answer, try this:\nk!quiz N4 30 1 10\n\nAssociated commands:\nk!quiz stop (ends the current quiz)\nk!lb (shows the quiz leaderboard)\n\nServer admins can set default quiz settings by using the k!settings command.',
  usageExample: '\'k!quiz n5\'. \'k!quiz\' lists decks, \'k!quiz stop\' stops the quiz.',
  requiredSettings: quizManager.getDesiredSettings(),
  action(bot, msg, suffix, settings) {
    suffix = suffix.toLowerCase();
    if (suffix.startsWith('stop') || suffix.startsWith('end') || suffix.startsWith('endquiz') || suffix.startsWith('quit')) {
      return quizManager.stopQuiz(msg.channel.id, msg.author.id);
    }
    if (!suffix || suffix === 'help') {
      return bot.createMessage(msg.channel.id, content);
    }
    let categoryHelp = getCategoryHelp(suffix);
    if (categoryHelp) {
      return msg.channel.createMessage(categoryHelp);
    }
    let messageSender = new DiscordMessageSender(bot, msg.channel.id);
    let scoreScopeId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    let error;

    let quizString = suffix;
    let isMixture = false;
    for (let mixtureKey of Object.keys(mixtureReplacements)) {
      if (~quizString.indexOf(mixtureKey)) {
        quizString = quizString.replace(mixtureKey, mixtureReplacements[mixtureKey]);
        isMixture = true;
      }
    }

    // Hacky way to set the score limit to 20. Should clean up sometime.
    if (isMixture && settings['quiz/japanese/score_limit'] === 10 && quizString.split(' ').length === 1) {
      quizString += ' 20';
    }

    if (quizString.split(' ')[0].toLowerCase().indexOf('review') !== -1) {
      error = quizManager.tryCreateReviewQuizSession(messageSender, msg.channel.id, scoreScopeId, settings);
    } else {
      error = quizManager.tryCreateQuizSession(messageSender, msg.channel.id, quizString, scoreScopeId, settings);
    }

    if (error) {
      let publicMessage = createErrorMessageForErrorType[error.errorType](error);
      throw PublicError.createWithCustomPublicMessage(publicMessage, false, error.errorType);
    }
  },
};
