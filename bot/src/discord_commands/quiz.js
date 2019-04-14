const reload = require('require-reload')(require);
const state = require('./../common/static_state.js');
const assert = require('assert');
const globals = require('./../common/globals.js');
const { Permissions } = require('monochrome-bot');
const quizReportManager = require('./../common/quiz/session_report_manager.js');

const quizManager = reload('./../common/quiz/manager.js');
const createHelpContent = reload('./../common/quiz/decks_content.js').createContent;
const getAdvancedHelp = reload('./../common/quiz/decks_content.js').getAdvancedHelp;
const constants = reload('./../common/constants.js');
const { PublicError } = require('monochrome-bot');
const NormalGameMode = reload('./../common/quiz/normal_mode.js');
const MasteryGameMode = reload('./../common/quiz/mastery_mode.js');
const ConquestGameMode = reload('./../common/quiz/conquest_mode.js');
const ReviewGameMode = reload('./../common/quiz/review_mode.js');
const saveManager = reload('./../common/quiz/pause_manager.js');
const deckLoader = reload('./../common/quiz/deck_loader.js');
const DeckCollection = reload('./../common/quiz/deck_collection.js');
const Session = reload('./../common/quiz/session.js');
const trimEmbed = reload('./../common/util/trim_embed.js');
const audioConnectionManager = reload('./../discord/audio_connection_manager.js');

const LOGGER_TITLE = 'QUIZ';
const MAXIMUM_UNANSWERED_QUESTIONS_DISPLAYED = 20;
const MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH = 275;
const NEW_QUESTION_DELAY_IN_MS_FOR_USER_OVERRIDE = 3000;
const MASTERY_NAME = 'conquest';
const CONQUEST_NAME = 'inferno';
const MASTERY_EXTENSION = `-${MASTERY_NAME}`;
const CONQUEST_EXTENSION = `-${CONQUEST_NAME}`;
const INTERMEDIATE_ANSWER_TRUNCATION_REPLACEMENT = ' [...]';

function createMasteryModeDisabledString(prefix) {
  return `Conquest Mode is not enabled in this channel. Please do it in a different channel, or in DM, or ask a server admin to enable it by saying **${prefix}settings quiz/japanese/conquest_and_inferno_enabled enabled**`;
}

function createConquestModeDisabledString(prefix) {
  return `Inferno Mode is not enabled in this channel. Please do it in a different channel, or in DM, or ask a server admin to enable it by saying **${prefix}settings quiz/japanese/conquest_and_inferno_enabled enabled**`;
}

function createTitleOnlyEmbedWithColor(title, color) {
  return {
    embed: {
      title,
      color,
    },
  };
}

function createTitleOnlyEmbed(title) {
  return createTitleOnlyEmbedWithColor(title, constants.EMBED_NEUTRAL_COLOR);
}

function getFinalAnswerLineForQuestionAndAnswerLinkAnswer(card) {
  return `${card.question} ([${card.answer.join(', ')}](${card.dictionaryLink}))`;
}

function getFinalAnswerLineForQuestionAndAnswerBoldAnswer(card) {
  return `-- ${card.question} (**${card.answer.join(', ')}**)`;
}

function getFinalAnswerLineForQuestionAndAnswerLinkQuestion(card) {
  return `[${card.question}](${card.dictionaryLink}) (${card.answer.join(', ')})`;
}

function getFinalAnswerLineForAnswerOnly(card) {
  return `[${card.answer.join(',')}](${card.dictionaryLink})`;
}

function getFinalAnswerLineForQuestionOnly(card) {
  return `[${card.question}](${card.dictionaryLink})`;
}

function getFinalAnswerLineForJpTestAudio(card) {
  const uri = `http://japanesetest4you.com/mp3/${card.question}`
  return `[${card.question}](${uri}) (${card.answer.join(', ')})`;
}

function getFinalAnswerLineForForvoAudioLink(card) {
  const answer = card.answer[0];
  const uri = `https://forvo.com/word/${encodeURIComponent(answer)}/#ja`;
  return `[${answer}](${uri})`;
}

const FinalAnswerListElementStrategy = {
  QUESTION_AND_ANSWER_LINK_QUESTION: getFinalAnswerLineForQuestionAndAnswerLinkQuestion,
  QUESTION_AND_ANSWER_LINK_ANSWER: getFinalAnswerLineForQuestionAndAnswerLinkAnswer,
  QUESTION_AND_ANSWER_BOLD_ANSWER: getFinalAnswerLineForQuestionAndAnswerBoldAnswer,
  ANSWER_ONLY: getFinalAnswerLineForAnswerOnly,
  QUESTION_ONLY: getFinalAnswerLineForQuestionOnly,
  JPTEST_FOR_YOU_AUDIO_LINK: getFinalAnswerLineForJpTestAudio,
  FORVO_AUDIO_LINK: getFinalAnswerLineForForvoAudioLink,
};

function truncateIntermediateAnswerString(str) {
  if (str.length > MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH) {
    const substringStart = 0;
    const substringEnd = MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH -
      INTERMEDIATE_ANSWER_TRUNCATION_REPLACEMENT.length;

    return str.substring(substringStart, substringEnd) + INTERMEDIATE_ANSWER_TRUNCATION_REPLACEMENT;
  }
  return str;
}

function getIntermediateAnswerLineForCorrectAnswers(card) {
  return truncateIntermediateAnswerString(card.answer.join('\n'));
}

function getIntermediateAnswerLineForAnswersWithScorersAndPointsFirst(
  card,
  answersForUser,
  pointsForAnswer,
) {
  const userIds = Object.keys(answersForUser);
  const lines = [];

  userIds.forEach((userId) => {
    const answers = answersForUser[userId];
    answers.forEach((answer) => {
      const point = pointsForAnswer[answer];
      lines.push(`${answer} (<@${userId}> got ${point} points)`);
    });
  });

  const scorersString = lines.join('\n');
  let totalString = `${scorersString}\n\n`;

  const answers = card.answer;
  let nextAnswerIndex = 0;
  while (true) {
    if (nextAnswerIndex >= answers.length) {
      break;
    }
    const nextAnswer = answers[nextAnswerIndex];
    const stringLengthWithNextAnswer = totalString.length + nextAnswer.length + 3;
    nextAnswerIndex += 1;
    if (stringLengthWithNextAnswer > MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH) {
      break;
    }

    if (nextAnswerIndex === 1) {
      totalString += nextAnswer;
    } else {
      totalString += `　${nextAnswer}`;
    }
  }

  if (nextAnswerIndex < answers.length) {
    totalString += '　**and more**';
  }

  return totalString;
}

const IntermediateAnswerListElementStrategy = {
  CORRECT_ANSWERS:
    getIntermediateAnswerLineForCorrectAnswers,
  ANSWERS_WITH_SCORERS_AND_POINTS_FIRST:
    getIntermediateAnswerLineForAnswersWithScorersAndPointsFirst,
};

function createEndQuizMessage(quizName, scores, unansweredQuestions, aggregateLink, description, prefix, reportUri) {
  const fields = [];

  if (scores.length > 0) {
    const finalScoresValue = scores.map((score) => {
      let string = `<@${score.userId}> has ${score.totalScore} points`;
      if (score.totalScore !== score.normalizedScore) {
        string += ` (${Math.floor(score.normalizedScore)} for leaderboard)`;
      }
      return string;
    }).join('\n');
    fields.push({ name: 'Final Scores', value: finalScoresValue });
  }

  if (unansweredQuestions.length > 0) {
    const unansweredQuestionsLines = unansweredQuestions.map(card =>
      FinalAnswerListElementStrategy[card.discordFinalAnswerListElementStrategy](card));

    let unansweredQuestionsCharacters = 0;
    const separator = '\n';
    for (let i = 0; i < unansweredQuestionsLines.length; i += 1) {
      unansweredQuestionsCharacters += unansweredQuestionsLines[i].length + separator.length;
      if (
        unansweredQuestionsCharacters > constants.MAXIMUM_FIELD_LENGTH ||
        i >= MAXIMUM_UNANSWERED_QUESTIONS_DISPLAYED
      ) {
        const moreString = '...More...';

        // Pop off the last lines until it's small enough.
        while (
          unansweredQuestionsLines.join(separator).length +
          separator.length +
          moreString.length >
          constants.MAXIMUM_FIELD_LENGTH
        ) {
          unansweredQuestionsLines.pop();
        }
        unansweredQuestionsLines.push(moreString);
        break;
      }
    }

    const unansweredQuestionsString = unansweredQuestionsLines.join('\n');
    fields.push({ name: `Unanswered Questions (${unansweredQuestions.length})`, value: unansweredQuestionsString });
  }
  
  if (reportUri) {
    fields.push({ name: 'Game Report', value: `[View a detailed report for this game](${reportUri}) (and add missed questions to your custom decks)` });
  }

  const response = {
    embed: {
      title: `${quizName} Ended`,
      url: aggregateLink,
      description,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields,
      footer: { icon_url: constants.FOOTER_ICON_URI, text: `Say ${prefix}lb to see the server leaderboard.` },
    },
  };

  return trimEmbed(response);
}

const afterQuizMessages = [
  {
    embed: {
      title: 'Reviewing',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'Say **<prefix>quiz review** to review the questions no one answered, or **<prefix>quiz reviewme** to review the questions you didn\'t answer (only if you did answer at least one). You can say **<prefix>quiz reviewme** somewhere else (like in a DM) if you prefer.',
    },
  },
  {
    embed: {
      title: 'O, so you want Anki in Discord?',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: `Try **Conquest Mode**. Say **<prefix>quiz${MASTERY_EXTENSION}** to learn more.`,
    },
  },
  {
    embed: {
      title: 'Fonts',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'You can change fonts, colors, and sizes by using the **k!settings** command and going into the **Fonts** submenu.',
    },
  },
  {
    embed: {
      title: 'O, too fast/slow?',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'You can change timing settings by using the **k!settings** command, or say **k!help quiz** to see how to do it per-game.',
    },
  },
  {
    embed: {
      title: 'O, your lame friends don\'t use Discord?',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: '[Play on the web](https://kotobaweb.com/)',
    },
  },
  {
    embed: {
      title: 'Manual',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'For advanced quiz options, [visit me on the web](https://kotobaweb.com/bot/quiz).',
    },
  },
];

function createAfterQuizMessage(canReview, prefix) {
  let index;
  if (canReview) {
    index = Math.floor(Math.random() * afterQuizMessages.length);
  } else {
    index = 1 + Math.floor(Math.random() * (afterQuizMessages.length - 1));
  }
  const afterQuizMessage = { ...afterQuizMessages[index] };
  afterQuizMessage.embed = { ...afterQuizMessage.embed };
  afterQuizMessage.embed.description = afterQuizMessage.embed.description.replace(/<prefix>/g, prefix);
  return afterQuizMessage;
}

async function sendEndQuizMessages(
  commanderMessage,
  quizName,
  scores,
  unansweredQuestions,
  aggregateLink,
  canReview,
  description,
) {
  const prefix = commanderMessage.prefix;
  const endQuizMessage = createEndQuizMessage(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    description,
    prefix,
    await quizReportManager.getMostRecentReportUriForLocation(commanderMessage.channel.id),
  );

  await commanderMessage.channel.createMessage(endQuizMessage);
  const afterQuizMessage = createAfterQuizMessage(canReview, prefix);
  if (afterQuizMessage) {
    return commanderMessage.channel.createMessage(afterQuizMessage);
  }

  return undefined;
}

function convertDatabaseFacingSaveIdToUserFacing(saveId) {
  return saveId + 1;
}

function convertUserFacingSaveIdToDatabaseFacing(saveId) {
  return saveId - 1;
}

function getTimeString(timestamp) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
}

function sendSaveMementos(msg, currentSaveMementos, recyclingBinMementos, extraContent) {
  const prefix = msg.prefix;
  const embed = {
    title: 'Available Saves',
    footer: { icon_url: constants.FOOTER_ICON_URI, text: `Load the first save with: ${prefix}quiz load 1` },
    color: constants.EMBED_NEUTRAL_COLOR,
    fields: [],
  };

  if (currentSaveMementos.length > 0) {
    embed.fields.push({
      name: 'Current saves',
      value: currentSaveMementos.map((memento, index) => {
        return `${convertDatabaseFacingSaveIdToUserFacing(index)}: ${memento.quizType} (${getTimeString(memento.time)})`;
      }).join('\n'),
    });
  }

  if (recyclingBinMementos.length > 0) {
    embed.fields.push({
      name: 'Recycling bin',
      value: '(You can recover old saves from here if you need to. Don\'t wait too long.)\n\n' + recyclingBinMementos.map((memento, index) => {
        return `${convertDatabaseFacingSaveIdToUserFacing(index + currentSaveMementos.length)}: ${memento.quizType} (${getTimeString(memento.time)})`;
      }).join('\n'),
    });
  }

  return msg.channel.createMessage({ content: extraContent, embed }, null, msg);
}

function createCorrectPercentageField(card) {
  const totalAnswers = card.answerHistory.length;
  if (totalAnswers > 1) {
    const totalCorrect = card.answerHistory.reduce((a, b) => (b ? a + 1 : a), 0);
    const percentage = Math.floor((totalCorrect / totalAnswers) * 100);
    return { name: 'Correct Answer Rate', value: `${percentage}%`, inline: true };
  }

  return undefined;
}

class DiscordMessageSender {
  constructor(bot, commanderMessage) {
    this.commanderMessage = commanderMessage;
    this.bot = bot;
  }

  notifyStarting(inMs, quizName, quizDescription, quizLength, scoreLimit) {
    const inSeconds = inMs / 1000;
    const embedTitle = `Quiz Starting in ${inSeconds} seconds`;
    let embedDescription = `**${quizName}**`;
    if (quizDescription) {
      embedDescription = `${embedDescription} - ${quizDescription}`;
    }

    const fields = [
      { name: 'Deck size', value: quizLength, inline: true },
    ];

    if (scoreLimit !== Number.MAX_SAFE_INTEGER) {
      fields.push({ name: 'Score limit', value: scoreLimit, inline: true });
    }

    return this.commanderMessage.channel.createMessage({
      embed: {
        title: embedTitle,
        description: embedDescription,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields,
      },
    });
  }

  stopAudio() {
    const guild = this.commanderMessage.channel.guild;
    if (!guild) {
      return;
    }

    audioConnectionManager.stopPlaying(this.bot, guild.id);
  }

  showWrongAnswer(card, skipped, hardcore) {
    this.stopAudio();
    const correctAnswerFunction =
      IntermediateAnswerListElementStrategy[card.discordIntermediateAnswerListElementStrategy];
    const correctAnswerText = correctAnswerFunction(card, {}, {});
    const fields = [
      { name: 'Correct Answers', value: correctAnswerText, inline: true },
    ];

    const correctPercentageField = createCorrectPercentageField(card);
    if (correctPercentageField) {
      fields.push(correctPercentageField);
    }

    if (card.meaning) {
      fields.push({ name: card.commentFieldName, value: card.meaning, inline: false });
    }
    let response = {
      embed: {
        title: card.deckName,
        url: card.dictionaryLink,
        description: skipped ? 'Question skipped!' : (hardcore ? 'No one got it right' : 'Time\'s up!'),
        color: constants.EMBED_WRONG_COLOR,
        fields,
        footer: { icon_url: constants.FOOTER_ICON_URI, text: 'You can skip questions by saying \'skip\' or just \'s\'.' },
      },
    };
    response = trimEmbed(response);
    return this.commanderMessage.channel.createMessage(response);
  }

  async outputQuestionScorers(
    card,
    answerersInOrder,
    answersForUser,
    pointsForAnswer,
    scoreForUser,
    scoreLimit,
  ) {
    this.stopAudio();
    const scorersListText = answerersInOrder.map(answerer => `<@${answerer}> (${scoreForUser[answerer].totalScore} points)`).join('\n');

    const correctAnswerFunction =
      IntermediateAnswerListElementStrategy[card.discordIntermediateAnswerListElementStrategy];
    const correctAnswerText = correctAnswerFunction(card, answersForUser, pointsForAnswer);
    const playingToStr = scoreLimit === Number.MAX_SAFE_INTEGER ? '' : ` (playing to ${scoreLimit})`;
    const fields = [
      { name: 'Correct Answers', value: correctAnswerText, inline: true },
      { name: `Scorers ${playingToStr}`, value: scorersListText, inline: true },
    ];

    const correctPercentageField = createCorrectPercentageField(card);
    if (correctPercentageField) {
      fields.push(correctPercentageField);
    }
    if (card.meaning) {
      fields.push({
        name: card.commentFieldName,
        value: card.meaning,
        inline: !!correctPercentageField,
      });
    }

    let response = {
      embed: {
        title: card.deckName,
        url: card.dictionaryLink,
        description: `<@${answerersInOrder[0]}> got it first!`,
        color: constants.EMBED_CORRECT_COLOR,
        fields,
      },
    };

    response = trimEmbed(response);

    const newMessage = await this.commanderMessage.channel.createMessage(response);
    return newMessage && newMessage.id;
  }

  async showQuestion(question, questionId) {
    let title = question.deckName;

    if (question.deckProgress !== undefined) {
      const percentDone = Math.floor(question.deckProgress * 100);
      title = `${title} (${percentDone}% complete)`;
    }

    let content = {
      embed: {
        title,
        description: question.instructions,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [],
      },
    };

    let uploadInformation;
    if (question.bodyAsPngBuffer) {
      content.embed.image = { url: 'attachment://upload.png' };
      uploadInformation = { file: question.bodyAsPngBuffer, name: 'upload.png' };
    }
    if (question.hintString) {
      content.embed.footer = { text: question.hintString };
    }
    if (question.options) {
      content.embed.description = 'Type the number of the correct answer!'; // This overwrites the quiz instructions.
      const fieldValue = question.options.map((option, index) => {
        const optionCharacter = `${index + 1}`;
        return `**${optionCharacter}:** ${option}`;
      }).join('\n');
      content.embed.fields.push({ name: 'Possible Answers', value: fieldValue });
    }
    if (question.bodyAsText) {
      content.embed.description = question.bodyAsText.substring(0, 2000); // This overwrites the quiz instructions.
    }
    if (question.bodyAsImageUri) {
      content.embed.image = { url: `${question.bodyAsImageUri}.png` };
    }
    if (question.bodyAsAudioUri) {
      const serverId = this.commanderMessage.channel.guild.id;
      const voiceChannel = audioConnectionManager.getConnectedVoiceChannelForServerId(this.bot, serverId);
      content.embed.fields.push({name: 'Now playing in', value: `<#${voiceChannel.id}>`});
      content.embed.description = question.instructions;
      audioConnectionManager.play(this.bot, serverId, question.bodyAsAudioUri);
    }

    content = trimEmbed(content);
    if (!questionId) {
      const msg = await this.commanderMessage.channel.createMessage(content, uploadInformation);
      return msg.id;
    }

    return this.bot.editMessage(this.commanderMessage.channel.id, questionId, content, uploadInformation);
  }

  notifySaveSuccessful() {
    this.closeAudioConnection();
    return this.commanderMessage.channel.createMessage(createTitleOnlyEmbed(`The quiz has been saved and paused! Say '${this.commanderMessage.prefix}quiz load' later to start it again.`));
  }

  notifySaveFailedNoSpace(maxSaves) {
    return this.commanderMessage.channel.createMessage(createTitleOnlyEmbed(`Can't save because you already have ${maxSaves} games saved! Try finishing them sometime, or just load them then stop them to delete them. You can view and load saves by saying '${this.commanderMessage.prefix}quiz load'.`));
  }

  notifySaveFailedIsReview() {
    return this.commanderMessage.channel.createMessage(createTitleOnlyEmbed('You can\'t save a review quiz.'));
  }

  notifySaving() {
    return this.commanderMessage.channel.createMessage(createTitleOnlyEmbed('Saving at the next opportunity.'));
  }

  notifySaveFailedNotOwner() {
    return this.commanderMessage.channel.createMessage(
      createTitleOnlyEmbed('Only the person who started the quiz can save it. Maybe ask them nicely?'),
    );
  }

  closeAudioConnection() {
    const guild = this.commanderMessage.channel.guild;
    if (!guild) {
      return;
    }
    return audioConnectionManager.closeConnection(this.bot, guild.id);
  }

  notifyQuizEndedScoreLimitReached(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    canReview,
    scoreLimit,
  ) {
    const description = `The score limit of ${scoreLimit} was reached by <@${scores[0].userId}>. Congratulations!`;
    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      canReview,
      description,
    );
  }

  notifyQuizEndedUserCanceled(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    canReview,
    cancelingUserId,
  ) {
    const description = `<@${cancelingUserId}> asked me to stop the quiz.`;
    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      canReview,
      description,
    );
  }

  notifyQuizEndedTooManyWrongAnswers(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    canReview,
    wrongAnswers,
  ) {
    const description = `${wrongAnswers} questions in a row went unanswered. So I stopped!`;
    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      canReview,
      description,
    );
  }

  notifyQuizEndedError(quizName, scores, unansweredQuestions, aggregateLink, canReview) {
    const description = 'Sorry, I had an error and had to stop the quiz :( The error has been logged and will be addressed.';
    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      canReview,
      description,
    );
  }

  notifyQuizEndedNoQuestionsLeft(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    canReview,
    gameMode,
  ) {
    let description;
    if (gameMode.isMasteryMode || gameMode.isConquestMode) {
      description = 'You have asserted your total dominance over this deck. It kneels before you in awe of your might.';
    } else {
      description = 'No questions left in that deck. Impressive!';
    }

    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      canReview,
      description,
    );
  }

  notifyStoppingAllQuizzes(quizName, scores, unansweredQuestions, aggregateLink) {
    this.closeAudioConnection();

    const description = 'I have to reboot for an update. I\'ll be back in about one minute :)';
    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      false,
      description,
    );
  }

  notifyStopFailedUserNotAuthorized() {
    this.commanderMessage.channel.createMessage(createTitleOnlyEmbed('Only a server admin can stop someone else\'s quiz in Conquest or Inferno Mode.'));
  }
}

const mixtureReplacements = {
  easymix: 'n5+n4+defs1+anagrams4+10k+katakana',
  medmix: 'n3+defs7+9k+8k+7k+anagrams5+prefectures',
  hardmix: 'n2+n1+6k+5k+defs12+defs13+onomato+numbers+anagrams6',
  hardermix: '4k+3k+j2k+defs17+defs18+defs14+anagrams7+anagrams8+myouji+namae+ejtrans+hard+擬音語+kklc',
  insanemix: '2k+j1k+1k+anagrams9+anagrams10+yojijukugo+countries+animals',
};

function createMasteryHelp(isEnabledInServer, prefix) {
  let footerMessage = '';
  if (!isEnabledInServer) {
    footerMessage = `**Disabled!** ${createMasteryModeDisabledString(prefix)}`;
  }

  return {
    embed: {
      title: 'Conquest Mode',
      description: `In Conquest Mode your goal is to conquer one or more entire quiz decks. If you get a question right on the first try, you won't see it again. But if you get it wrong, you'll see it again until I think you've learned it. The game ends when I think you know every card in the deck (or if you miss too many questions in a row or use **${prefix}quiz stop**).

You can use **${prefix}quiz save** and **${prefix}quiz load** to save and load progress so you can learn over a period of days or weeks or months.

To start, say **${prefix}quiz${MASTERY_EXTENSION}** plus a deck name. For example: **${prefix}quiz${MASTERY_EXTENSION} N5**. Keep in mind that if you aren't in a DM, other people can answer the questions too, and then you won't see them again.

${footerMessage}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      footer: { icon_url: constants.FOOTER_ICON_URI, text: `You can also conquer multiple decks. For example: ${prefix}quiz${MASTERY_EXTENSION} N5+N4` },
    },
  };
}

function createConquestHelp(isEnabledInServer, prefix) {
  let footerMessage = '';
  if (!isEnabledInServer) {
    footerMessage = `**Disabled!** ${createConquestModeDisabledString(prefix)}`;
  }

  return {
    embed: {
      title: 'Inferno Mode',
      description: `In Inferno Mode, every time you miss a question, you have a little bit less time to answer the next one. And I might throw that question back into the deck, so try to remember it!

There is no score limit, so try to get as far as you can. You can use **${prefix}quiz save** and **${prefix}quiz load** to save and load progress.

Bring your friends! The top scorers will appear together as a team on the inferno leaderboard (when/if I make it ;)

To start, say **${prefix}quiz${CONQUEST_EXTENSION}** plus a deck name. For example: **${prefix}quiz${CONQUEST_EXTENSION} N5**.

You can override some quiz settings, however, doing so makes your final results ineligible for the leaderboard. If you want to play N5, lose half a second per wrong answer, and start with a time limit of 20 seconds, try this: **${prefix}quiz${CONQUEST_EXTENSION} N5 .5 20**.

${footerMessage}`,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

function getScoreScopeIdFromMsg(msg) {
  return msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
}

function throwIfInternetCardsNotAllowed(isDm, session, internetCardsAllowed, prefix) {
  if (!internetCardsAllowed && !isDm && session.containsInternetCards()) {
    const message = {
      embed: {
        title: 'Internet decks disabled',
        description: `That deck contains internet cards, but internet decks are disabled in this channel. You can try in a different channel, or in a DM, or ask a server admin to enable internet decks by saying **${prefix}settings quiz/japanese/internet_decks_enabled enabled**`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
    throw PublicError.createWithCustomPublicMessage(message, false, 'Internet decks disabled');
  }
}

function throwIfGameModeNotAllowed(isDm, gameMode, masteryEnabled, prefix) {
  if (!masteryEnabled && !isDm &&
      (gameMode.isMasteryMode ||
       gameMode.isConquestMode ||
       gameMode.serializationIdentifier === MasteryGameMode.serializationIdentifier ||
       gameMode.serializationIdentifier === ConquestGameMode.serializationIdentifier)) {
    const message = {
      embed: {
        title: 'Game mode disabled',
        description: `That game mode is not enabled in this channel. You can try it in a different channel, or via DM, or ask a server admin to enable the game mode by saying **${prefix}settings quiz/japanese/conquest_and_inferno_enabled enabled**`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
    throw PublicError.createWithCustomPublicMessage(message, false, 'Game mode disabled');
  }
}

function throwIfSessionInProgressAtLocation(locationId, prefix) {
  if (quizManager.isSessionInProgressAtLocation(locationId)) {
    const message = {
      embed: {
        title: 'Quiz In Progress',
        description: `Only one quiz can run in a channel at a time. Try another channel, or DM. You can stop the currently running quiz by saying **${prefix}quiz stop**`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
    throw PublicError.createWithCustomPublicMessage(message, false, 'Session in progress');
  }
}

async function load(
  bot,
  msg,
  userFacingSaveIdArg,
  messageSender,
  masteryModeEnabled,
  internetCardsAllowed,
  logger,
) {
  // TODO: Need to prevent loading decks with internet cards if internet decks aren't enabled.
  // Tech debt: The deck collection shouldn't be reloading itself.
  // There should be a save restorer class to assist in that.

  let userFacingSaveId = userFacingSaveIdArg;

  const isDm = !msg.channel.guild;
  const scoreScopeId = getScoreScopeIdFromMsg(msg);
  const prefix = msg.prefix;

  throwIfSessionInProgressAtLocation(msg.channel.id, prefix);

  const userId = msg.author.id;
  const [currentMementos, recyclingBinMementos] = await Promise.all([
    (await saveManager.getSaveMementos(userId)) || [],
    (await saveManager.getRestorable(userId)) || [],
  ]);

  if (currentMementos.length === 0 && recyclingBinMementos.length === 0) {
    return msg.channel.createMessage(createTitleOnlyEmbed(`I don't have any sessions I can load for you. Say ${prefix}quiz to start a new quiz.`), null, msg);
  }

  if (userFacingSaveId === undefined) {
    return sendSaveMementos(msg, currentMementos, recyclingBinMementos);
  }

  const databaseFacingSaveId =
    convertUserFacingSaveIdToDatabaseFacing(parseInt(userFacingSaveId, 10));

  let memento;
  if (databaseFacingSaveId < currentMementos.length) {
    memento = currentMementos[databaseFacingSaveId];
  } else if (databaseFacingSaveId - currentMementos.length < recyclingBinMementos.length) {
    memento = recyclingBinMementos[databaseFacingSaveId - currentMementos.length];
    await saveManager.restore(userId, memento);
  } else {
    return sendSaveMementos(msg, currentMementos, recyclingBinMementos, `I couldn't find save #${userFacingSaveId}. Here are the available saves.`);
  }

  throwIfGameModeNotAllowed(isDm, memento, masteryModeEnabled, prefix);

  const saveData = await saveManager.load(memento);
  const session = await Session.createFromSaveData(
    msg.channel.id,
    saveData,
    scoreScopeId,
    messageSender,
  );

  logger.logSuccess(LOGGER_TITLE, 'Loading save data');
  try {
    if (session.requiresAudioConnection()) {
      await audioConnectionManager.openConnectionFromMessage(bot, msg);
    }

    throwIfInternetCardsNotAllowed(isDm, session, internetCardsAllowed, prefix);
  } catch (err) {
    await saveManager.restore(msg.author.id, memento);
    throw err;
  }

  try {
    const endStatus = await quizManager.startSession(session, msg.channel.id);
    if (endStatus === quizManager.END_STATUS_ERROR) {
      throw new Error('The quiz manager successfully handled an error condition');
    }

    return undefined;
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error with loaded save', err);
    await saveManager.restore(msg.author.id, memento);
    return msg.channel.createMessage(`Looks like there was an error, sorry about that. I have attempted to restore your save data to its previous state, you can try to load it again with **${prefix}quiz load**. The error has been logged and will be addressed.`);
  }
}

async function deleteInternetDeck(msg, searchTerm, userId) {
  const deletionResult = await deckLoader.deleteInternetDeck(searchTerm, userId);
  if (deletionResult === deckLoader.DeletionStatus.DELETED) {
    return msg.channel.createMessage('That deck was successfully deleted.', null, msg);
  } else if (deletionResult === deckLoader.DeletionStatus.DECK_NOT_FOUND) {
    return msg.channel.createMessage(`I didn't find a deck called ${searchTerm}. Did you type it wrong or has it already been deleted?`, null, msg);
  } else if (deletionResult === deckLoader.DeletionStatus.USER_NOT_OWNER) {
    return msg.channel.createMessage('You can\'t delete that deck because you didn\'t create it.', null, msg);
  }

  assert(false, 'Should have returned');
  return undefined;
}

function createNonReviewGameMode(isMastery, isConquest) {
  if (isMastery) {
    return MasteryGameMode;
  } else if (isConquest) {
    return ConquestGameMode;
  } else {
    return NormalGameMode;
  }
}

function createSettings(settingsBlob, gameMode, settingsOverridesStrings) {
  const settingsOverrides = settingsOverridesStrings.map(str => parseFloat(str));

  const {
    userScoreLimitOverride,
    userTimeBetweenQuestionsOverrideInMs,
    userTimeoutOverrideInMs,
    gameModeSettings,
  } = gameMode.parseUserOverrides(settingsOverrides);

  let userNewQuestionDelayAfterUnansweredOverrideInMs;
  let userNewQuestionDelayAfterAnsweredOverrideInMs;
  let userAdditionalAnswerWaitTimeInMs;

  if (
    userTimeBetweenQuestionsOverrideInMs !== undefined &&
    !Number.isNaN(userTimeBetweenQuestionsOverrideInMs)
  ) {
    if (
      userTimeBetweenQuestionsOverrideInMs < NEW_QUESTION_DELAY_IN_MS_FOR_USER_OVERRIDE
    ) {
      userNewQuestionDelayAfterAnsweredOverrideInMs = 0;
      userAdditionalAnswerWaitTimeInMs = userTimeBetweenQuestionsOverrideInMs;
    } else if (
      userTimeBetweenQuestionsOverrideInMs <= NEW_QUESTION_DELAY_IN_MS_FOR_USER_OVERRIDE * 2
    ) {
      userAdditionalAnswerWaitTimeInMs =
        NEW_QUESTION_DELAY_IN_MS_FOR_USER_OVERRIDE;
      userNewQuestionDelayAfterAnsweredOverrideInMs =
        userTimeBetweenQuestionsOverrideInMs - userAdditionalAnswerWaitTimeInMs;
    } else {
      userAdditionalAnswerWaitTimeInMs =
        userTimeBetweenQuestionsOverrideInMs - NEW_QUESTION_DELAY_IN_MS_FOR_USER_OVERRIDE;
      userNewQuestionDelayAfterAnsweredOverrideInMs =
        userTimeBetweenQuestionsOverrideInMs - userAdditionalAnswerWaitTimeInMs;
    }
    userNewQuestionDelayAfterUnansweredOverrideInMs = userNewQuestionDelayAfterAnsweredOverrideInMs;
  }

  const serverNewQuestionDelayAfterUnansweredInMs = settingsBlob['quiz/japanese/new_question_delay_after_unanswered'] * 1000;
  const serverNewQuestionDelayAfterAnsweredInMs = settingsBlob['quiz/japanese/new_question_delay_after_answered'] * 1000;
  const serverAdditionalAnswerWaitTimeInMs = settingsBlob['quiz/japanese/additional_answer_wait_time'] * 1000;
  const serverScoreLimit = settingsBlob['quiz/japanese/score_limit'];
  const serverUnansweredQuestionLimit = settingsBlob['quiz/japanese/unanswered_question_limit'];
  const serverAnswerTimeLimitInMs = settingsBlob['quiz/japanese/answer_time_limit'] * 1000;
  const fontSize = settingsBlob['quiz_font_size'];
  const fontColor = settingsBlob['quiz_font_color'];
  const backgroundColor = settingsBlob['quiz_background_color'];
  const font = settingsBlob['quiz_font'];

  return {
    scoreLimit:
      gameMode.questionLimitOverride.doOverride(
        serverScoreLimit,
        userScoreLimitOverride,
      ),
    unansweredQuestionLimit:
      gameMode.unansweredQuestionLimitOverride.doOverride(serverUnansweredQuestionLimit),
    answerTimeLimitInMs:
      gameMode.answerTimeLimitOverride.doOverride(
        serverAnswerTimeLimitInMs,
        userTimeoutOverrideInMs,
      ),
    newQuestionDelayAfterUnansweredInMs:
      gameMode.newQuestionDelayAfterUnansweredOverride.doOverride(
        serverNewQuestionDelayAfterUnansweredInMs,
        userNewQuestionDelayAfterUnansweredOverrideInMs,
      ),
    newQuestionDelayAfterAnsweredInMs:
      gameMode.newQuestionDelayAfterAnsweredOverride.doOverride(
        serverNewQuestionDelayAfterAnsweredInMs,
        userNewQuestionDelayAfterAnsweredOverrideInMs,
      ),
    additionalAnswerWaitTimeInMs:
      gameMode.additionalAnswerWaitTimeOverride.doOverride(
        serverAdditionalAnswerWaitTimeInMs,
        userAdditionalAnswerWaitTimeInMs,
      ),
    gameModeSettings,
    fontSize,
    fontColor,
    backgroundColor,
    font,
  };
}

function getReviewDeckOrThrow(deck, prefix) {
  if (!deck) {
    const message = {
      embed: {
        title: 'Review deck not found',
        description: `I don\'t remember the session you want to review. Say **${prefix}quiz** to start a new session!`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
    throw PublicError.createWithCustomPublicMessage(message, false, 'Review deck not found');
  }
  return deck;
}

const rangeRegex = /\(([0-9]*) *- *([0-9]*)\)/;

function getDeckNameAndModifierInformation(deckNames) {
  return deckNames.map((deckName) => {
    let nameWithoutExtension = deckName;
    let startIndex;
    let endIndex;
    let mc = false;

    const match = deckName.match(rangeRegex);
    if (match) {
      startIndex = parseInt(match[1], 10);
      endIndex = parseInt(match[2], 10);
      nameWithoutExtension = deckName.replace(rangeRegex, '');
    }

    if (nameWithoutExtension.endsWith('-mc')) {
      mc = true;
      nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.length - 3);
    }

    return {
      deckNameOrUniqueId: nameWithoutExtension,
      startIndex,
      endIndex,
      mc,
    };
  });
}

async function startNewQuiz(
  bot,
  msg,
  suffix,
  messageSender,
  masteryEnabled,
  internetDecksEnabled,
  serverSettings,
  isMastery,
  isConquest,
  isHardcore,
  isNoRace,
) {
  let suffixReplaced = suffix;

  // TECH DEBT: Replacing these right into the suffix and
  // pretending the user entered them is a little janky.
  Object.keys(mixtureReplacements).forEach((replacementKey) => {
    suffixReplaced = suffixReplaced.replace(replacementKey, mixtureReplacements[replacementKey]);
  });

  const parts = suffixReplaced.split(' ');
  const deckNames = parts.shift().split('+').filter(deckName => !!deckName);
  const args = parts;
  const invokerId = msg.author.id;
  const locationId = msg.channel.id;
  const isDm = !msg.channel.guild;
  const scoreScopeId = getScoreScopeIdFromMsg(msg);
  const prefix = msg.prefix;

  let decks;
  let gameMode;
  if (suffixReplaced.startsWith('reviewme')) {
    gameMode = ReviewGameMode;
    decks = [getReviewDeckOrThrow(state.quizManager.reviewDeckForUserId[msg.author.id], prefix)];
  } else if (suffixReplaced.startsWith('review')) {
    gameMode = ReviewGameMode;
    decks = [getReviewDeckOrThrow(state.quizManager.reviewDeckForLocationId[locationId], prefix)];
  } else {
    gameMode = createNonReviewGameMode(isMastery, isConquest);

    const invokerName = msg.author.name + msg.author.discriminator;
    const decksLookupResult = await deckLoader.getQuizDecks(
      getDeckNameAndModifierInformation(deckNames),
      invokerId,
      invokerName,
    );

    if (decksLookupResult.status === deckLoader.DeckRequestStatus.DECK_NOT_FOUND) {
      return msg.channel.createMessage(`I don't have a deck named **${decksLookupResult.notFoundDeckName}**. Say **${prefix}quiz** to see the decks I have!`, null, msg);
    } else if (decksLookupResult.status === deckLoader.DeckRequestStatus.INDEX_OUT_OF_RANGE) {
      return msg.channel.createMessage(`Something is wrong with the range for ${decksLookupResult.deckName}. The maximum range for that deck is (${decksLookupResult.allowedStart}-${decksLookupResult.allowedEnd})`);
    } else if (decksLookupResult.status === deckLoader.DeckRequestStatus.ALL_DECKS_FOUND) {
      ({ decks } = decksLookupResult);
    } else {
      assert(`Unknown deck lookup status: ${decksLookupResult.status}`);
    }
  }

  // At this point we have the decks and are ready to start the quiz unless:
  // 1. The game mode is not allowed in this channel.
  // 2. The deck contains internet cards, but internet decks are not allowed in this channel.
  // 3. A quiz is already in progress in this channel.
  // 4. We need to establish a voice connection but cannot do so

  // 1. Check the game mode.
  throwIfGameModeNotAllowed(isDm, gameMode, masteryEnabled, prefix);

  // 3. Check if a game is in progress
  throwIfSessionInProgressAtLocation(locationId, prefix);

  // Create the deck collection.
  const deckCollection = DeckCollection.createNewFromDecks(decks, gameMode);

  // Create the session
  const settings = createSettings(serverSettings, gameMode, args);
  const session = Session.createNew(
    locationId,
    invokerId,
    deckCollection,
    messageSender,
    scoreScopeId,
    settings,
    gameMode,
    isHardcore,
    isNoRace,
  );

  // 4. Try to establish audio connection
  if (session.requiresAudioConnection()) {
    await audioConnectionManager.openConnectionFromMessage(bot, msg);
  }

  // 2. Check for internet cards
  throwIfInternetCardsNotAllowed(isDm, session, internetDecksEnabled, prefix);

  // All systems go. Liftoff!
  quizManager.startSession(session, locationId);

  return undefined;
}

function showHelp(msg, isMastery, isConquest, masteryEnabled) {
  const prefix = msg.prefix;

  let helpMessage;
  if (!isMastery && !isConquest) {
    helpMessage = createHelpContent(prefix);
  } else if (isMastery) {
    helpMessage = createMasteryHelp(masteryEnabled, prefix);
  } else if (isConquest) {
    helpMessage = createConquestHelp(masteryEnabled, prefix);
  } else {
    assert(false, 'Unknown extension');
  }

  return msg.channel.createMessage(helpMessage, null, msg);
}

const helpLongDescription = `
See available quiz decks, or start a quiz.

Below are some more advanced options. To see the rest, [Visit me on the web](https://kotobaweb.com/bot/quiz).

You can configure some quiz settings. If you want a JLPT N4 quiz with a score limit of 30, only 1 second between questions, and only 10 seconds to answer, try this:
**<prefix>quiz N4 30 1 10**

Most decks can be made multiple choice by adding **-mc** to the end of its name. Like this:
**<prefix>quiz N4-mc**

You can set the range of cards that you want to see. For example, if you only want to see cards selected from the first 100 cards in the N4 deck, you can do this:
**<prefix>quiz N4(1-100)**

Associated commands:
**<prefix>quiz stop** (ends the current quiz)
**<prefix>lb** (shows the quiz leaderboard)
**<prefix>quiz${MASTERY_EXTENSION}** (show information about conquest mode)
**<prefix>quiz${CONQUEST_EXTENSION}** (show information about inferno mode)

You can set default quiz settings by using the **<prefix>settings** command.
`;

function throwIfShutdownScheduled(channelId) {
  if (globals.shutdownScheduled) {
    state.scheduledShutdown.shutdownNotifyChannels.push(channelId);
    throw PublicError.createWithCustomPublicMessage({
        embed: {
          title: 'Scheduled Update',
          description: 'I\'m scheduled to reboot for an update in a few minutes so now\'s a bad time :) Please try again in about three minutes.',
          color: constants.EMBED_WARNING_COLOR,
          footer: {
            icon_url: constants.FOOTER_ICON_URI,
            text: 'I\'m getting an update! Yay!',
          },
        },
      },
      false,
      'Shutdown scheduled',
    );
  }
}

module.exports = {
  commandAliases: ['quiz', 'readingQuiz', 'starttest', 'startquiz', 'rt', 'rq', 'q'],
  aliasesForHelp: ['quiz', 'q'],
  canBeChannelRestricted: true,
  uniqueId: 'readingQuiz14934',
  cooldown: 1,
  shortDescription: 'See how to start a quiz in this channel.',
  longDescription: helpLongDescription,
  requiredBotPermissions: [Permissions.attachFiles, Permissions.embedLinks, Permissions.sendMessages],
  requiredSettings: quizManager.getDesiredSettings().concat([
    'quiz/japanese/conquest_and_inferno_enabled',
    'quiz/japanese/internet_decks_enabled',
  ]),
  attachIsServerAdmin: true,
  async action(bot, msg, suffix, monochrome, serverSettings) {
    let suffixReplaced = suffix.replace(/ *\+ */g, '+').replace(/ *-mc/g, '-mc').trim();
    suffixReplaced = suffixReplaced.toLowerCase();
    const messageSender = new DiscordMessageSender(bot, msg);
    const masteryEnabled = serverSettings['quiz/japanese/conquest_and_inferno_enabled'];
    const internetDecksEnabled = serverSettings['quiz/japanese/internet_decks_enabled'];

    const isMastery = msg.extension === MASTERY_EXTENSION
      || suffixReplaced.indexOf(MASTERY_NAME) !== -1;
    const isConquest = !isMastery
      && (msg.extension === CONQUEST_EXTENSION || suffixReplaced.indexOf(CONQUEST_NAME) !== -1);
    const isHardcore = suffixReplaced.indexOf('hardcore') !== -1;
    const isNoDelay = suffixReplaced.indexOf('nodelay') !== -1;
    const isNoRace = suffixReplaced.indexOf('norace') !== -1;

    suffixReplaced = suffixReplaced
      .replace(CONQUEST_NAME, '')
      .replace(MASTERY_NAME, '')
      .replace(/hardcore/g, '')
      .replace(/nodelay/g, '')
      .replace(/norace/g, '')
      .trim();

    // Hack: manipulate the returned server settings
    if (isNoDelay) {
      serverSettings['quiz/japanese/new_question_delay_after_unanswered'] = 0;
      serverSettings['quiz/japanese/new_question_delay_after_answered'] = 0;
      serverSettings['quiz/japanese/additional_answer_wait_time'] = 0;
    }

    // Delete operation
    if (suffixReplaced.startsWith('delete')) {
      const searchTerm = suffixReplaced.split(' ')[1];
      if (!searchTerm) {
        const message = 'Say **k!quiz delete deckname** to delete a custom quiz deck.';
        throw PublicError.createWithCustomPublicMessage(message, false, 'No deck name provided');
      }
      return deleteInternetDeck(msg, suffixReplaced.split(' ')[1], msg.author.id);
    }

    // Save operation
    if (suffixReplaced === 'save') {
      return quizManager.saveQuiz(msg.channel.id, msg.author.id);
    }

    // Stop operation
    if (suffixReplaced.startsWith('stop') || suffixReplaced.startsWith('end') || suffixReplaced.startsWith('endquiz') || suffixReplaced.startsWith('quit')) {
      return quizManager.stopQuiz(msg.channel.id, msg.author.id, msg.authorIsServerAdmin);
    }

    // Help operation
    if (!suffixReplaced || suffixReplaced === 'help') {
      return showHelp(msg, isMastery, isConquest, masteryEnabled);
    }

    const advancedHelp = getAdvancedHelp(suffix);
    if (advancedHelp) {
      return msg.channel.createMessage(advancedHelp);
    }

    throwIfShutdownScheduled(msg.channel.id);

    // Load operation
    if (suffixReplaced.startsWith('load')) {
      return load(bot, msg, suffixReplaced.split(' ')[1], messageSender, masteryEnabled, internetDecksEnabled, monochrome.getLogger());
    }

    // Start operation
    return startNewQuiz(
      bot,
      msg,
      suffixReplaced,
      messageSender,
      masteryEnabled,
      internetDecksEnabled,
      serverSettings,
      isMastery,
      isConquest,
      isHardcore,
      isNoRace,
    );
  },
  canHandleExtension(extension) {
    const extensionLowercase = extension.toLowerCase();
    return extensionLowercase === MASTERY_EXTENSION || extensionLowercase === CONQUEST_EXTENSION;
  },
};
