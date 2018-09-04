const reload = require('require-reload')(require);

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

module.exports = {
  commandAliases: ['translate', 'trans', 'gt', 't'],
  aliasesForHelp: ['translate', 't'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'translate49394',
  shortDescription: 'Use Google Translate to translate text.',
  longDescription: createLongDescription(),
  usageExample: '<prefix>translate 吾輩は猫である',
  action: async function action(erisBot, msg, suffix, monochrome, settings, extension) {
    if (!suffix && (!extension || extension === '-')) {
      const prefix = monochrome.getPersistence().getPrimaryPrefixFromMsg(msg);
      return throwPublicError(`Say **${prefix}translate [text]** to translate text. For example: **${prefix}translate 私は子猫です**. Say **${prefix}help translate** for more help.`, 'No suffix');
    }

    let firstLanguageCode;
    let secondLanguageCode;

    if (extension) {
      const languagePart = extension.replace('-', '');
      let languages = languagePart.split('/');

      if (languagePart.indexOf('>') !== -1) {
        languages = languagePart.split('>');
      }

      [firstLanguageCode, secondLanguageCode] = languages;
    }

    // In case the user specified pretty language names instead of language codes,
    // convert those to language codes.
    firstLanguageCode = googleTranslate.getLanguageCodeForPrettyLanguage(firstLanguageCode)
      || firstLanguageCode;
    secondLanguageCode = googleTranslate.getLanguageCodeForPrettyLanguage(secondLanguageCode)
      || secondLanguageCode;

    const firstLanguagePretty =
      googleTranslate.getPrettyLanguageForLanguageCode(firstLanguageCode);
    const secondLanguagePretty =
      googleTranslate.getPrettyLanguageForLanguageCode(secondLanguageCode);

   const prefix = monochrome.getPersistence().getPrimaryPrefixFromMsg(msg);

    // If we couldn't find a pretty language corresponding to the language code, we don't
    // know that language. Error.
    if (!secondLanguagePretty && secondLanguageCode) {
      return throwPublicError(createUnknownLanguageCodeString(secondLanguageCode, prefix), 'Unknown language');
    }

    if (!firstLanguagePretty && firstLanguageCode) {
      return throwPublicError(createUnknownLanguageCodeString(firstLanguageCode, prefix), 'Unknown language');
    }

    if (!suffix) {
      let errorMessage;

      if (firstLanguagePretty && secondLanguagePretty) {
        errorMessage = `Say **${prefix}translate-${firstLanguageCode}>${secondLanguageCode} yourtexthere** to translate text from ${firstLanguagePretty} to ${secondLanguagePretty}.`;
      } else if (firstLanguagePretty) {
        errorMessage = `Say **${prefix}translate-${firstLanguageCode} yourtexthere** to translate text to or from ${firstLanguagePretty}.`;
      }

      return throwPublicError(errorMessage, 'No suffix');
    }

    const mentionReplacedSuffix = replaceMentionsWithUsernames(suffix, msg);

    if (!secondLanguageCode) {
      let detectedLanguageCode = await googleTranslate.detectLanguage(mentionReplacedSuffix);

      if (detectedLanguageCode === 'und' || !googleTranslate.getPrettyLanguageForLanguageCode(detectedLanguageCode)) {
        detectedLanguageCode = 'en';
      }

      if (detectedLanguageCode === 'zh-CN' || detectedLanguageCode === 'zh-TW') {
        detectedLanguageCode = 'ja';
      }

      if (firstLanguageCode !== detectedLanguageCode) {
        secondLanguageCode = firstLanguageCode;
        firstLanguageCode = detectedLanguageCode;
      }

      if (!secondLanguageCode) {
        if (firstLanguageCode === 'en') {
          secondLanguageCode = 'ja';
        } else {
          secondLanguageCode = 'en';
        }
      }
    }

    return translateQuery(
      mentionReplacedSuffix,
      firstLanguageCode,
      secondLanguageCode,
      googleTranslate.translate,
      erisBot,
      msg,
    );
  },
  canHandleExtension(extension) {
    return extension.startsWith('-');
  },
};
