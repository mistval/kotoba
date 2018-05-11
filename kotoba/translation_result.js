const reload = require('require-reload')(require);
const constants = require('./constants.js');
const htmlEntitiesModule = require('html-entities');

const TranslationResultStatus = reload('./translation_result_status.js');

const htmlEntities = new htmlEntitiesModule.XmlEntities();

class TranslationResult {
  static CreateSuccessfulResult(
    resultProvider,
    inputLanguage,
    resultLanguage,
    resultLink,
    resultTranslation,
  ) {
    const result = new TranslationResult();
    result.resultProvider = resultProvider;
    result.resultLanguage = resultLanguage;
    result.inputLanguage = inputLanguage;
    result.resultTranslation = resultTranslation.substring(0, 1024);
    result.status = TranslationResultStatus.OK;
    result.resultLink = resultLink.length < 2048 ? resultLink : undefined;
    return result;
  }

  static CreateErrorResult(error) {
    const result = new TranslationResult();
    result.status = TranslationResultStatus.ERROR;
    result.errorDetail = error.message;
    return result;
  }

  static CreateNoResult() {
    const result = new TranslationResult();
    result.status = TranslationResultStatus.NO_RESULT;
    return result;
  }

  static CreateUnsupportedLanguageCodeResult(languageCode) {
    const result = new TranslationResult();
    result.status = TranslationResultStatus.UNSUPPORTED_LANGUAGE;
    result.unsupportedLanguageCode = languageCode;
    return result;
  }

  toDiscordBotContent() {
    const content = {};

    this.resultTranslation = htmlEntities.decode(this.resultTranslation);
    if (this.status === TranslationResultStatus.ERROR) {
      content.content = `Sorry, there was an error :( ${this.errorDetail}`;
    } else if (this.status === TranslationResultStatus.NO_RESULT) {
      content.content = 'Sorry, didn\'t find any results!';
    } else if (this.status === TranslationResultStatus.UNSUPPORTED_LANGUAGE) {
      content.content = `Sorry, I don't support the language code **${this.unsupportedLanguageCode}**.`;
    } else {
      const embedFields = [
        { name: 'Original language', inline: true, value: this.inputLanguage },
        { name: 'Result language', inline: true, value: this.resultLanguage },
      ];

      content.embed = {
        title: `Result from ${this.resultProvider}:`,
        description: this.resultTranslation.replace(/&#39;/g, '\''),
        url: this.resultLink,
        fields: embedFields,
        color: constants.EMBED_NEUTRAL_COLOR,
      };

      if (this.resultLink) {
        content.embed.url = this.resultLink;
      }
    }

    return content;
  }
}

module.exports = TranslationResult;
