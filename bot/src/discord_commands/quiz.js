const assert = require('assert');
const state = require('./../common/static_state.js');
const Cache = require('kotoba-node-common').cache;
const globals = require('./../common/globals.js');
const sendStats = require('./../discord/quiz_stats.js');
const { Permissions, PaginatedMessage } = require('monochrome-bot');
const quizReportManager = require('./../common/quiz/session_report_manager.js');
const timingPresets = require('kotoba-common').quizTimeModifierPresets;
const quizLimits = require('kotoba-common').quizLimits;
const deckSearchUtils = require('./../common/quiz/deck_search.js');
const arrayUtil = require('../common/util/array.js');
const updateDbFromUser = require('../discord/db_helpers/update_from_user.js');

const quizManager = require('./../common/quiz/manager.js');
const createHelpContent = require('./../common/quiz/decks_content.js').createContent;
const { getCategoryHelp, defaultDeckOptionsForInteraction } = require('./../common/quiz/decks_content.js');
const constants = require('./../common/constants.js');
const { FulfillmentError } = require('monochrome-bot');
const NormalGameMode = require('./../common/quiz/normal_mode.js');
const MasteryGameMode = require('./../common/quiz/mastery_mode.js');
const ConquestGameMode = require('./../common/quiz/conquest_mode.js');
const ReviewGameMode = require('./../common/quiz/review_mode.js');
const saveManager = require('./../common/quiz/pause_manager.js');
const deckLoader = require('./../common/quiz/deck_loader.js');
const DeckCollection = require('./../common/quiz/deck_collection.js');
const Session = require('./../common/quiz/session.js');
const trimEmbed = require('./../common/util/trim_embed.js');
const AudioConnectionManager = require('./../discord/audio_connection_manager.js');
const { fontHelper } = require('./../common/globals.js');
const { throwPublicErrorFatal } = require('./../common/util/errors.js');
const escapeStringRegexp = require('escape-string-regexp');
const MAX_APPEARANCE_WEIGHT = require('kotoba-common').quizLimits.appearanceWeight[1];

const timingPresetsArr = Object.values(timingPresets);

const MAXIMUM_UNANSWERED_QUESTIONS_DISPLAYED = 20;
const MAX_ALIASES = 20;
const MAX_INTERMEDIATE_CORRECT_ANSWERS_FIELD_LENGTH = 275;
const MASTERY_NAME = 'conquest';
const CONQUEST_NAME = 'inferno';
const MASTERY_EXTENSION = `-${MASTERY_NAME}`;
const CONQUEST_EXTENSION = `-${CONQUEST_NAME}`;
const INTERMEDIATE_ANSWER_TRUNCATION_REPLACEMENT = ' [...]';

const noDecksFoundPublicMessage = {
  embeds: [{
    title: 'No matches found',
    description: 'No results were found for that search term.',
    color: constants.EMBED_NEUTRAL_COLOR,
  }],
};

function createMasteryModeDisabledString(prefix) {
  return `Conquest Mode is not enabled in this channel. Please do it in a different channel, or in DM, or ask a server admin to enable it by saying **${prefix}settings quiz/japanese/conquest_and_inferno_enabled enabled**`;
}

function createConquestModeDisabledString(prefix) {
  return `Inferno Mode is not enabled in this channel. Please do it in a different channel, or in DM, or ask a server admin to enable it by saying **${prefix}settings quiz/japanese/conquest_and_inferno_enabled enabled**`;
}

function createTitleOnlyEmbedWithColor(title, color) {
  return {
    embeds: [{
      title,
      color,
    }],
  };
}

function createTitleOnlyEmbed(title) {
  return createTitleOnlyEmbedWithColor(title, constants.EMBED_NEUTRAL_COLOR);
}

function createSaveFailedEmbed(description) {
  return {
    embeds: [{
      title: 'Save failed',
      description,
      color: constants.EMBED_WARNING_COLOR,
    }],
  };
}

function markdownLink(text, url) {
  if (!url) {
    return text;
  }

  return `[${text}](${url})`;
}

function getFinalAnswerLineForQuestionAndAnswerLinkAnswer(card) {
  return `${card.question.replace(/\n/g, ' ')} (${markdownLink(card.answer.join(', '), card.dictionaryLink)})`;
}

function getFinalAnswerLineForQuestionAndAnswerBoldAnswer(card) {
  return `-- ${card.question.replace(/\n/g, ' ')} (**${card.answer.join(', ')}**)`;
}

function getFinalAnswerLineForQuestionAndAnswerLinkQuestion(card) {
  return `${markdownLink(card.question.replace(/\n/g, ' '), card.dictionaryLink)} (${card.answer.join(', ')})`;
}

function getFinalAnswerLineForAnswerOnly(card) {
  return markdownLink(card.answer.join(', '), card.dictionaryLink);
}

function getFinalAnswerLineForQuestionOnly(card) {
  return markdownLink(card.question.replace(/\n/g, ' '), card.dictionaryLink);
}

function getFinalAnswerLineForJpTestAudio(card) {
  const uri = `http://japanesetest4you.com/mp3/${card.question}`
  return `${markdownLink(card.question, uri)} (${card.answer.join(', ')})`;
}

function getFinalAnswerLineForForvoAudioLink(card) {
  const answer = card.answer[0];
  const uri = `https://forvo.com/word/${encodeURIComponent(answer)}/#ja`;
  return markdownLink(answer, uri);
}

function getFinalAnswerLineForHentaiganaComment(card) {
  return `${card.meaning} (${card.answer.join(', ')})`;
}

const FinalAnswerListElementStrategy = {
  QUESTION_AND_ANSWER_LINK_QUESTION: getFinalAnswerLineForQuestionAndAnswerLinkQuestion,
  QUESTION_AND_ANSWER_LINK_ANSWER: getFinalAnswerLineForQuestionAndAnswerLinkAnswer,
  QUESTION_AND_ANSWER_BOLD_ANSWER: getFinalAnswerLineForQuestionAndAnswerBoldAnswer,
  ANSWER_ONLY: getFinalAnswerLineForAnswerOnly,
  QUESTION_ONLY: getFinalAnswerLineForQuestionOnly,
  JPTEST_FOR_YOU_AUDIO_LINK: getFinalAnswerLineForJpTestAudio,
  FORVO_AUDIO_LINK: getFinalAnswerLineForForvoAudioLink,
  HENTAIGANA_COMMENT: getFinalAnswerLineForHentaiganaComment,
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

    if (unansweredQuestions.some(card => card.discordFinalAnswerListElementStrategy === 'HENTAIGANA_COMMENT')) {
      unansweredQuestionsLines.unshift('(Discord fonts can\'t display the actual hentaigana character)');
    }

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
    fields.push({ name: 'Game Report', value: `[View a report for this game](${reportUri}) (and add missed questions to your custom decks)` });
  }

  const response = {
    embeds: [{
      title: `${quizName} Ended`,
      url: aggregateLink,
      description,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields,
      footer: { icon_url: constants.FOOTER_ICON_URI, text: `Say ${prefix}lb to see the server leaderboard.` },
    }],
  };

  return trimEmbed(response);
}

const afterQuizMessages = [
  {
    embeds: [{
      title: 'Reviewing',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'Say **<prefix>quiz review** to review the questions no one answered, or **<prefix>quiz reviewme** to review the questions you didn\'t answer (only if you did answer at least one). You can say **<prefix>quiz reviewme** somewhere else (like in a DM) if you prefer.',
    }],
  },
  {
    embeds: [{
      title: 'O, so you want Anki in Discord?',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: `Try **Conquest Mode**. Say **<prefix>quiz ${MASTERY_NAME}** to learn more.`,
    }],
  },
  {
    embeds: [{
      title: 'Fonts',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'You can change fonts, colors, and sizes by using the **<prefix>settings** command and going into the **Fonts** submenu.',
    }],
  },
  {
    embeds: [{
      title: 'Stats',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'Say **<prefix>quiz stats** to see your stats for the past 30 days.',
    }],
  },
  {
    embeds: [{
      title: 'Quiz Command Builder',
      color: constants.EMBED_NEUTRAL_COLOR,
      description: 'For help configuring a quiz exactly how you want, try my [quiz command builder](https://kotobaweb.com/bot/quizbuilder) or check my [manual](https://kotobaweb.com/bot/quiz).',
    }],
  },
];

function createAfterQuizMessage(prefix) {
  const index = Math.floor(Math.random() * afterQuizMessages.length);

  const afterQuizMessage = { ...afterQuizMessages[index] };
  afterQuizMessage.embeds = afterQuizMessage.embeds.map(embed => ({ ...embed }));
  afterQuizMessage.embeds[0].description = afterQuizMessage.embeds[0].description.replace(/<prefix>/g, prefix);
  return afterQuizMessage;
}

async function sendEndQuizMessages(
  commanderMessage,
  quizName,
  scores,
  unansweredQuestions,
  aggregateLink,
  deckInfo,
  description,
  monochrome,
) {
  const prefix = commanderMessage.prefix;
  const endQuizMessage = createEndQuizMessage(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    description,
    prefix,
    await quizReportManager.getReportUriForLocation(commanderMessage.channel),
  );

  await commanderMessage.channel.createMessage(endQuizMessage);
  const customDeck = (arrayUtil.shuffle(deckInfo || [])).find(d => d.internetDeck && d.uniqueId !== 'REVIEW');

  if (customDeck && monochrome) {
    try {
      userCanVote = await deckSearchUtils.discordUserCanVote(commanderMessage.author.id, customDeck.uniqueId);

      if (userCanVote) {
        const embeds = [{
          title: 'Voting',
          description: `Didjuu like **${customDeck.shortName}**? React with 👍 to vote for it, or react with ❌ and I won't ask you again for this deck.`,
          color: constants.EMBED_NEUTRAL_COLOR,
        }];

        const sentMessage = await commanderMessage.channel.createMessage({ embeds });

        return await monochrome.reactionButtonManager.registerHandler(
          sentMessage,
          [],
          {
            '👍': async function(_, _, userId) {
              try {
                const user = monochrome.getErisBot().users.get(userId);
                await updateDbFromUser(user);
                await deckSearchUtils.voteForDiscordUser(userId, customDeck.uniqueId, true);
              } catch (err) {
                monochrome.getLogger().warn({
                  event: 'FAILED VOTE',
                  err,
                });
              }
            },
            '❌': async function(_, _, userId) {
              try {
                const user = monochrome.getErisBot().users.get(userId);
                await updateDbFromUser(user);
                await deckSearchUtils.voteForDiscordUser(userId, customDeck.uniqueId, false);
              } catch (err) {
                monochrome.getLogger().warn({
                  event: 'FAILED TO VOTE',
                  err,
                });
              }
            },
          },
          { removeButtonsOnExpire: true, expirationTimeInMs: 180000 },
        );
      }
    } catch (err) {
      if (err.code === 50013) {
        return undefined;
      }

      monochrome.getLogger().warn({
        event: 'ERROR OFFERING CUSTOM DECK VOTE',
        err,
      });
    }
  }

  const afterQuizMessage = createAfterQuizMessage(prefix);
  if (afterQuizMessage) {
    return commanderMessage.channel.createMessage(afterQuizMessage);
  }

  return undefined;
}

function convertDatabaseFacingSaveIdToUserFacing(saveId) {
  return saveId + 1;
}

function convertUserFacingSaveIdToDatabaseFacing(saveId) {
  if (saveId === 0) {
    return 0;
  }

  return saveId - 1;
}

function getTimeString(timestamp) {
  const date = new Date(timestamp);
  const minutes = date.getMinutes();
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${minutes < 10 ? '0' + minutes : minutes}`;
}

function sendSaveMementos(msg, currentSaveMementos, recyclingBinMementos, extraContent) {
  const prefix = msg.prefix;
  const embeds = [{
    title: 'Loading',
    description: `You can load a save by using this command again with the number of the save you want (listed below). For example **${prefix}quiz load 1**.`,
    color: constants.EMBED_NEUTRAL_COLOR,
    fields: [],
  }];

  if (currentSaveMementos.length > 0) {
    embeds[0].fields.push({
      name: 'Current saves',
      value: currentSaveMementos.map((memento, index) => {
        return `${convertDatabaseFacingSaveIdToUserFacing(index)}: ${memento.quizType} (${getTimeString(memento.time)})`;
      }).join('\n'),
    });
  }

  if (recyclingBinMementos.length > 0) {
    embeds[0].fields.push({
      name: 'Recycling bin',
      value: '(You can recover old saves from here if you need to. Don\'t wait too long.)\n\n' + recyclingBinMementos.map((memento, index) => {
        return `${convertDatabaseFacingSaveIdToUserFacing(index + currentSaveMementos.length)}: ${memento.quizType} (${getTimeString(memento.time)})`;
      }).join('\n'),
    });
  }

  return msg.channel.createMessage({ content: extraContent, embeds }, null, msg);
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
  constructor(bot, commanderMessage, monochrome) {
    this.commanderMessage = commanderMessage;
    this.bot = bot;
    this.monochrome = monochrome;
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
      { name: 'Started by', value: this.commanderMessage.author.mention, inline: true },
    ];

    if (scoreLimit !== Number.MAX_SAFE_INTEGER) {
      fields.push({ name: 'Score limit', value: scoreLimit, inline: true });
    }

    return this.commanderMessage.channel.createMessage({
      embeds: [{
        title: embedTitle,
        description: embedDescription,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields,
        footer: this.commanderMessage.isInteraction ? {
          icon_url: constants.FOOTER_ICON_URI,
          text: `There's a lot more I can do without slash commands. Say ${this.commanderMessage.prefix}help quiz for more info.`,
        } : undefined,
      }],
    });
  }

  stopAudio() {
    if (!this.audioConnection) {
      return;
    }

    return this.audioConnection.stopPlaying();
  }

  async showWrongAnswer(card, skipped, hardcore) {
    await this.stopAudio();
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
      embeds: [{
        title: card.deckName,
        url: card.dictionaryLink,
        description: skipped ? 'Question skipped!' : (hardcore ? 'No one got it right' : 'Time\'s up!'),
        color: constants.EMBED_WRONG_COLOR,
        fields,
        footer: { icon_url: constants.FOOTER_ICON_URI, text: 'You can skip questions by saying \'skip\' or just \'s\' or \'。\'.' },
      }],
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
    await this.stopAudio();
    const scorersListText = answerersInOrder.map(answerer => `<@${answerer}> (${scoreForUser[answerer].totalScore} points)`).join('\n');

    answerersInOrder.forEach((userId) => {
      this.monochrome.updateUserFromREST(userId).catch(() => {});
    });

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
      embeds: [{
        title: card.deckName,
        url: card.dictionaryLink,
        description: `<@${answerersInOrder[0]}> got it first!`,
        color: constants.EMBED_CORRECT_COLOR,
        fields,
      }],
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

    const bodyLines = [`**${title}**`];

    if (question.options) {
      bodyLines.push('Type the number of the correct answer!');
    } else if (question.instructions) {
      bodyLines.push(question.instructions);
    }

    let content = {
      embeds: [{
        description: `**${title}**\n${question.instructions || ''}`,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [],
      }],
    };

    let uploadInformation;
    if (question.bodyAsPngBuffer) {
      content.embeds[0].image = { url: 'attachment://upload.png' };
      uploadInformation = { file: question.bodyAsPngBuffer, name: 'upload.png' };
    }
    if (question.hintString) {
      content.embeds[0].footer = { text: question.hintString };
    }
    if (question.options) {
      const fieldValue = question.options.map((option, index) => {
        const optionCharacter = `${index + 1}`;
        return `**${optionCharacter}:** ${option}`;
      }).join('\n');
      content.embeds[0].fields.push({ name: 'Possible Answers', value: fieldValue });
    }
    if (question.bodyAsText) {
      bodyLines.push('');
      bodyLines.push(question.bodyAsText);
    }
    if (question.bodyAsImageUri) {
      content.embeds[0].image = { url: question.bodyAsImageUri };
    }
    if (question.bodyAsAudioUri) {
      const voiceChannel = await this.audioConnection.getVoiceChannel();
      content.embeds[0].fields.push({name: 'Now playing in', value: `<#${voiceChannel.id}>`});
      await this.audioConnection.play(question.bodyAsAudioUri);
    }

    content.embeds[0].description = bodyLines.join('\n');
    content = trimEmbed(content);
    if (!questionId) {
      const msg = await this.commanderMessage.channel.createMessage(content, uploadInformation);
      return msg.id;
    }

    return this.bot.editMessage(this.commanderMessage.channel.id, questionId, content, uploadInformation);
  }

  async notifySaveSuccessful() {
    this.closeAudioConnection();

    const reportUri = await quizReportManager.getReportUriForLocation(this.commanderMessage.channel);

    const fields = [];
    if (reportUri) {
      fields.push({
        name: 'Game Report',
        value: `[View a report for this game](${reportUri}) (and add missed questions to your custom decks)`,
      });
    }

    const embeds = [{
      title: 'Saved',
      description: `The quiz has been saved and paused! Say **${this.commanderMessage.prefix}quiz load** later to start it again.`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields,
    }];

    return this.commanderMessage.channel.createMessage({ embeds });
  }

  notifySaveFailedNoSpace(maxSaves) {
    return this.commanderMessage.channel.createMessage(createSaveFailedEmbed(`Can't save because you already have ${maxSaves} games saved! Try finishing them sometime, or just load them then stop them to delete them. You can view and load saves by saying '${this.commanderMessage.prefix}quiz load'.`));
  }

  notifySaveFailedIsReview() {
    return this.commanderMessage.channel.createMessage(createSaveFailedEmbed('You can\'t save a review quiz.'));
  }

  notifySaving() {
    return this.commanderMessage.channel.createMessage(createTitleOnlyEmbed('Saving at the next opportunity.'));
  }

  notifySaveFailedNotOwner() {
    return this.commanderMessage.channel.createMessage(createSaveFailedEmbed('Only the person who started the quiz can save it. Maybe ask them nicely?'));
  }

  notifySaveFailedTooManyQuestions(maxQuestions) {
    return this.commanderMessage.channel.createMessage(createSaveFailedEmbed(`Can't save because there are too many questions left! You can only save up to ${maxQuestions} questions. If you want to save with a large deck, you can use the [range command](https://kotobaweb.com/bot/quiz#Question%20Range) to take a smaller slice of the deck. For example **k!quiz n1(1-1000)** to only use the first 1000 questions.`));
  }

  closeAudioConnection() {
    if (!this.audioConnection) {
      return;
    }

    return this.audioConnection.close();
  }

  notifyQuizEndedScoreLimitReached(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    deckInfo,
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
      deckInfo,
      description,
      this.monochrome,
    );
  }

  notifyQuizEndedUserCanceled(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    deckInfo,
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
      undefined,
      description,
      this.monochrome,
    );
  }

  notifyQuizEndedTooManyWrongAnswers(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    deckInfo,
    info,
  ) {
    let description;
    if (info.missedQuestionsInARow) {
      description = `${info.missedQuestionsInARow} questions in a row went unanswered. So I stopped!`;
    } else {
      description = `${info.missedQuestionsTotal} questions total weren't answered. So I stopped!`;
    }

    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      deckInfo,
      description,
      this.monochrome,
    );
  }

  notifyQuizEndedError(quizName, scores, unansweredQuestions, aggregateLink, deckInfo) {
    const description = 'Sorry, I had an error and had to stop the quiz :( The error has been logged and will be addressed.';
    this.closeAudioConnection();

    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      undefined,
      description,
      this.monochrome,
    );
  }

  notifyQuizEndedNoQuestionsLeft(
    quizName,
    scores,
    unansweredQuestions,
    aggregateLink,
    deckInfo,
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
      deckInfo,
      description,
      this.monochrome,
    );
  }

  notifyStoppingAllQuizzes(quizName, scores, unansweredQuestions, aggregateLink) {
    this.closeAudioConnection();

    const description = 'I have to reboot for an update. I\'ll be back in about five minutes :)';
    return sendEndQuizMessages(
      this.commanderMessage,
      quizName,
      scores,
      unansweredQuestions,
      aggregateLink,
      false,
      description,
      this.monochrome,
    );
  }

  notifyStopFailedUserNotAuthorized() {
    this.commanderMessage.channel.createMessage(createTitleOnlyEmbed('Only a server admin can stop someone else\'s quiz in Conquest or Inferno Mode.'));
  }
}

const deckMixPresets = {
  easymix: ['n5', 'n4', 'anagrams4', '10k', 'katakana', 'kanawords'],
  medmix: ['n3', '9k', '8k', '7k', 'anagrams5', 'prefectures'],
  hardmix: ['n2', 'n1', '6k', '5k', 'onomato', 'numbers', 'anagrams6', 'kklc', 'pasokon'],
  hardermix: ['4k', '3k', 'j2k', 'anagrams7', 'anagrams8', 'myouji', 'namae', 'ejtrans', 'hard', '擬音語', 'igaku', 'cities'],
  insanemix: ['2k', 'j1k', '1k', 'anagrams9', 'anagrams10', 'yojijukugo', 'countries', 'animals'],
  easymixjp: ['n5', 'n4', '10k', 'katakana', 'kanawords'],
  medmixjp: ['n3', '9k', '8k', '7k', 'prefectures'],
  hardmixjp: ['n2', 'n1', '6k', '5k', 'onomato', 'numbers', 'k33', 'kklc', 'pasokon'],
  hardermixjp: ['4k', '3k', 'j2k', 'myouji', 'namae', 'ejtrans', 'hard', '擬音語', 'igaku', 'cities'],
  insanemixjp: ['2k', 'j1k', '1k', 'yojijukugo', 'countries', 'animals'],
};

function createMasteryHelp(isEnabledInServer, prefix) {
  let footerMessage = '';
  if (!isEnabledInServer) {
    footerMessage = `**Disabled!** ${createMasteryModeDisabledString(prefix)}`;
  }

  return {
    embeds: [{
      title: 'Conquest Mode',
      description: `In Conquest Mode your goal is to conquer one or more entire quiz decks. If you get a question right on the first try, you won't see it again. But if you get it wrong, you'll see it again until I think you've learned it. The game ends when I think you know every card in the deck (or if you miss too many questions in a row or use **${prefix}quiz stop**).

You can use **${prefix}quiz save** and **${prefix}quiz load** to save and load progress so you can learn over a period of days or weeks or months.

To start, say **${prefix}quiz ${MASTERY_NAME}** with a deck name. For example: **${prefix}quiz N5 ${MASTERY_NAME}**. Keep in mind that if you aren't in a DM, other people can answer the questions too, and then you won't see them again.

${footerMessage}`,
      color: constants.EMBED_NEUTRAL_COLOR,
      footer: { icon_url: constants.FOOTER_ICON_URI, text: `You can also conquer multiple decks. For example: ${prefix}quiz N5+N4 ${MASTERY_NAME}` },
    }],
  };
}

function createConquestHelp(isEnabledInServer, prefix) {
  let footerMessage = '';
  if (!isEnabledInServer) {
    footerMessage = `**Disabled!** ${createConquestModeDisabledString(prefix)}`;
  }

  return {
    embeds: [{
      title: 'Inferno Mode',
      description: `In Inferno Mode, every time you miss a question, you have a little bit less time to answer the next one. And I might throw that question back into the deck, so try to remember it!

There is no score limit, so try to get as far as you can. You can use **${prefix}quiz save** and **${prefix}quiz load** to save and load progress.

Bring your friends! The top scorers will appear together as a team on the inferno leaderboard (when/if I make it ;)

To start, say **${prefix}quiz${CONQUEST_EXTENSION}** plus a deck name. For example: **${prefix}quiz${CONQUEST_EXTENSION} N5**.

${footerMessage}`,
      color: constants.EMBED_NEUTRAL_COLOR,
    }],
  };
}

function getScoreScopeIdFromMsg(msg) {
  return msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
}

function throwIfInternetCardsNotAllowed(isDm, session, internetCardsAllowed, prefix) {
  if (!internetCardsAllowed && !isDm && session.containsInternetCards()) {
    const message = {
      embeds: [{
        title: 'Internet decks disabled',
        description: `That deck contains internet cards, but internet decks are disabled in this channel. You can try in a different channel, or in a DM, or ask a server admin to enable internet decks by saying **${prefix}settings quiz/japanese/internet_decks_enabled enabled**`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage: message,
      logDescription: 'Internet decks disabled',
    });
  }
}

function throwIfGameModeNotAllowed(isDm, gameMode, masteryEnabled, prefix) {
  if (!masteryEnabled && !isDm &&
      (gameMode.isMasteryMode ||
       gameMode.isConquestMode ||
       gameMode.serializationIdentifier === MasteryGameMode.serializationIdentifier ||
       gameMode.serializationIdentifier === ConquestGameMode.serializationIdentifier)) {
    const message = {
      embeds: [{
        title: 'Game mode disabled',
        description: `That game mode is not enabled in this channel. You can try it in a different channel, or via DM, or ask a server admin to enable the game mode by saying **${prefix}settings quiz/japanese/conquest_and_inferno_enabled enabled**`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage: message,
      logDescription: 'Game mode disable',
    });
  }
}

function throwIfSessionInProgressAtLocation(locationId, prefix) {
  if (quizManager.isSessionInProgressAtLocation(locationId)) {
    const message = {
      embeds: [{
        title: 'Quiz In Progress',
        description: `Only one quiz can run in a channel at a time. Try another channel, or DM. You can stop the currently running quiz by saying **${prefix}quiz stop**`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage: message,
      logDescription: 'Session in progress here',
    });
  }
}

function throwSavedDeckNotFound() {
  const message = {
    embeds: [{
      title: 'Deck Not Found',
      description: `Sorry, one or more decks in that save could not be found. They were probably deleted by their owner. The save could not be loaded and has been deleted.`,
      color: constants.EMBED_NEUTRAL_COLOR,
    }],
  };

  throw new FulfillmentError({
    publicMessage: message,
    logDescription: 'Saved deck could not be loaded',
  });
}

function throwIfDeckNotAllowedInServer(session) {
  const unallowedDeck = session.getRestrictedDeckNameForThisScoreScope();

  if (unallowedDeck) {
    const message = {
      embeds: [{
        title: 'Deck not allowed here',
        description: `The deck **${unallowedDeck.shortName}** cannot be used in this server or channel because its owner chose to restrict access.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage: message,
      logDescription: 'Deck not allowed here',
    });
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
  settings,
  rawStartCommand,
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

  let session;

  try {
    session = await Session.createFromSaveData(
      rawStartCommand,
      msg.channel.id,
      saveData,
      scoreScopeId,
      messageSender,
      settings,
    );
  } catch (err) {
    if (err.code === 'DECK_NOT_FOUND') {
      throwSavedDeckNotFound();
    }

    throw err;
  }

  try {
    if (session.requiresAudioConnection()) {
      messageSender.audioConnection = await AudioConnectionManager.create(bot, msg)
    }

    throwIfDeckNotAllowedInServer(session);
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
    logger.error({
      event: 'ERROR IN SAVED SESSION',
      err,
    });
    await saveManager.restore(msg.author.id, memento);
    return msg.channel.createMessage(`Looks like there was an error, sorry about that. I have attempted to restore your save data to its previous state, you can try to load it again with **${prefix}quiz load**. The error has been logged and will be addressed.`);
  }
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

function createSettingsForLoad(serverSettings, inlineSettings) {
  const resolvedSettings = { ...serverSettings, ...inlineSettings };

  const settings = {
    answerTimeLimitInMs: inlineSettings.answerTimeLimit * 1000,
    newQuestionDelayAfterUnansweredInMs: inlineSettings.delayAfterUnansweredQuestion * 1000,
    newQuestionDelayAfterAnsweredInMs: inlineSettings.delayAfterAnsweredQuestion * 1000,
    additionalAnswerWaitTimeInMs: inlineSettings.additionalAnswerWaitWindow * 1000,
    maxMissedQuestions: inlineSettings.maxMissedQuestions,
    effect: inlineSettings.effect,
    fontSize: resolvedSettings.size,
    fontColor: resolvedSettings.color,
    backgroundColor: resolvedSettings.bgColor,
    font: resolvedSettings.fontFamily,
    serverSettings,
    inlineSettings,
  };

  Object.entries(settings).forEach(([key, value]) => {
    if (value === undefined || Number.isNaN(value)) {
      delete settings[key];
    }
  });

  return settings;
}

function createSettings(serverSettings, inlineSettings, gameMode) {
  const resolvedSettings = { ...serverSettings, ...inlineSettings };

  const settings = {
    isConquest: gameMode.isMasteryMode ?? false,
    scoreLimit: gameMode.questionLimitOverride || resolvedSettings.scoreLimit,
    unansweredQuestionLimit: gameMode.unansweredQuestionLimitOverride || resolvedSettings.unansweredQuestionLimit,
    answerTimeLimitInMs: resolvedSettings.answerTimeLimit * 1000,
    newQuestionDelayAfterUnansweredInMs: resolvedSettings.delayAfterUnansweredQuestion * 1000,
    newQuestionDelayAfterAnsweredInMs: resolvedSettings.delayAfterAnsweredQuestion * 1000,
    additionalAnswerWaitTimeInMs: resolvedSettings.additionalAnswerWaitWindow * 1000,
    effect: resolvedSettings.effect,
    fontSize: resolvedSettings.size,
    fontColor: resolvedSettings.color,
    backgroundColor: resolvedSettings.bgColor,
    font: resolvedSettings.fontFamily,
    maxMissedQuestions: resolvedSettings.maxMissedQuestions,
    shuffle: resolvedSettings.shuffle,
    serverSettings,
    inlineSettings,
  };

  return settings;
}

function getReviewDeckOrThrow(deck, prefix) {
  if (!deck) {
    const message = {
      embeds: [{
        title: 'Review deck not found',
        description: `I don\'t remember the session you want to review. Say **${prefix}quiz** to start a new session!`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage: message,
      logDescription: 'Review deck not found',
    });
  }

  return deck;
}

function parseRangeLimit(rangeLimitStr) {
  if (rangeLimitStr === 'end') {
    return Number.MAX_SAFE_INTEGER;
  }

  return parseInt(rangeLimitStr, 10);
}

function getDeckNameAndModifierInformation(deckNames) {
  const names = {};
  const decks = deckNames.map((deckName) => {
    let nameWithoutExtension = deckName;
    let startIndex;
    let endIndex;
    let mc = false;
    let appearanceWeight = undefined;

    const deckArguments = deckName.match(/\(([^)]*)\)/);
    if (deckArguments) {
      const arguments = deckArguments[1].split('/');
      arguments.forEach((argument) => {
        if (argument === 'mc') {
          mc = true;
        } else if (/^[0-9.]+%$/.test(argument)) {
          appearanceWeight = Number(argument.replace('%', ''));
          if (Number.isNaN(appearanceWeight) || appearanceWeight <= 0 || appearanceWeight > MAX_APPEARANCE_WEIGHT) {
            throw new FulfillmentError({
              publicMessage: `Invalid appearance weight: ${argument}`,
              logDescription: `Invalid appearance weight`,
            });
          }
        } else if (/(?:[0-9]*|end)-(?:[0-9]*|end)/.test(argument)) {
          const [start, end] = argument.split('-');
          startIndex = parseRangeLimit(start);
          endIndex = parseRangeLimit(end);
        } else {
          throw new FulfillmentError({
            publicMessage: `I didn't understand the deck argument **${argument}** in ${deckName}.`,
            logDescription: 'Invalid deck argument',
          });
        }
      });

      nameWithoutExtension = deckName.replace(deckArguments[0], '');
    }

    if (nameWithoutExtension.endsWith('-mc')) {
      mc = true;
      nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.length - 3);
    }

    return {
      deckNameOrUniqueId: nameWithoutExtension,
      startIndex,
      endIndex,
      appearanceWeight,
      mc,
    };
  }).filter(Boolean);

  const sumAppearanceWeight = decks.reduce((acc, deck) => acc + (deck.appearanceWeight ?? 0), 0);
  const allHaveAppearanceWeight = decks.every(deck => deck.appearanceWeight !== undefined);

  if (sumAppearanceWeight > MAX_APPEARANCE_WEIGHT) {
    throw new FulfillmentError({
      publicMessage: `The combined appearance weight of all decks cannot exceed ${MAX_APPEARANCE_WEIGHT}%.`,
      logDescription: `The combined appearance weight of all decks cannot exceed ${MAX_APPEARANCE_WEIGHT}%.`,
    });
  }

  if (allHaveAppearanceWeight && sumAppearanceWeight !== MAX_APPEARANCE_WEIGHT) {
    throw new FulfillmentError({
      publicMessage: `If an appearance weight is specified for every deck, they must add up to ${MAX_APPEARANCE_WEIGHT}%.`,
      logDescription: 'The combined appearance weight of all decks must equal the max appearance weight.',
    });
  }

  const remainingToDistribute = MAX_APPEARANCE_WEIGHT - sumAppearanceWeight;
  const decksWithoutAppearanceWeight = decks.filter(d => d.appearanceWeight === undefined);
  const appearanceWeightPerUnspecifiedDeck = remainingToDistribute / decksWithoutAppearanceWeight.length;
  decksWithoutAppearanceWeight.forEach((deck) => {
    deck.appearanceWeight = appearanceWeightPerUnspecifiedDeck;
  });

  return decks;
}

function showSettingsHelp(msg) {
  return msg.channel.createMessage({
    embeds: [{
      title: 'Settings',
      description: `You can use the **${msg.prefix}settings** command to configure settings.`,
      color: constants.EMBED_NEUTRAL_COLOR,
    }],
  });
}

const helpLongDescription = `
This is advanced help. To see basic help and available quiz decks, say **<prefix>quiz**.

There is more than can fit in this message. To see more details, [check out my web manual](https://kotobaweb.com/bot/quiz) and [quiz command builder](https://kotobaweb.com/bot/quizbuilder).

- **Score limit**: To set the score limit, specify a number after the deck selection. For example: **<prefix>quiz N4 30**.
- **Answer time limit**: Use the **atl=** parameter to specify an answer time limit. For example: **<prefix>quiz N4 atl=20**.
- **Delay after unanswered question**: Use the **dauq=** parameter to set this. For example: **<prefix>quiz N4 dauq=10**.
- **Delay after answered question**: Use the **daaq=** parameter to set this. For example: **<prefix>quiz N4 daaq=5**.
- **Additional answer wait window**: Use the **aaww=** parameter to set this. For example: **<prefix>quiz N4 aaww=5**.
- **Max missed questions**: Use the **mmq=** parameter to set this. For example: **<prefix>quiz N4 mmq=5**.
- **Font settings**: You can use the **font=**, **size=**, **color=**, and **bgcolor=** parameters to control font settings. Say **<prefix>draw** for more info and a way to experiment with these easily.

All of the above can also be set on a permanent basis by using the **<prefix>settings** command.

You can enable **hardcore** mode to only allow one answer attempt. For example: **<prefix>quiz N4 hardcore**.

You can review missed questions by using **<prefix>quiz review** or **<prefix>quiz reviewme** (the latter replays questions that **you** did not answer even if someone else did answer them).

Other useful commands:
**<prefix>quiz stop** (ends the current quiz)
**<prefix>lb** (shows the quiz leaderboard)
**<prefix>quiz ${MASTERY_NAME}** (show information about conquest mode)
**<prefix>quiz search** (search for public custom decks)
**<prefix>quiz save** (save your progress)
**<prefix>quiz load** (load saved progress)
`;


function createAdvancedHelpContent(prefix) {
  const description = helpLongDescription.replace(/<prefix>/g, prefix);
  const content = {
    embeds: [{
      title: 'Advanced Help',
      description,
      color: constants.EMBED_NEUTRAL_COLOR,
    }]
  };

  return content;
}

async function showHelp(msg, isMastery, isConquest, masteryEnabled, advanced) {
  const prefix = msg.prefix;

  let helpMessage;
  if (!isMastery && !isConquest && advanced) {
    helpMessage = createAdvancedHelpContent(prefix);
  } else if(!isMastery && !isConquest) {
    helpMessage = await createHelpContent(prefix);
  } else if (isMastery) {
    helpMessage = createMasteryHelp(masteryEnabled, prefix);
  } else if (isConquest) {
    helpMessage = createConquestHelp(masteryEnabled, prefix);
  } else {
    assert(false, 'Unknown extension');
  }

  return msg.channel.createMessage(helpMessage, null, msg);
}

function throwIfShutdownScheduled(channelId) {
  if (globals.shutdownScheduled) {
    state.scheduledShutdown.shutdownNotifyChannels.push(channelId);
    const messageContent = {
      embeds: [{
        title: 'Scheduled Update',
        description: 'I\'m scheduled to reboot for an update in a few minutes so now\'s a bad time :) Please try again in about five minutes.',
        color: constants.EMBED_WARNING_COLOR,
        footer: {
          icon_url: constants.FOOTER_ICON_URI,
          text: 'I\'m getting an update! Yay!',
        },
      }],
    };

    throw new FulfillmentError({
      publicMessage: messageContent,
      logDescription: 'Shutdown scheduled',
    });
  }
}

function throwIfAlreadyHasSession(userId) {
  const sessionInfo = quizManager.getActiveSessionInformation();
  if (sessionInfo.some(s => s.ownerId === userId)) {
    const message = {
      embeds: [{
        title: 'Quiz In Progress',
        description: `You already have a quiz session running somewhere. Please stop it before starting a new one here.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage: message,
      logDescription: 'Session in progress elsewhere',
    });
  }
}

function throwIfTooManyDecks(deckCount) {
  if (deckCount > 10) {
    throw new FulfillmentError({
      publicMessage: 'Please choose a maximum of ten decks.',
      logDescription: 'Too many decks',
    });
  }
}

function verifyValueIsInRange(settingName, settingAbbreviation, min, max, value) {
  if (value < min || value > max || Number.isNaN(value)) {
    const publicMessage = {
      embeds: [{
        title: 'Setting validation error',
        description: `Invalid value for ${settingName} (${settingAbbreviation}). Please provide a value between ${min} and ${max}. For example **${settingAbbreviation}=${min}**. Try my [quiz command builder](https://kotobaweb.com/bot/quizbuilder) if you need help.`,
        color: constants.EMBED_WRONG_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage,
      logDescription: `Value of ${value} is not in range for ${settingName}`,
    });
  }
}

function validateGameModeCombination(gameModes) {
  if (gameModes.conquest && gameModes.mastery) {
    const publicMessage = {
      embeds: [{
        title: 'Setting validation error',
        description: 'You cannot enable both Conquest and Inferno mode at the same time. Please choose one or the other.',
        color: constants.EMBED_WRONG_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage,
      logDescription: `Cannot enable both Conquest and Inferno.`,
    });
  }
}

function consumeGameModeTokens(commandTokens, commandExtension) {
  const remainingTokens = [];
  const gameModes = {
    conquest: commandExtension === CONQUEST_EXTENSION,
    mastery: commandExtension === MASTERY_EXTENSION,
  };

  commandTokens.forEach((token) => {
    if (token === 'hardcore') {
      gameModes.hardcore = true;
    } else if (token === 'inferno') {
      gameModes.conquest = true;
    } else if (token === 'conquest') {
      gameModes.mastery = true;
    } else if (token === 'norace') {
      gameModes.norace = true;
    } else {
      // Could not consume token.
      remainingTokens.push(token);
    }
  });

  validateGameModeCombination(gameModes);

  return { remainingTokens, gameModes };
}

function consumeTimingTokens(commandTokens) {
  const remainingTokens = [];
  const timingOverrides = {};

  commandTokens.forEach((token) => {
    if (token === 'noshuffle') {
      timingOverrides.shuffle = false;
    } else if (token === 'shuffle') {
      timingOverrides.shuffle = true;
    } else {
      const preset = timingPresetsArr.find(p => p.aliases.indexOf(token) !== -1);
      if (preset) {
        Object.assign(timingOverrides, preset);
      } else {
        remainingTokens.push(token);
      }
    }
  });

  const remainingTokensCopy = remainingTokens.slice();
  remainingTokens.splice(0, remainingTokens.length);
  remainingTokensCopy.forEach((token) => {
    const [settingAbbreviation, settingValueString] = token.split('=');
    const settingValue = Number.parseFloat(settingValueString);
    if (settingAbbreviation === 'atl') {
      verifyValueIsInRange('Answer Time Limit', 'atl', ...quizLimits.answerTimeLimit, settingValue);
      timingOverrides.answerTimeLimit = settingValue;
    } else if (settingAbbreviation === 'dauq') {
      verifyValueIsInRange('Delay After Unanswered Question', 'dauq', ...quizLimits.delayAfterUnansweredQuestion, settingValue);
      timingOverrides.delayAfterUnansweredQuestion = settingValue;
    } else if (settingAbbreviation === 'daaq') {
      verifyValueIsInRange('Delay After Answered Question', 'daaq', ...quizLimits.delayAfterAnsweredQuestion, settingValue);
      timingOverrides.delayAfterAnsweredQuestion = settingValue;
    } else if (settingAbbreviation === 'aaww') {
      verifyValueIsInRange('Additional Answer Wait Window', 'aaww', ...quizLimits.additionalAnswerWaitWindow, settingValue);
      timingOverrides.additionalAnswerWaitWindow = settingValue;
    } else if (settingAbbreviation === 'mmq') {
      verifyValueIsInRange('Max Missed Questions', 'mmq', ...quizLimits.maxMissedQuestions, settingValue);
      timingOverrides.maxMissedQuestions = Math.floor(settingValue);
    } else {
      // Could not consume token.
      remainingTokens.push(token);
    }
  });

  return { remainingTokens, timingOverrides };
}

function intersect(arr1, arr2) {
  return arr1.filter(element => arr2.indexOf(element) !== -1);
}

function consumeLoadCommandTokens(commandTokens) {
  const otherTokens = commandTokens.filter(token => token !== 'load');
  if (otherTokens.length !== commandTokens.length) {
    return {
      isLoad: true,
      loadArgument: otherTokens[0],
      remainingTokens: otherTokens.slice(1),
    };
  }

  return { isLoad: false, remainingTokens: commandTokens };
}

function consumeDeckListToken(commandTokens) {
  if (commandTokens.length === 0) {
    throw new Error('No decks specified');
  }

  const decksAndMixes = commandTokens[0].split('+').filter(d => d);
  const decks = [];

  throwIfTooManyDecks(decksAndMixes.length);

  decksAndMixes.forEach((deckOrMix) => {
    const mixPreset = deckMixPresets[deckOrMix];
    if (mixPreset) {
      decks.push(...mixPreset);
    } else {
      decks.push(deckOrMix);
    }
  });

  return { decks, remainingTokens: commandTokens.slice(1) };
}

function consumeScoreLimitToken(commandTokens) {
  if (commandTokens.length === 0) {
    return { remainingTokens: commandTokens, questionLimitOverrides: {} };
  }

  const scoreLimitStr = commandTokens[0];
  const scoreLimit = parseInt(scoreLimitStr);

  if (Number.isNaN(scoreLimit)) {
    const publicMessage = {
      embeds: [{
        title: 'Setting validation error',
        description: `**${scoreLimitStr}** is not a valid score limit. Please provide a numeric score limit after the deck name(s). Try my [quiz command builder](https://kotobaweb.com/bot/quizbuilder) if you need help.`,
        color: constants.EMBED_WRONG_COLOR,
      }],
    };

    throw new FulfillmentError({
      publicMessage,
      logDescription: 'NaN score limit',
    });
  }

  const [minScoreLimit, maxScoreLimit] = quizLimits.scoreLimit;
  const remainingTokens = commandTokens.slice(1);

  return {
    remainingTokens,
    scoreLimitOverrides: {
      scoreLimit: Math.min(Math.max(scoreLimit, minScoreLimit), maxScoreLimit),
    },
  };
}

function getServerSettings(rawServerSettings) {
  return {
    bgColor: rawServerSettings.quiz_background_color,
    fontFamily: rawServerSettings.quiz_font,
    color: rawServerSettings.quiz_font_color,
    size: rawServerSettings.quiz_font_size,
    additionalAnswerWaitWindow: rawServerSettings['quiz/japanese/additional_answer_wait_time'],
    answerTimeLimit: rawServerSettings['quiz/japanese/answer_time_limit'],
    conquestAndInfernoEnabled: rawServerSettings['quiz/japanese/conquest_and_inferno_enabled'],
    internetDecksEnabled: rawServerSettings['quiz/japanese/internet_decks_enabled'],
    delayAfterAnsweredQuestion: rawServerSettings['quiz/japanese/new_question_delay_after_answered'],
    delayAfterUnansweredQuestion: rawServerSettings['quiz/japanese/new_question_delay_after_unanswered'],
    scoreLimit: rawServerSettings['quiz/japanese/score_limit'],
    unansweredQuestionLimit: rawServerSettings['quiz/japanese/unanswered_question_limit'],
    maxMissedQuestions: rawServerSettings.quiz_max_missed_questions,
    shuffle: rawServerSettings.quiz_shuffle,
  };
}

async function doSearch(msg, searchTerm = '', options) {
  const results = await deckSearchUtils.searchCustomFullText(
    searchTerm,
    {  ...options, populateOwner: true, limit: 100 },
  );

  if (results.length === 0) {
    throw new FulfillmentError({
      publicMessage: { ...noDecksFoundPublicMessage },
      logDescription: 'No results',
    });
  }

  const chunks = arrayUtil.chunk(results, 10);

  const footer = searchTerm.trim()
    ? undefined
    : { icon_url: constants.FOOTER_ICON_URI, text: `You can provide a search term. For example: ${msg.prefix}quiz search kanken` };

  const embeds = chunks.map((c, i) => ({
    embeds: [{
      title: `Custom Deck Search Results (page ${i + 1} of ${chunks.length})`,
      fields: c.map((r) => ({
        name: `${r.shortName} (${r.score} votes)`,
        value: `__${r.name}__ by ${r.owner?.discordUser.username ?? 'Unknown User'}`,
      })),
      color: constants.EMBED_NEUTRAL_COLOR,
      footer,
    }],
  }));

  const interactiveMessageId = `quiz_search_"${searchTerm}"`;
  return PaginatedMessage.sendAsMessageReply(msg, [{ title: '', pages: embeds }], { id: interactiveMessageId });
}

function substituteDeckArguments(suffix) {
  const regex = /\(([^)]+)\s+([^)]+)\)/;
  let replacedSuffix = suffix;
  while (regex.test(replacedSuffix)) {
    replacedSuffix = replacedSuffix.replace(regex, '($1/$2)');
  }

  return replacedSuffix;
}

async function warnIfNoSaveSlotsAvailable(msg) {
  const hasAvailableSlots = await saveManager.userHasAvailableSaveSlots(msg.author.id);
  if (!hasAvailableSlots) {
    const warningMessage = {
      embeds: [{
        title: 'No Save Slots Available',
        description: `You have no available save slots and will not be able to save this session. To free up a save slot, you can delete an existing save by loading it via the \`${msg.prefix}quiz load\` command and then stopping it with \`${msg.prefix}quiz stop\`.`,
        color: constants.EMBED_WARNING_COLOR,
      }],
    };

    await msg.channel.createMessage(warningMessage);
  }
}

async function autoCompleteSearch(option) {
  const input = option.value.trim();

  if (!input) {
    return defaultDeckOptionsForInteraction;
  }

  const hasMultipleParts = input.includes('+');
  const parts = hasMultipleParts ? input.split(/\s*\+\s*/) : undefined;
  const searchValue = hasMultipleParts ? parts[parts.length - 1].trim() : input;

  if (!searchValue) {
    return [{
      name: input,
      value: input,
    }];
  }

  const uniqueResults = await Cache.getCachedInProcess(
    `quiz_autocomplete_search:${searchValue}`,
    60 * 60,
    async () => {
      const builtInDecksPrefixResults = deckSearchUtils.searchBuiltInPrefix(searchValue, { limit: 10 });
      const builtInDecksFullTextResults = deckSearchUtils.searchBuiltInFullText(searchValue, { limit: 10 });
      const [customDeckPrefixResults, customDeckFullTextResults] = await Promise.all([
        deckSearchUtils.searchCustomPrefix(searchValue, { limit: 5 }),
        deckSearchUtils.searchCustomFullText(searchValue, { populateOwner: false, limit: 20 }),
      ]);

      const seen = new Set();
      return builtInDecksPrefixResults.concat(
        builtInDecksFullTextResults,
        customDeckPrefixResults,
        customDeckFullTextResults,
      ).filter((r) => {
        if (seen.has(r.shortName)) {
          return false;
        }

        seen.add(r.shortName);
        return true;
      });
    },
  );

  const previousParts = hasMultipleParts ? parts.slice(0, parts.length - 1) : undefined;
  return uniqueResults.map((r) => {
    const userSubmitted = typeof r.score === 'number';
    const userSubmittedPart = userSubmitted ? ` - User Submitted - ${r.score} upvotes` : '';
    const namePart = `${r.shortName} (${r.name}${userSubmittedPart})`;
    const valuePart = r.shortName;

    if (!previousParts) {
      return { name: namePart.slice(0, 100), value: valuePart };
    }

    const name = [
      ...previousParts,
      namePart,
    ].join(' + ');

    const value = [
      ...previousParts,
      valuePart,
    ].join('+');

    return { name: name.slice(0, 100), value };
  });
}

async function getAliases(msg, monochrome) {
  const persistence = monochrome.getPersistence();
  const [serverAliasesData, userAliasesData] = await Promise.all([
    persistence.getDataForServer(msg.channel.guild?.id ?? msg.channel.id),
    persistence.getDataForUser(msg.author.id),
  ]);

  return {
    serverAliases: serverAliasesData.quizAliases ?? [],
    userAliases: userAliasesData.quizAliases ?? [],
  };
}

async function getCombinedAliases(msg, monochrome) {
  const { serverAliases, userAliases } = await getAliases(msg, monochrome);
  return serverAliases.concat(userAliases);
}

/*
Only server admin can add server alias
Only server admin can delete server alias
Setting an alias interactively as a normal user, does not prompt for scope
Setting an alias non-interactively as a normal user, ignores "server" and saves as user alias
Test on all the moeway commands
Test short-circuiting to any stage (include 1, 2, 3, 4 tokens) (test with non-admin user too)
Make sure server aliases take precedence over user ones
*/

async function handleAliasCommand(
  monochrome,
  msg,
  tokens,
) {
  async function doPrompt(
    title,
    description,
    isAcceptableInput,
    acceptableInputDescription,
    fields,
    footerText,
  ) {
    let input;

    while (true) {
      try {
        await msg.channel.createMessage(trimEmbed({
          embeds: [{
            color: constants.EMBED_NEUTRAL_COLOR,
            title,
            description,
            fields,
            footer: footerText ? {
              icon_url: constants.FOOTER_ICON_URI,
              text: footerText,
            } : undefined
          }],
        }));
    
        input = await monochrome.waitForMessage(
          120000,
          (c) => c.author.id === msg.author.id && c.channel.id === msg.channel.id,
        );
    
        const inputLower = input.content.toLowerCase().trim();

        if (inputLower === 'cancel') {
          await msg.channel.createMessage({
            embeds: [{
              color: constants.EMBED_WRONG_COLOR,
              title: 'The operation has been canceled.',
            }],
          });

          return undefined;
        }

        if (isAcceptableInput(inputLower)) {
          return inputLower;
        }
  
        await msg.channel.createMessage({
          embeds: [{
            color: constants.EMBED_WRONG_COLOR,
            title: 'Invalid input',
            description: acceptableInputDescription,
          }],
        });
      } catch (err) {
        if (err.message === 'WAITER TIMEOUT') {
          await msg.channel.createMessage(`Time's up. The alias menu has been closed.`);
          return;
        }

        throw err;
      }
    }
  }

  const serverId = msg.channel.guild?.id ?? msg.channel.id;

  let aliasOperation = tokens[0]?.toLowerCase();
  let aliasName = tokens[1]?.toLowerCase();
  let aliasScope;
  let aliasValue;

  if (aliasOperation && aliasName) {
    const thirdToken = tokens[2];

    if (thirdToken === 'server' || thirdToken === 'self') {
      aliasScope = thirdToken;
      aliasValue = tokens.slice(3).join(' ');
    } else if (thirdToken) {
      aliasScope = 'self';
      aliasValue = tokens.slice(2).join(' ');;
    }
  }

  
  const persistence = monochrome.getPersistence();
  const { serverAliases, userAliases } = await getAliases(msg, monochrome);

  aliasOperation ||= await doPrompt(
    'Quiz Aliases',
    'Say \`add\` to add a new alias (or overwrite an existing one). Say \`delete\` to delete an existing alias. Say \`cancel\` to cancel.',
    (input) => input === 'add' || input === 'delete',
    'Please say `add`, `delete` or `cancel`.',
    [{
      name: 'Active Aliases in this Server',
      value: serverAliases.length ? serverAliases.map(a => `* \`${a.name}\` → \`${a.value}\``).join('\n') : 'None',
      inline: false,
    }, {
      name: 'Your Active Aliases',
      value: userAliases.length ? userAliases.map(a => `* \`${a.name}\` → \`${a.value}\``).join('\n') : 'None',
      inline: false,
    }]
  );

  if (!aliasOperation) {
    return;
  }

  if (!msg.authorIsServerAdmin) {
    aliasScope = 'self';
  }

  if (aliasOperation === 'add') {
    aliasName ||= await doPrompt(
      'Quiz Aliases',
      'What would you like to name the alias? For example `myquiz1`, `myquiz2`, etc.',
      (input) => /^[a-z][a-z0-9]+$/.test(input) && input !== 'alias',
      'The alias name must be alphanumeric and must start with a letter. It also cannot be `alias`.',
    );
  
    if (!aliasName) {
      return;
    }

    aliasScope ||= await doPrompt(
      'Quiz Aliases',
      'Where should the alias apply? Say `server` to make it apply to the server, or `self` to make it apply only to you.',
      (input) => input === 'server' || input === 'self',
      'Please say `server`, `self`, or cancel.',
    );
  
    if (!aliasScope) {
      return;
    }
  
    aliasValue ||= await doPrompt(
      'Quiz Aliases',
      'What quiz command would you like the alias to map to? For example `N4+N3 font=3 size=60`',
      () => true,
      'No restrictions.',
    );

    if (!aliasValue) {
      return;
    }

    if (aliasScope === 'server') {
      if (serverAliases.length >= MAX_ALIASES) {
        return msg.channel.createMessage({
          embeds: [{
            color: constants.EMBED_WRONG_COLOR,
            title: 'Alias limit reached',
            description: `The server has reached the maximum number of aliases (${MAX_ALIASES}).`,
          }],
        });
      }

      await persistence.editDataForServer(serverId, (data) => {
        data.quizAliases ||= [];
        const matchingAlias = data.quizAliases.find(a => a.name === aliasName);
        if (matchingAlias) {
          matchingAlias.value = aliasValue;
          return data;
        }

        data.quizAliases.push({ name: aliasName, value: aliasValue });
        return data;
      });
    } else {
      if (userAliases.length >= MAX_ALIASES) {
        return msg.channel.createMessage({
          embeds: [{
            color: constants.EMBED_WRONG_COLOR,
            title: 'Alias limit reached',
            description: `You have reached the maximum number of aliases (${MAX_ALIASES}).`,
          }],
        });
      }

      await persistence.editDataForUser(msg.author.id, (data) => {
        data.quizAliases ||= [];
        const matchingAlias = data.quizAliases.find(a => a.name === aliasName);
        if (matchingAlias) {
          matchingAlias.value = aliasValue;
          return data;
        }

        data.quizAliases.push({ name: aliasName, value: aliasValue });
        return data;
      });
    }

    return msg.channel.createMessage({
      embeds: [{
        color: constants.EMBED_CORRECT_COLOR,
        title: 'Alias added',
        description: `The alias **${aliasName}** has been added. Say \`${msg.prefix}quiz ${aliasName}\` to try it.`,
      }],
    });
  } else if (aliasOperation === 'delete') {
    const deletableAliases = msg.authorIsServerAdmin ? serverAliases.concat(userAliases) : userAliases;

    if (deletableAliases.length === 0) {
      return msg.channel.createMessage({
        embeds: [{
          color: constants.EMBED_NEUTRAL_COLOR,
          title: 'Quiz Aliases',
          description: `There aren't any aliases that you can delete.`,
        }],
      }); 
    }

    aliasName ||= await doPrompt(
      'Quiz Aliases',
      'Which alias would you like to delete?',
      (input) => deletableAliases.some(a => a.name === input),
      `Cannot delete that alias. The aliases you can delete are: ${deletableAliases.map(a => `\`${a.name}\``).join(', ') || '`None`'}. You can also say \`cancel\` to cancel.`,
      [{
        name: 'Deletable Aliases',
        value: deletableAliases.length ? deletableAliases.map(a => `\`${a.name}\` (\`${a.value}\`)`).join('\n') : '`None`',
      }],
      `Say the name of the alias to delete. For example: ${deletableAliases[0].name}`
    );
  
    if (!aliasName) {
      return;
    }

    if (msg.authorIsServerAdmin) {
      await persistence.editDataForServer(serverId, (data) => {
        return {
          ...data,
          quizAliases: data.quizAliases?.filter(a => a.name !== aliasName) ?? [],
        };
      });
    }

    await persistence.editDataForUser(msg.author.id, (data) => {
      return {
        ...data,
        quizAliases: data.quizAliases?.filter(a => a.name !== aliasName) ?? [],
      };
    });

    return msg.channel.createMessage({
      embeds: [{
        color: constants.EMBED_CORRECT_COLOR,
        title: 'Alias deleted',
        description: `The alias **${aliasName}** has been deleted.`,
      }],
    });
  } else if (aliasOperation) {
    assert.fail('Invalid alias operation');
  }
}

function normalizeCommandString(commandString) {
  return commandString
        .replace(/\s+/g, ' ')
        .replace(/ *\+ */g, '+')
        .replace(/ *= */g, '=')
        .replace(/ *- */g, '-')
        .replace(/ *\(/g, '(')
        .replace(/\( +/g, '(')
        .replace(/ +\)/g, ')')
        .replace(/, +/g, ',')
        .trim().toLowerCase();
}

module.exports = {
  commandAliases: ['quiz', 'q'],
  canBeChannelRestricted: true,
  uniqueId: 'readingQuiz14934',
  cooldown: 1,
  shortDescription: 'See how to start a quiz in this channel.',
  longDescription: helpLongDescription,
  requiredBotPermissions: [
    Permissions.attachFiles,
    Permissions.embedLinks,
    Permissions.sendMessages,
    Permissions.viewChannel,
  ],
  requiredSettings: quizManager.getDesiredSettings().concat([
    'quiz/japanese/conquest_and_inferno_enabled',
    'quiz/japanese/internet_decks_enabled',
    'quiz_max_missed_questions',
    'quiz_shuffle',
  ]),
  interaction: {
    description: 'Start a quiz',
    compatibilityMode: true,
    options: [
      {
      name: 'deck',
      description: 'The deck from which to draw questions.',
      type: 3,
      required: true,
      autocomplete: true,
      async performAutoComplete(bot, interaction, option, monochrome) {
        const results = await autoCompleteSearch(option);
        monochrome.getLogger().info({
          event: 'QUIZ DECK AUTOCOMPLETED',
          detail: `'${option.value}' - ${results.length} results`,
        });
        return results;
      },
    }, {
      name: 'scorelimit',
      description: 'The score that must be achieved in order to win.',
      type: 4,
      required: false,
      min_value: 1,
      max_value: 10_000,
    }, {
      name: 'pace',
      description: 'The overall speed of the session.',
      type: 3,
      required: false,
      choices: [{
        name: 'No Delay',
        value: 'nodelay',
      }, {
        name: 'Faster',
        value: 'faster',
      }, {
        name: 'Fast',
        value: 'fast',
      }, {
        name: 'Normal',
        value: 'normal',
      }, {
        name: 'Slow',
        value: 'slow',
      }],
    }, {
      name: 'conquest',
      description: 'Conquest Mode - I\'ll repeat questions you miss (score limit is ignored in conquest mode).',
      type: 5,
      required: false,
    }, {
      name: 'hardcore',
      description: 'Hardcore Mode - You have only one chance to answer each question.',
      type: 5,
      required: false,
    }],
  },
  attachIsServerAdmin: true,
  async action(bot, msg, suffix, monochrome, rawServerSettings) {
    let commandString = normalizeCommandString(suffix);
    if (commandString.startsWith('alias ') || commandString === 'alias') {
      return handleAliasCommand(monochrome, msg, commandString.split(' ').slice(1));
    }

    const aliases = await getCombinedAliases(msg, monochrome);

    for (const alias of aliases) {
      const aliasRegex = new RegExp(`\\b${escapeStringRegexp(alias.name)}\\b`, 'g');
      if (aliasRegex.test(commandString)) {
        commandString = commandString.replace(aliasRegex, normalizeCommandString(alias.value));
        break;
      }
    }

    commandString = substituteDeckArguments(commandString);

    const cleanSuffixTokens = commandString.split(' ');

    // Save operation
    const isSave = cleanSuffixTokens[0] === 'save';
    if (isSave) {
      const saveName = cleanSuffixTokens.slice(1).join(' ') || undefined;
      return quizManager.saveQuiz(msg.channel.id, msg.author.id, saveName);
    }

    const serverSettings = getServerSettings(rawServerSettings);
    const fontArgParseResult = fontHelper.parseFontArgs(commandString);

    if (fontArgParseResult.errorDescriptionShort) {
      return throwPublicErrorFatal(
        'Font settings error',
        fontArgParseResult.errorDescriptionLong,
        fontArgParseResult.errorDescriptionShort,
      );
    }

    const { remainingString: cleanSuffixFontArgsParsed, ...inlineSettings } = fontArgParseResult;

    const commandTokens = cleanSuffixFontArgsParsed.split(' ').filter(x => x);

    if (commandTokens[0] === 'search') {
      const [optionTokens, queryTokens] = arrayUtil.partition(commandTokens.slice(1), t => t.includes('='));
      const query = queryTokens.join(' ');
      const options = Object.fromEntries(
        optionTokens.map(t => t.split('=')),
      );

      return doSearch(msg, query, options);
    }

    let { remainingTokens: remainingTokens1, gameModes } = consumeGameModeTokens(commandTokens, msg.extension);
    let { remainingTokens: remainingTokens2, timingOverrides } = consumeTimingTokens(remainingTokens1);
    Object.assign(inlineSettings, timingOverrides);

    const messageSender = new DiscordMessageSender(bot, msg, monochrome);
    const masteryEnabled = serverSettings.conquestAndInfernoEnabled;
    const internetDecksEnabled = serverSettings.internetDecksEnabled;

    const isMastery = gameModes.mastery;
    const isConquest = gameModes.conquest;
    const isHardcore = gameModes.hardcore;
    const isNoRace = gameModes.norace;

    const hasSettingsToken = remainingTokens2.indexOf('settings') !== -1
      || remainingTokens2.indexOf('setting') !== -1;

    if (hasSettingsToken) {
      return showSettingsHelp(msg);
    }

    // Help operation
    if (remainingTokens2.indexOf('help') !== -1 || remainingTokens2.length === 0) {
      return showHelp(msg, isMastery, isConquest, masteryEnabled, remainingTokens2.indexOf('help') !== -1);
    }

    // View stats operation
    if (remainingTokens2.indexOf('stats') !== -1) {
      return sendStats(msg, remainingTokens2[1]);
    }

    // Stop operation
    if (intersect(['stop', 'end', 'endquiz', 'quit', 'exit'], remainingTokens2).length > 0) {
      return quizManager.stopQuiz(msg.channel.id, msg.author.id, msg.authorIsServerAdmin);
    }

    const categoryHelp = await getCategoryHelp(remainingTokens2[0]);
    if (categoryHelp) {
      return msg.channel.createMessage(categoryHelp);
    }

    const locationId = msg.channel.id;
    const prefix = msg.prefix;
    const invokerId = msg.author.id;

    throwIfShutdownScheduled(locationId);
    throwIfSessionInProgressAtLocation(locationId, prefix);
    throwIfAlreadyHasSession(invokerId);

    // Load operation
    const { isLoad, loadArgument, remainingTokens: remainingTokens3 } = consumeLoadCommandTokens(remainingTokens2);
    if (isLoad) {
      const loadSettings = createSettingsForLoad(serverSettings, inlineSettings);
      return load(
        bot,
        msg,
        loadArgument,
        messageSender,
        masteryEnabled,
        internetDecksEnabled,
        monochrome.getLogger(),
        loadSettings,
        msg.content,
      );
    }

    const isDm = !msg.channel.guild;
    const scoreScopeId = getScoreScopeIdFromMsg(msg);

    let decks;
    let gameMode;
    let remainingTokens4;
    if (remainingTokens3.indexOf('reviewme') !== -1) {
      remainingTokens4 = remainingTokens3.filter(t => t !== 'reviewme');
      gameMode = ReviewGameMode;
      decks = [getReviewDeckOrThrow(await deckLoader.getUserReviewDeck(msg.author.id), prefix)];
    } else if (remainingTokens3.indexOf('review') !== -1) {
      remainingTokens4 = remainingTokens3.filter(t => t !== 'review');
      gameMode = ReviewGameMode;
      decks = [getReviewDeckOrThrow(await deckLoader.getLocationReviewDeck(locationId), prefix)];
    } else {
      const deckListResult = consumeDeckListToken(remainingTokens3);
      const deckNames = deckListResult.decks;
      remainingTokens4 = deckListResult.remainingTokens;
      gameMode = createNonReviewGameMode(isMastery, isConquest);

      const decksLookupResult = await deckLoader.getQuizDecks(
        getDeckNameAndModifierInformation(deckNames),
      );

      if (decksLookupResult.status === deckLoader.DeckRequestStatus.DECK_NOT_FOUND) {
        return msg.channel.createMessage(`I don't have a deck named **${decksLookupResult.notFoundDeckName}**. Say **${prefix}quiz** to see the decks I have!`, null, msg);
      } else if (decksLookupResult.status === deckLoader.DeckRequestStatus.RANGE_INVALID) {
        return msg.channel.createMessage(`The range of questions you specified for **${decksLookupResult.invalidDeckName}** is not valid. The valid range of questions is between **${decksLookupResult.validStartIndex}** and **${decksLookupResult.validEndIndex}**.`, null, msg);
      } else if (decksLookupResult.status === deckLoader.DeckRequestStatus.ALL_DECKS_FOUND) {
        ({ decks } = decksLookupResult);
      } else {
        assert.fail(`Unknown deck lookup status: ${decksLookupResult.status}`);
      }
    }

    // At this point we have the decks and are ready to start the quiz unless:
    // 1. The game mode is not allowed in this channel.
    // 2. The deck contains internet cards, but internet decks are not allowed in this channel.
    // 3. The deck is not allowed to be used in this server.
    // 4. A quiz is already in progress in this channel.
    // 5. We need to establish a voice connection but cannot do so

    // Check the game mode.
    throwIfGameModeNotAllowed(isDm, gameMode, masteryEnabled, prefix);

    // Check if a game is in progress
    throwIfSessionInProgressAtLocation(locationId, prefix);

    const {
      remainingTokens: remainingTokens5,
      scoreLimitOverrides,
    } = consumeScoreLimitToken(remainingTokens4);

    Object.assign(inlineSettings, scoreLimitOverrides);

    // Create the session
    const settings = createSettings(serverSettings, inlineSettings, gameMode);

    // Create the deck collection.
    const deckCollection = DeckCollection.createNewFromDecks(decks, gameMode, settings.shuffle);

    const session = Session.createNew(
      `${msg.prefix}quiz ${suffix}`,
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

    // Check if deck can be used in this server
    throwIfDeckNotAllowedInServer(session);

    // Check for internet cards
    throwIfInternetCardsNotAllowed(isDm, session, internetDecksEnabled, prefix);

    // Try to establish audio connection
    if (session.requiresAudioConnection()) {
      messageSender.audioConnection = await AudioConnectionManager.create(bot, msg);
    }

    if (isMastery) {
      await warnIfNoSaveSlotsAvailable(msg);
    }

    // All systems go. Liftoff!
    quizManager.startSession(session, locationId);

    return undefined;
  },
  canHandleExtension(extension) {
    const extensionLowercase = extension.toLowerCase();
    return extensionLowercase === MASTERY_EXTENSION || extensionLowercase === CONQUEST_EXTENSION;
  },
};
