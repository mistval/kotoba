'use strict'
const reload = require('require-reload')(require);
const getPronounceInfo = reload('./../kotoba/get_pronounce_info.js');
const constants = reload('./../kotoba/constants.js');

const MAX_AUDIO_CLIPS = 6;

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
    });
  }
}

function addMutedSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.noPronounceIndices.length > 0) {
    let katakana = pronounceInfo.katakana;
    fields.push({
      name: 'Muted sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.noPronounceIndices),
    });
  }
}

function addNasalSoundsField(fields, pronounceInfo) {
  if (pronounceInfo.nasalPitchIndices.length > 0) {
    let katakana = pronounceInfo.katakana;
    fields.push({
      name: 'Nasal sounds',
      value: underlineStringAtTrueIndices(katakana, pronounceInfo.nasalPitchIndices),
    });
  }
}

function addAudioClipsField(fields, pronounceInfo) {
  if (pronounceInfo.audioClips) {
    let audioClipsString = pronounceInfo.audioClips.slice(0, MAX_AUDIO_CLIPS).map(audioClip => {
      return `:musical_note:  [**${audioClip.userName}**, ${audioClip.gender} from ${audioClip.country}](${pronounceInfo.forvoUri})`;
    }).join('\n');

    fields.push({
      name: 'Audio Clips',
      value: audioClipsString,
    });
  }
}

function createFoundResult(msg, pronounceInfo) {
  let content = createEmbedContent();
  let embed = content.embed;
  let query = pronounceInfo.query;
  let uriEncodedQuery = encodeURIComponent(query);

  embed.title = `Pronunciation information for ${pronounceInfo.query}`;
  embed.url = `http://www.gavo.t.u-tokyo.ac.jp/ojad/search/index/word:${uriEncodedQuery}`;
  embed.description = `Class [${pronounceInfo.pitchAccentClass}](http://www.sanseido-publ.co.jp/publ/dicts/daijirin_ac.html) pitch accent`;

  embed.fields = [];
  addPitchField(embed.fields, pronounceInfo);
  addMutedSoundsField(embed.fields, pronounceInfo);
  addNasalSoundsField(embed.fields, pronounceInfo);
  addAudioClipsField(embed.fields, pronounceInfo);

  return msg.channel.createMessage(content, null, msg);
}

module.exports = {
  commandAliases: ['k!pronounce', 'k!p'],
  canBeChannelRestricted: true,
  cooldown: 5,
  uniqueId: 'pronounce30294',
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
