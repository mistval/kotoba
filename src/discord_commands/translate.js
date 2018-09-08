const reload = require('require-reload')(require);
const assert = require('assert');

const translateQuery = reload('./../common/translate_query.js');
const googleTranslate = reload('./../common/google_translate_utils.js');
const prettyLanguageForLanguageCode = reload('./../common/language_code_maps.js').prettyLanguageForGoogleLanguageCode;
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

function createUnknownLanguageCodeString(languageCode, prefix) {
  return `I don't recognize the language code **${languageCode}**. Say '${prefix}help translate' for a list of supported languages.`;
}

function createLongDescription() {
  const supportedLanguageString = Object.keys(prettyLanguageForLanguageCode).map(key => `${prettyLanguageForLanguageCode[key]} (${key})`).join(', ');

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

function getPrettyLanguageNamesForLanguageCodes(languageCodes, prefix) {
  return languageCodes.map((languageCode) => {
    if (googleTranslate.getLanguageCodeForPrettyLanguage(languageCode)) {
      // The language code is actually a pretty language name, return it as is.
      return languageCode;
    }

    const prettyLanguageName = googleTranslate.getPrettyLanguageForLanguageCode(languageCode);

    if (!prettyLanguageName) {
      return throwPublicError(createUnknownLanguageCodeString(languageCode, prefix), 'Unknown language');
    }

    return prettyLanguageName;
  });
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
  const prettyLanguageNames = getPrettyLanguageNamesForLanguageCodes(languageCodes, msg.prefix);

  let errorMessage = '';

  if (prettyLanguageNames[0] && prettyLanguageNames[1]) {
    errorMessage = `Say **${msg.prefix}translate-${languageCodes[0]}>${languageCodes[1]} yourtexthere** to translate text from ${prettyLanguageNames[0]} to ${prettyLanguageNames[1]}.`;
  } else if (prettyLanguageNames[0]) {
    errorMessage = `Say **${msg.prefix}translate-${languageCodes[0]} yourtexthere** to translate text to or from ${prettyLanguageNames[0]}.`;
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

    if (detectedLanguageCode === 'und' || !googleTranslate.getPrettyLanguageForLanguageCode(detectedLanguageCode)) {
      coercedDetectedLanguageCode = 'en';
    } else if ((detectedLanguageCode === 'zh-CN' || detectedLanguageCode === 'zh-TW') && text.length < 10) {
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
    if (!suffix) {
      return respondNoSuffix(msg);
    }

    const mentionReplacedSuffix = replaceMentionsWithUsernames(suffix, msg);
    const languageCodes = getLanguageCodesFromExtension(msg.extension);
    const [languageCodeFrom, languageCodeTo] = await coerceLanguageCodes(languageCodes, suffix);

    return translateQuery(
      mentionReplacedSuffix,
      languageCodeFrom,
      languageCodeTo,
      googleTranslate.translate,
      erisBot,
      msg,
    );
  },
  canHandleExtension(extension) {
    return extension.startsWith('-');
  },
};
