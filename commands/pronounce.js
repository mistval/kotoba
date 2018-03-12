'use strict'
const reload = require('require-reload')(require);
const getPronounceInfo = reload('./../kotoba/get_pronounce_info.js');
const constants = reload('./../kotoba/constants.js');
const NavigationChapter = reload('monochrome-bot').NavigationChapter;
const Navigation = reload('monochrome-bot').Navigation;
const navigationManager = reload('monochrome-bot').navigationManager;
const NavigationPage = reload('monochrome-bot').NavigationPage;
const logger = reload('monochrome-bot').logger;

const MAX_AUDIO_CLIPS = 4;
const NAVIGATION_EXPIRATION_TIME = 1000 * 60 * 30; // 30 minutes
const LOGGER_TITLE = 'PRONOUNCE';

function createEmbedContent() {
  return {
    embed: {
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

function createNotFoundResult(msg, pronounceInfo) {
  let content = createEmbedContent();
  let query = pronounceInfo.query;
  content.embed.description = `I didn't find any results for **${query}**.`;

  return msg.channel.createMessage(content, null, msg);
}

function createNoSuffixResult(msg) {
  let content = createEmbedContent();
  content.embed.description = 'Say **k!pronounce [word]** to see pronunciation information for a word. For example: **k!pronounce 瞬間**';

  return msg.channel.createMessage(content, null, msg);
}

function underlineStringAtTrueIndices(string, indices) {
  let underline = false;
  let outString = '';
  for (let i = 0; i < string.length; ++i) {
    let char = string[i];
    let shouldUnderline = indices[i];
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
  return pronounceInfo.pitchAccent.map(bool => bool ? 'H' : 'L').join('  ');
}

function addPitchField(fields, pronounceInfo) {
  if (pronounceInfo.pitchAccent.length > 0) {
    let katakana = pronounceInfo.katakana;
    let underlinedKana = underlineStringAtTrueIndices(katakana, pronounceInfo.pitchAccent);
    let lhString = createLHString(pronounceInfo);
    let fieldValue = `${underlinedKana}\n ${lhString}`;
    fields.push({
      name: 'Pitch',
      value: fieldValue,
      inline: true,
    });
  }
}

function addMutedSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.noPronounceIndices.length > 0) {
    let katakana = pronounceInfo.katakana;
    fields.push({
      name: 'Muted sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.noPronounceIndices),
      inline: true,
    });
  }
}

function addNasalSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.nasalPitchIndices.length > 0) {
    let katakana = pronounceInfo.katakana;
    fields.push({
      name: 'Nasal sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.nasalPitchIndices),
      inline: true,
    });
  }
}

function addAudioClipsField(fields, forvoData) {
  if (forvoData.found) {
    let audioClips = forvoData.audioClips;
    let audioClipsString = audioClips.slice(0, MAX_AUDIO_CLIPS).map(audioClip => {
      return `:musical_note:  [**${audioClip.userName}**, ${audioClip.gender} from ${audioClip.country}](${audioClip.forvoUri})`;
    }).join('\n');

    fields.push({
      name: 'Audio Clips',
      value: audioClipsString,
    });
  }
}

class PronunciationDataSource {
  constructor(authorName, pronounceInfo) {
    this.pronounceInfo_ = pronounceInfo;
    this.authorName_ = authorName;
  }

  prepareData() {
  }

  getWordForTitle(entry) {
    if (entry.kanji.indexOf(this.pronounceInfo_.query) !== -1) {
      return this.pronounceInfo_.query;
    }
    return entry.kanji[0];
  }

  async getPageFromPreparedData(arg, pageIndex) {
    let entry = this.pronounceInfo_.entries[pageIndex];
    let numberOfPages = this.pronounceInfo_.entries.length;
    if (!entry) {
      return;
    }

    let pagesString = '';
    if (numberOfPages > 1) {
      pagesString = `(page ${pageIndex + 1} of ${numberOfPages})`;
    }

    let content = createEmbedContent();
    let embed = content.embed;
    let word = this.getWordForTitle(entry);
    let uriEncodedWord = encodeURIComponent(word);
    embed.title = `Pronunciation information for ${word} ${pagesString}`;
    embed.url = `http://www.gavo.t.u-tokyo.ac.jp/ojad/search/index/word:${uriEncodedWord}`;

    embed.fields = [];
    addPitchField(embed.fields, entry);
    addMutedSoundsField(embed.fields, entry);
    addNasalSoundsField(embed.fields, entry);

    try {
      let audioClips = await entry.getAudioClips();
      addAudioClipsField(embed.fields, audioClips, this.pronounceInfo_);
    } catch (err) {
      logger.logFailure(LOGGER_TITLE, `Error getting forvo info for ${word}`, err);
    }

    if (numberOfPages > 1) {
      embed.footer = {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${this.authorName_} can use the reaction buttons below to see more information!`,
      };
    }

    return new NavigationPage(content);
  }
}

function createFoundResult(msg, pronounceInfo) {
  let navigationDataSource = new PronunciationDataSource(msg.author.username, pronounceInfo);
  let navigationChapter = new NavigationChapter(navigationDataSource);
  let chapterForEmojiName = {a: navigationChapter};
  let hasMultiplePages = pronounceInfo.entries.length > 1;
  let authorId = msg.author.id;
  let navigation = new Navigation(authorId, hasMultiplePages, 'a', chapterForEmojiName);
  return navigationManager.register(navigation, NAVIGATION_EXPIRATION_TIME, msg);
}

module.exports = {
  commandAliases: ['k!pronounce', 'k!p'],
  canBeChannelRestricted: true,
  cooldown: 5,
  uniqueId: 'pronounce30294',
  shortDescription: 'Look up information about how to pronounce a Japanese word.',
  usageExample: 'k!pronounce 瞬間',
  action: async function(bot, msg, suffix) {
    if (!suffix) {
      return createNoSuffixResult(msg);
    }

    let pronounceInfo = await getPronounceInfo(suffix);
    if (!pronounceInfo.found) {
      return createNotFoundResult(msg, pronounceInfo);
    }

    return createFoundResult(msg, pronounceInfo);
  },
};
