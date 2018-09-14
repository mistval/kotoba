const reload = require('require-reload')(require);
const assert = require('assert');
const constants = require('./../common/constants.js');

const googleTranslate = reload('./../common/google_translate_utils.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

function createLongDescription() {
  const supportedLanguageString = Object.keys(googleTranslate.languageNameForLanguageCode)
    .map(key => `${googleTranslate.languageNameForLanguageCode[key]} (${key})`).join(', ');

  return `Use Google Translate to translate text. If you want to translate from any language into English, or from English into Japanese, you can just use <prefix>translate and I will usually detect the languages and do what you want.

If you want to translate into a language other than English, you can do that too. The syntax is <prefix>translate-[language code]. For example, <prefix>translate-de to translate into German.

If you need to specify both the original and the target language, you can do that too by saying <prefix>translate-[from language code]>[to language code]. For example, <prefix>translate-de>ru to translate German into Russian.

I support the following languages:

${supportedLanguageString}
`;
}

function throwPublicError(publicMessage, logMessage) {
  return throwPublicErrorInfo('Translate', publicMessage, logMessage);
}

function replaceMentionsWithUsernames(str, msg) {
  const mentions = msg.mentions;
  let replacedString = str;
  mentions.forEach((mention) => {
    replacedString = replacedString
      .replace(new RegExp(`<@!?${mention.id}>`, 'g'), mention.username);
  });

  return replacedString;
}

function getLanguageCodesFromExtension(extension) {
  if (!extension || extension === '-') {
    return [];
  }

  const languagePart = extension.replace('-', '');
  let languages = languagePart.split('>').slice(0, 2);

  return languages;
}

function respondNoSuffix(msg) {
  if (!msg.extension || msg.extension === '-') {
    return throwPublicError(`Say **${msg.prefix}translate [text]** to translate text. For example: **${msg.prefix}translate 私は子猫です**. Say **${msg.prefix}help translate** for more help.`, 'No suffix');
  }

  const languageCodes = getLanguageCodesFromExtension(msg.extension);
  const languageNames = languageCodes.map(languageCode =>
    googleTranslate.toLanguageName(languageCode));

  let errorMessage = '';

  if (languageNames[0] && languageNames[1]) {
    errorMessage = `Say **${msg.prefix}translate-${languageCodes[0]}>${languageCodes[1]} yourtexthere** to translate text from ${languageNames[0]} to ${languageNames[1]}.`;
  } else if (languageNames[0]) {
    errorMessage = `Say **${msg.prefix}translate-${languageCodes[0]} yourtexthere** to translate text to or from ${languageNames[0]}.`;
  } else {
    assert(false, 'Unexpected branch');
  }

  return throwPublicError(errorMessage, 'No suffix');
}

async function coerceLanguageCodes(languageCodes, text) {
  // There may be 0, 1, or 2 provided language codes.
  // They must all be valid.
  assert(languageCodes.length < 3, 'More language codes than expected');

  let [coercedLanguageCodeFrom, coercedLanguageCodeTo] = languageCodes;

  if (!coercedLanguageCodeTo) {
    const detectedLanguageCode = await googleTranslate.detectLanguage(text);
    let coercedDetectedLanguageCode = detectedLanguageCode;

    if (detectedLanguageCode === 'und' || !googleTranslate.toLanguageCode(detectedLanguageCode)) {
      coercedDetectedLanguageCode = 'en';
    } else if (googleTranslate.languageIsChinese(detectedLanguageCode) && text.length < 10) {
      // For small inputs, force to Japanese if Chinese is detected.
      // This prevents things like 車 from being detected as Chinese.
      coercedDetectedLanguageCode = 'ja';
    }

    if (languageCodes[0] !== detectedLanguageCode) {
      coercedLanguageCodeTo = languageCodes[0];
      coercedLanguageCodeFrom = coercedDetectedLanguageCode;
    }

    if (!coercedLanguageCodeTo) {
      if (coercedLanguageCodeFrom === 'en') {
        coercedLanguageCodeTo = 'ja';
      } else {
        coercedLanguageCodeTo = 'en';
      }
    }
  }

  assert(coercedLanguageCodeFrom && coercedLanguageCodeTo, 'Should result in two language codes');
  return [coercedLanguageCodeFrom, coercedLanguageCodeTo];
}

function verifyLanguageCodesValid(languageCodes, prefix) {
  languageCodes.forEach((languageCode) => {
    if (!googleTranslate.toLanguageCode(languageCode)) {
      throwPublicError(`I don't recognize the language: **${languageCode}**. Say **${prefix}help translate** for a list of supported languages.`);
    }
  });
}

function resultToDiscordContent(fromLanguage, toLanguage, result) {
  const fromLanguageName = googleTranslate.toLanguageName(fromLanguage);
  const toLanguageName = googleTranslate.toLanguageName(toLanguage);

  const embedFields = [
    { name: 'Original language', inline: true, value: fromLanguageName },
    { name: 'Result language', inline: true, value: toLanguageName },
  ];

  return {
    embed: {
      title: `Result from Google Translate`,
      description: result.text.substring(0, 2048),
      url: result.uri.length < 2048 ? result.uri : undefined,
      fields: embedFields,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

module.exports = {
  commandAliases: ['translate', 'trans', 'gt', 't'],
  aliasesForHelp: ['translate', 't'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'translate49394',
  shortDescription: 'Use Google Translate to translate text.',
  longDescription: createLongDescription(),
  usageExample: '<prefix>translate 吾輩は猫である',
  action: async function action(erisBot, msg, suffix, monochrome, settings) {
    const mentionReplacedSuffix = replaceMentionsWithUsernames(suffix, msg);
    const languageCodes = getLanguageCodesFromExtension(msg.extension);
    verifyLanguageCodesValid(languageCodes, msg.prefix);

    if (!suffix) {
      return respondNoSuffix(msg);
    }

    const [languageCodeFrom, languageCodeTo] = await coerceLanguageCodes(languageCodes, suffix);
    const result = await googleTranslate.translate(languageCodeFrom, languageCodeTo, suffix);

    const discordContent = resultToDiscordContent(languageCodeFrom, languageCodeTo, result);
    return msg.channel.createMessage(discordContent, undefined, msg);
  },
  canHandleExtension(extension) {
    return extension.startsWith('-');
  },
};
