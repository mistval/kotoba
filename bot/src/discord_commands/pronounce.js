const {
  Permissions, PaginatedMessage, ApplicationContexts, ApplicationIntegrationTypes,
} = require('monochrome-bot');
const getPronounceInfo = require('../common/get_pronounce_info.js');
const { throwPublicErrorInfo } = require('../common/util/errors.js');
const constants = require('../common/constants.js');

const MAX_AUDIO_CLIPS = 6;

const smallKatakana = ['ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ャ', 'ュ', 'ョ', 'ッ'];

function createEmbedContent() {
  return {
    embeds: [
      {
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    ],
  };
}

function createNotFoundResult(msg, pronounceInfo) {
  const content = createEmbedContent();
  const { query } = pronounceInfo;
  content.embeds[0].description = `I didn't find any results for **${query}**.`;

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
  let str = '';
  for (let i = 0; i < pronounceInfo.pitchAccent.length; i += 1) {
    const katakana = pronounceInfo.katakana[i];

    if (smallKatakana.indexOf(katakana) === -1) {
      const pitch = pronounceInfo.pitchAccent[i];
      str += pitch ? 'Ｈ' : 'Ｌ';
    } else {
      str += '　';
    }
  }

  return str;
}

function getPitchPattern(pronounceInfo) {
  const alternatives = {
    heio: '平板 / 尾高 \nHeiban / Odaka',
    naka: '中高 \nNakadaka',
    atama: '頭高 \nAtamadaka',
  };
  const pitch = pronounceInfo.pitchAccent; // 食べる -> たべる -> Low High Low -> [False, True, False]
  if (!pitch[0]) {
    delete alternatives.atama;
    Object.entries(pitch).forEach(([index, element]) => {
      const i = parseInt(index, 10);

      if (i > 0 && !element) {
        delete alternatives.heio;
      } else if (i === pitch.length && !element) {
        delete alternatives.naka;
      }
    });
  } else {
    delete alternatives.heio;
    delete alternatives.naka;
  }
  return Object.values(alternatives)[0];
}

function addPitchField(fields, pronounceInfo) {
  if (pronounceInfo.hasPitchData && pronounceInfo.pitchAccent.length > 0) {
    const pitchPattern = getPitchPattern(pronounceInfo);
    const { katakana } = pronounceInfo;
    const underlinedKana = underlineStringAtTrueIndices(
      katakana,
      pronounceInfo.pitchAccent,
    );
    const lhString = createLHString(pronounceInfo);
    const fieldValue = `${underlinedKana}\n ${lhString}`;
    fields.push({
      name: 'Pitch',
      value: fieldValue,
      inline: true,
    });
    fields.push({
      name: 'Pattern',
      value: pitchPattern,
      inline: true,
    });
  }
}
function addMutedSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.hasPitchData && pronounceInfo.noPronounceIndices.length > 0) {
    const { katakana } = pronounceInfo;
    fields.push({
      name: 'Muted sounds',
      value: underlineStringAtTrueIndices(
        katakana,
        pronounceInfo.noPronounceIndices,
      ),
      inline: true,
    });
  }
}

function addNasalSoundsField(fields, pronounceInfo) {
  if (
    pronounceInfo.hasPitchData
    && pronounceInfo.nasalPitchIndices.length > 0
  ) {
    const { katakana } = pronounceInfo;
    fields.push({
      name: 'Nasal sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.nasalPitchIndices),
      inline: true,
    });
  }
}

function addAudioClipsField(fields, forvoData) {
  if (forvoData && forvoData.found) {
    const { audioClips } = forvoData;
    const audioClipsString = audioClips
      .slice(0, MAX_AUDIO_CLIPS)
      .map(
        (audioClip) => `:musical_note:  [**${audioClip.userName}**, ${audioClip.gender} from ${audioClip.country}](${audioClip.forvoUri})`,
      )
      .join('\n');

    fields.push({
      name: 'Audio Clips',
      value: audioClipsString,
    });
  }
}

class PronunciationDataSource {
  constructor(pronounceInfo, logger) {
    this.pronounceInfo = pronounceInfo;
    this.logger = logger;
  }

  prepareData() {
    // NOOP
  }

  getWordForTitle(entry) {
    if (entry.hasPitchData) {
      if (entry.kanji[0] !== entry.kanji[1]) {
        return `${entry.kanji[0]} (${entry.kanji[1]})`;
      }
      return entry.kanji[0];
    }

    return this.pronounceInfo.query;
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
    const { embeds } = content;
    const word = this.getWordForTitle(entry);
    const uriEncodedWord = encodeURIComponent(word);
    embeds[0].title = `${word} ${pagesString}`;

    if (entry.hasPitchData) {
      embeds[0].url = `http://www.gavo.t.u-tokyo.ac.jp/ojad/search/index/word:${uriEncodedWord}`;
    }

    embeds[0].fields = [];
    addPitchField(embeds[0].fields, entry);
    addMutedSoundsField(embeds[0].fields, entry);
    addNasalSoundsField(embeds[0].fields, entry);

    let forvoData;

    if (entry.forvoData) {
      ({ forvoData } = entry);
    } else if (entry.getAudioClips) {
      try {
        forvoData = await entry.getAudioClips();
      } catch (err) {
        this.logger.error({
          event: 'FAILED TO GET FORVO AUDIO CLIPS',
          detail: word,
          err,
        });
      }
    }

    addAudioClipsField(embeds[0].fields, forvoData, this.pronounceInfo);

    return content;
  }
}

function createFoundResult(suffix, msg, pronounceInfo, logger) {
  const navigationDataSource = new PronunciationDataSource(
    pronounceInfo,
    logger,
  );

  const chapters = [
    {
      title: '',
      maxPages: pronounceInfo.entries.length,
      getPages: (i) => navigationDataSource.getPageFromPreparedData(undefined, i),
    },
  ];

  const interactiveMessageId = `pronounce_"${suffix}"`;
  return PaginatedMessage.sendAsMessageReply(msg, chapters, {
    id: interactiveMessageId,
  });
}

module.exports = {
  commandAliases: ['pronounce', 'p'],
  canBeChannelRestricted: true,
  cooldown: 5,
  uniqueId: 'pronounce30294',
  shortDescription:
    'Look up information about how to pronounce a Japanese word.',
  usageExample: '<prefix>pronounce 瞬間',
  requiredBotPermissions: [
    Permissions.attachFiles,
    Permissions.embedLinks,
    Permissions.sendMessages,
  ],
  interaction: {
    contexts: [
      ApplicationContexts.GUILD,
      ApplicationContexts.BOT_DM,
      ApplicationContexts.PRIVATE_CHANNEL],
    integrationTypes: [
      ApplicationIntegrationTypes.GUILD_INSTALL,
      ApplicationIntegrationTypes.USER_INSTALL,
    ],
    compatibilityMode: true,
    options: [
      {
        name: 'word',
        description: 'The word to search for',
        type: 3,
        required: true,
      },
    ],
  },
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo(
        'Pronounce',
        `Say **${prefix}pronounce [word]** to see pronunciation information for a word. For example: **${prefix}pronounce 瞬間**`,
        'No suffix',
      );
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const logger = monochrome.getLogger();
    const pronounceInfo = await getPronounceInfo(suffix, logger);
    if (!pronounceInfo.found) {
      return createNotFoundResult(msg, pronounceInfo);
    }

    return createFoundResult(suffix, msg, pronounceInfo, logger);
  },
};
