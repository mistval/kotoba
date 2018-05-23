const reload = require('require-reload')(require);

const getPronounceInfo = reload('./../common/get_pronounce_info.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');
const constants = reload('./../common/constants.js');
const {
  NavigationChapter,
  Navigation,
  NavigationPage,
} = reload('monochrome-bot');

const MAX_AUDIO_CLIPS = 4;
const LOGGER_TITLE = 'PRONOUNCE';

function createEmbedContent() {
  return {
    embed: {
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

function createNotFoundResult(msg, pronounceInfo) {
  const content = createEmbedContent();
  const { query } = pronounceInfo;
  content.embed.description = `I didn't find any results for **${query}**.`;

  return msg.channel.createMessage(content, null, msg);
}

function underlineStringAtTrueIndices(string, indices) {
  let underline = false;
  let outString = '';
  for (let i = 0; i < string.length; i += 1) {
    const char = string[i];
    const shouldUnderline = indices[i];
    if (shouldUnderline === underline) {
      outString += char;
    } else if (!shouldUnderline && underline) {
      outString += `**__${char}`;
      underline = false;
    } else if (shouldUnderline && !underline) {
      outString += `__**${char}`;
      underline = true;
    }
  }

  if (underline) {
    outString += '**__';
  }

  return outString;
}

function createLHString(pronounceInfo) {
  return pronounceInfo.pitchAccent.map(bool => (bool ? 'H' : 'L')).join('  ');
}

function addPitchField(fields, pronounceInfo) {
  if (pronounceInfo.pitchAccent.length > 0) {
    const { katakana } = pronounceInfo;
    const underlinedKana = underlineStringAtTrueIndices(katakana, pronounceInfo.pitchAccent);
    const lhString = createLHString(pronounceInfo);
    const fieldValue = `${underlinedKana}\n ${lhString}`;
    fields.push({
      name: 'Pitch',
      value: fieldValue,
      inline: true,
    });
  }
}

function addMutedSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.noPronounceIndices.length > 0) {
    const { katakana } = pronounceInfo;
    fields.push({
      name: 'Muted sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.noPronounceIndices),
      inline: true,
    });
  }
}

function addNasalSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.nasalPitchIndices.length > 0) {
    const { katakana } = pronounceInfo;
    fields.push({
      name: 'Nasal sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.nasalPitchIndices),
      inline: true,
    });
  }
}

function addAudioClipsField(fields, forvoData) {
  if (forvoData.found) {
    const { audioClips } = forvoData;
    const audioClipsString = audioClips.slice(0, MAX_AUDIO_CLIPS)
      .map(audioClip => `:musical_note:  [**${audioClip.userName}**, ${audioClip.gender} from ${audioClip.country}](${audioClip.forvoUri})`).join('\n');

    fields.push({
      name: 'Audio Clips',
      value: audioClipsString,
    });
  }
}

class PronunciationDataSource {
  constructor(authorName, pronounceInfo, logger) {
    this.pronounceInfo = pronounceInfo;
    this.authorName = authorName;
    this.logger = logger;
  }

  prepareData() {
    // NOOP
  }

  getWordForTitle(entry) {
    if (entry.kanji[0] !== entry.kanji[1]) {
      return `${entry.kanji[0]} (${entry.kanji[1]})`;
    }
    return entry.kanji[0];
  }

  async getPageFromPreparedData(arg, pageIndex) {
    const entry = this.pronounceInfo.entries[pageIndex];
    const numberOfPages = this.pronounceInfo.entries.length;
    if (!entry) {
      return undefined;
    }

    let pagesString = '';
    if (numberOfPages > 1) {
      pagesString = `(page ${pageIndex + 1} of ${numberOfPages})`;
    }

    const content = createEmbedContent();
    const { embed } = content;
    const word = this.getWordForTitle(entry);
    const uriEncodedWord = encodeURIComponent(word);
    embed.title = `${word} ${pagesString}`;
    embed.url = `http://www.gavo.t.u-tokyo.ac.jp/ojad/search/index/word:${uriEncodedWord}`;

    embed.fields = [];
    addPitchField(embed.fields, entry);
    addMutedSoundsField(embed.fields, entry);
    addNasalSoundsField(embed.fields, entry);

    try {
      const forvoData = await entry.getAudioClips();
      addAudioClipsField(embed.fields, forvoData, this.pronounceInfo);
    } catch (err) {
      this.logger.logFailure(LOGGER_TITLE, `Error getting forvo info for ${word}`, err);
    }

    if (numberOfPages > 1) {
      embed.footer = {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${this.authorName} can use the reaction buttons below to see more information!`,
      };
    }

    return new NavigationPage(content);
  }
}

function createFoundResult(msg, pronounceInfo, navigationManager, logger) {
  const navigationDataSource = new PronunciationDataSource(msg.author.username, pronounceInfo, logger);
  const navigationChapter = new NavigationChapter(navigationDataSource);
  const chapterForEmojiName = { a: navigationChapter };
  const hasMultiplePages = pronounceInfo.entries.length > 1;
  const authorId = msg.author.id;
  const navigation = new Navigation(authorId, hasMultiplePages, 'a', chapterForEmojiName);
  return navigationManager.register(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg);
}

module.exports = {
  commandAliases: ['k!pronounce', 'k!p'],
  canBeChannelRestricted: true,
  cooldown: 5,
  uniqueId: 'pronounce30294',
  shortDescription: 'Look up information about how to pronounce a Japanese word.',
  usageExample: 'k!pronounce 瞬間',
  async action(erisBot, msg, suffix, monochrome) {
    if (!suffix) {
      return throwPublicErrorInfo('Pronounce', 'Say **k!pronounce [word]** to see pronunciation information for a word. For example: **k!pronounce 瞬間**', 'No suffix');
    }

    const pronounceInfo = await getPronounceInfo(suffix);
    if (!pronounceInfo.found) {
      return createNotFoundResult(msg, pronounceInfo);
    }

    return createFoundResult(msg, pronounceInfo, monochrome.getNavigationManager(), monochrome.getLogger());
  },
};
