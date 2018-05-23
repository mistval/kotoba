const reload = require('require-reload')(require);

const translateQuery = reload('./../common/translate_query.js');
const googleTranslate = reload('./../common/google_translate_utils.js');
const prettyLanguageForLanguageCode = reload('./../common/language_code_maps.js').prettyLanguageForGoogleLanguageCode;
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

function createUnknownLanguageCodeString(languageCode) {
  return `I don't recognize the language code **${languageCode}**. Say 'k!help translate' for a list of supported languages.`;
}

function createLongDescription() {
  const supportedLanguageString = Object.keys(prettyLanguageForLanguageCode).map(key => `${prettyLanguageForLanguageCode[key]} (${key})`).join(', ');

  return `Use Google Translate to translate text. If you want to translate from any language into English, or from English into Japanese, you can just use k!translate and I will usually detect the languages and do what you want.

If you want to translate into a language other than English, you can do that too. The syntax is k!translate-[language code]. For example, k!translate-de to translate into German.

If you need to specify both the original and the target language, you can do that too by saying k!translate-[from language code]>[to language code]. For example, k!translate-de>ru to translate German into Russian.

I support the following languages:

${supportedLanguageString}
`;
}

function throwPublicError(publicMessage, logMessage) {
  return throwPublicErrorInfo('Translate', publicMessage, logMessage);
}

module.exports = {
  commandAliases: ['k!translate', 'k!trans', 'k!gt', 'k!t'],
  aliasesForHelp: ['k!translate', 'k!t'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'translate49394',
  shortDescription: 'Use Google Translate to translate text.',
  longDescription: createLongDescription(),
  usageExample: 'k!translate 吾輩は猫である',
  action: async function action(erisBot, msg, suffix, monochrome, settings, extension) {
    if (!suffix && (!extension || extension === '-')) {
      return throwPublicError('Say **k!translate [text]** to translate text. For example: **k!translate 私は子猫です**. Say **k!help translate** for more help.', 'No suffix');
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

    // If we couldn't find a pretty language corresponding to the language code, we don't
    // know that language. Error.
    if (!secondLanguagePretty && secondLanguageCode) {
      return throwPublicError(createUnknownLanguageCodeString(secondLanguageCode), 'Unknown language');
    }

    if (!firstLanguagePretty && firstLanguageCode) {
      return throwPublicError(createUnknownLanguageCodeString(firstLanguageCode), 'Unknown language');
    }

    if (!suffix) {
      let errorMessage;

      if (firstLanguagePretty && secondLanguagePretty) {
        errorMessage = `Say **k!translate-${firstLanguageCode}>${secondLanguageCode} yourtexthere** to translate text from ${firstLanguagePretty} to ${secondLanguagePretty}.`;
      } else if (firstLanguagePretty) {
        errorMessage = `Say **k!translate-${firstLanguageCode} yourtexthere** to translate text to or from ${firstLanguagePretty}.`;
      }

      return throwPublicError(errorMessage, 'No suffix');
    }

    if (!secondLanguageCode) {
      let detectedLanguageCode = await googleTranslate.detectLanguage(suffix);

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
      suffix,
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
