
const { SettingsConverters, SettingsValidators } = require('monochrome-bot');
const { quizDefaults } = require('kotoba-common');
const { chunk } = require('./common/util/array.js');

const FontHelper = require('./common/font_helper.js');
const shiritoriForeverHelper = require('./discord/shiritori_forever_helper.js');
const colorValidator = require('validate-color');

function validateHTMLColor(color) {
  return colorValidator.validateHTMLColor(color)
    || colorValidator.validateHTMLColorHex(color)
    || colorValidator.validateHTMLColorName(color);
}

function onShiritoriForeverEnabledChanged(treeNode, channelID, newSettingValidationResult) {
  return shiritoriForeverHelper.handleEnabledChanged(
    channelID,
    newSettingValidationResult.newInternalValue,
  );
}

const fontDescriptionLines =  FontHelper.listedFonts
  .map((fontInfo, index) => `${index + 1}. **${fontInfo.fontFamily}** - ${fontInfo.description}`);

const fontDescriptionPages = chunk(fontDescriptionLines, 10);
const fontAllowedValuesFields = [{
  name: 'Allowed values',
  value: `Enter the number of the font you want from below.\n\n${fontDescriptionPages[0].join('\n')}`,
}].concat(fontDescriptionPages.slice(1).map(p => ({
  name: 'Allowed values (cont.)',
  value: p.join('\n'),
})));

const fontForInput = {};
FontHelper.listedFonts.forEach((fontInfo, index) => {
  fontForInput[index + 1] = fontInfo.fontFamily;
  fontForInput[fontInfo.fontFamily.toLowerCase()] = fontInfo.fontFamily;
});

const allowedColorsString = 'You can enter [color names](https://www.w3schools.com/colors/colors_names.asp) like **red**, **blue**, **orchid**, etc, or enter an RGB value to set any color you want. To do that, [figure out](https://www.w3schools.com/colors/colors_rgb.asp) the red, blue, and green components of the color you want and enter a value like this **rgb(100, 50, 10)** (that\'s red 100, green 50, and blue 10). Each RGB color component must be a whole number between 0 and 255 (rgba works too, along with hsl, hsla, HTML color names, and HTML hex colors). You can test font colors with the **k!draw** command.';

module.exports = [
  {
    userFacingName: 'Quiz',
    children:
    [
      {
        userFacingName: 'Answer time limit',
        description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
        allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
        uniqueId: 'quiz/japanese/answer_time_limit',
        defaultUserFacingValue: quizDefaults.answerTimeLimit.toString(),
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
      },
      {
        userFacingName: 'Score limit',
        description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
        allowedValuesDescription: 'A whole number between 1 and 10000',
        uniqueId: 'quiz/japanese/score_limit',
        defaultUserFacingValue: quizDefaults.scoreLimit.toString(),
        convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
      },
      {
        userFacingName: 'Unanswered question limit',
        description: 'This setting controls how many questions in a row are allowed to go unanswered before the game stops. The intended purpose for this is to automatically end games that players abandon.',
        allowedValuesDescription: 'A whole number between 1 and 25',
        uniqueId: 'quiz/japanese/unanswered_question_limit',
        userSetting: false,
        defaultUserFacingValue: '5',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(1, 25),
      },
      {
        userFacingName: 'Delay after unanswered question',
        description: 'This setting controls how long I will wait (in seconds) after a timed out question before showing a new one. By setting this higher, players get more time to view and consider the correct answer.',
        allowedValuesDescription: 'A number between 0 and 120',
        uniqueId: 'quiz/japanese/new_question_delay_after_unanswered',
        defaultUserFacingValue: quizDefaults.delayAfterUnansweredQuestion.toString(),
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
      },
      {
        userFacingName: 'Delay after answered question',
        description: 'This setting controls how long I will wait (in seconds) after an answer is correctly answered and the window for additional answers closes, before I show a new question. For example, if **Additional answer wait window** is set to two, and this setting is set to three, then after a question is answered correctly a total of five seconds will pass before I ask a new one.',
        allowedValuesDescription: 'A number between 0 and 120',
        uniqueId: 'quiz/japanese/new_question_delay_after_answered',
        defaultUserFacingValue: quizDefaults.delayAfterAnsweredQuestion.toString(),
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
      },
      {
        userFacingName: 'Additional answer wait window',
        description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
        allowedValuesDescription: 'A number between 0 and 120',
        uniqueId: 'quiz/japanese/additional_answer_wait_time',
        defaultUserFacingValue: quizDefaults.additionalAnswerWaitWindow.toString(),
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
      },
      {
        userFacingName: 'Conquest and Inferno modes enabled',
        description: 'This setting controls whether Conquest and Inferno mode quizzes can be run. Say k!quiz-conquest and k!quiz-inferno to find out more about what those are. Since only the person who started a Conquest or Inferno mode quiz or a server admin can stop it, it has potential to be disruptive if not controlled, so it is disabled by default.',
        allowedValuesDescription: 'Either **enabled** or **disabled**',
        uniqueId: 'quiz/japanese/conquest_and_inferno_enabled',
        userSetting: false,
        defaultUserFacingValue: 'Enabled',
        convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
        convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
        validateInternalValue: SettingsValidators.isBoolean,
      },
      {
        userFacingName: 'Internet decks enabled',
        description: 'This setting controls whether decks imported from the internet may be used in this channel. If enabled, it is possible that someone will load a deck containing disagreeable content in this channel.',
        allowedValuesDescription: 'Either **enabled** or **disabled**',
        uniqueId: 'quiz/japanese/internet_decks_enabled',
        userSetting: false,
        defaultUserFacingValue: 'Enabled',
        convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
        convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
        validateInternalValue: SettingsValidators.isBoolean,
      },
    ],
  },
  {
    userFacingName: 'Fonts',
    children:
    [
      {
        userFacingName: 'Quiz font',
        description: 'This setting controls the font used for text rendered for quizzes.',
        allowedValuesDescription: fontAllowedValuesFields,
        uniqueId: 'quiz_font',
        defaultUserFacingValue: 'Noto Sans CJK',
        convertUserFacingValueToInternalValue: SettingsConverters.createMapConverter(
          fontForInput,
          true,
        ),
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.isMappable,
      },
      {
        userFacingName: 'Quiz text font color',
        description: 'This setting controls the color of the text rendered for quizzes.',
        allowedValuesDescription: allowedColorsString,
        uniqueId: 'quiz_font_color',
        defaultUserFacingValue: 'rgb(0, 0, 0)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateHTMLColor,
      },
      {
        userFacingName: 'Quiz text background color',
        description: 'This setting controls the background color of the text rendered for quizzes.',
        allowedValuesDescription: allowedColorsString,
        uniqueId: 'quiz_background_color',
        defaultUserFacingValue: 'rgb(255, 255, 255)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateHTMLColor,
      },
      {
        userFacingName: 'Quiz text font size',
        description: 'This setting controls the font size of the text rendered for quizzes.',
        allowedValuesDescription: 'A number between 20 and 200 (in font size points)',
        uniqueId: 'quiz_font_size',
        defaultUserFacingValue: '92',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(20, 200),
      },
      {
        userFacingName: 'Furigana font',
        description: 'This setting controls the font used for the furigana command.',
        allowedValuesDescription: fontAllowedValuesFields,
        uniqueId: 'furigana_font',
        defaultUserFacingValue: 'Noto Sans CJK',
        convertUserFacingValueToInternalValue: SettingsConverters.createMapConverter(
          fontForInput,
          true,
        ),
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.isMappable,
      },
      {
        userFacingName: 'Furigana font color',
        description: 'This setting controls the color of the text produced by the furigana command.',
        allowedValuesDescription: allowedColorsString,
        uniqueId: 'furigana_font_color',
        defaultUserFacingValue: 'rgb(192, 193, 194)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateHTMLColor,
      },
      {
        userFacingName: 'Furigana background color',
        description: 'This setting controls the background color of the text produced by the furigana command.',
        allowedValuesDescription: allowedColorsString,
        uniqueId: 'furigana_background_color',
        defaultUserFacingValue: 'rgb(54, 57, 62)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateHTMLColor,
      },
      {
        userFacingName: 'Furigana font size',
        description: 'This setting controls the font size of the main text of the furigana command. The size of the furigana text (above the main text) is this value divided by two.',
        allowedValuesDescription: 'A number between 10 and 80 (in font size points)',
        uniqueId: 'furigana_main_font_size',
        defaultUserFacingValue: '40',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(20, 80),
      },
    ],
  },
  {
    userFacingName: 'Dictionary',
    children:
    [
      {
        userFacingName: 'Display mode',
        description: 'This setting controls the default display mode for dictionary results. **big** shows multiple pages and multiple results per page. **small** only shows one result with up to three definitions.',
        allowedValuesDescription: 'Either **Big** or **Small**',
        uniqueId: 'dictionary/display_mode',
        serverOnly: false,
        defaultUserFacingValue: 'Big',
        convertUserFacingValueToInternalValue: SettingsConverters.toStringLowercase,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createDiscreteOptionValidator(['big', 'small']),
      },
    ],
  },
  {
    userFacingName: 'Shiritori',
    children:
    [
      {
        userFacingName: 'Bot score multiplier',
        description: 'The bot\'s score is multiplied by this number to handicap it.',
        allowedValuesDescription: 'A number between 0 and 1',
        uniqueId: 'shiritori/bot_score_multiplier',
        serverOnly: false,
        defaultUserFacingValue: '.7',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(0, 1),
      },
      {
        userFacingName: 'Bot turn minimum wait',
        description: 'This setting controls the minimum amount of time (in seconds) that the bot will wait before giving its answer.',
        allowedValuesDescription: 'A number between 1 and 30',
        uniqueId: 'shiritori/bot_turn_minimum_wait',
        serverOnly: false,
        defaultUserFacingValue: '2.75',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(1, 30),
      },
      {
        userFacingName: 'Bot turn maximum wait',
        description: 'This setting controls the maximum amount of time (in seconds) that the bot will wait before giving its answer.',
        allowedValuesDescription: 'A number between 1 and 30',
        uniqueId: 'shiritori/bot_turn_maximum_wait',
        serverOnly: false,
        defaultUserFacingValue: '4.75',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(1, 30),
      },
      {
        userFacingName: 'Answer time limit',
        description: 'This setting controls the amount of time (in seconds) that players have to give their answer. This does not apply to the bot player.',
        allowedValuesDescription: 'A number between 5 and 300',
        uniqueId: 'shiritori/answer_time_limit',
        serverOnly: false,
        defaultUserFacingValue: '40',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(5, 300),
      },
    ],
  },
  {
    userFacingName: 'Shiritori Forever',
    children:
    [
      {
        userFacingName: 'Shiritori Forever enabled',
        description: 'Control whether Shiritori Forever is enabled, and where. After you change the setting, you will be asked where to apply it.',
        allowedValuesDescription: 'Either **enabled** or **disabled**',
        uniqueId: 'shiritoriforever',
        userSetting: false,
        serverSetting: false,
        defaultUserFacingValue: 'Disabled',
        convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
        convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
        validateInternalValue: SettingsValidators.isBoolean,
        onChannelSettingChanged: onShiritoriForeverEnabledChanged,
      },
    ],
  },
];
