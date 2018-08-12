const assert = require('assert');
const state = require('./../common/static_state.js');
const globals = require('./../common/globals.js');
const reload = require('require-reload')(require);

const constants = reload('./../common/constants.js');
const { throwPublicErrorFatal } = reload('./../common/util/errors.js');

const VOICE_CHANNEL_TYPE = 2;
const EMBED_TITLE = 'Audio';
const ERROR_LOG_TITLE = 'AUDIO';

state.audioConnectionManager = state.audioConnectionManager || {
  connectionInfoForServerId: {},
};

function hasConnectionInServer(serverId) {
  return !!state.audioConnectionManager.connectionInfoForServerId[serverId];
}

function closeConnection(serverId) {
  if (!hasConnectionInServer(serverId)) {
    return;
  }

  const connectionInfo = state.audioConnectionManager.connectionInfoForServerId[serverId];
  return connectionInfo.voiceChannel.leave();
}

function subscribeEvents(voiceConnection, serverId) {
  voiceConnection.on('warn', message => {
    globals.logger.logFailure('VOICE', `Warning: ${message}`);
  });
  voiceConnection.on('error', message => {
    globals.logger.logFailure('VOICE', `Error: ${message}`);
  });
  voiceConnection.on('connect', () => {
    globals.logger.logSuccess('VOICE', 'Connected');
  });
  voiceConnection.on('disconnect', () => {
    globals.logger.logFailure('VOICE', `Disconnected`);
    delete state.audioConnectionManager.connectionInfoForServerId[voiceConnection.id];
  });
}

async function openConnectionFromMessage(bot, msg) {
  if (!msg.channel.guild) {
    return throwPublicErrorFatal(EMBED_TITLE, 'A voice connection is required for that, but I can\'t connect to voice in a DM. Please try again in a server.', 'No voice in DM');
  }

  const serverId = msg.channel.guild.id;
  if (hasConnectionInServer(serverId)) {
    return throwPublicErrorFatal(EMBED_TITLE, 'A voice connection is required for that, but I already have an active voice connection in this server. I can only have one voice connection per server.', 'Already in voice');
  }

  const voiceChannel = getVoiceChannelForUser(msg.channel.guild, msg.author.id)
  if (!voiceChannel) {
    return throwPublicErrorFatal('Audio', 'A voice connection is required for that. Please enter a voice channel and try again.', 'User not in voice');
  }

  const channelsCanTalkIn = getChannelsCanTalkIn(msg.channel.guild, bot.user);
  if (channelsCanTalkIn.indexOf(voiceChannel) === -1) {
    const channelsCanTalkInString = channelsCanTalkIn.map(channel => `**<#${channel.id}>**`).join(' ');
    return throwPublicErrorFatal('Audio', `I either don\'t have permission to join your voice channel, or I don\'t have permission to talk in it. I'm allowed to talk in the following voice channels: ${channelsCanTalkInString ? channelsCanTalkInString : '**None**'}`, 'Lack voice permission');
  }

  const connectionInformation = {};
  state.audioConnectionManager.connectionInfoForServerId[serverId] = connectionInformation;

  try {
    const voiceConnection = await voiceChannel.join();
    subscribeEvents(voiceConnection, serverId);
    connectionInformation.connection = voiceConnection;
    connectionInformation.voiceChannel = voiceChannel;
  } catch (err) {
    delete state.audioConnectionManager.connectionInfoForServerId[serverId];
    throw err;
  }

  return msg.channel.createMessage({
    embed: {
      title: EMBED_TITLE,
      description: `Connected to voice channel <#${voiceChannel.id}>`,
      color: constants.EMBED_CORRECT_COLOR,
    },
  }).catch(err => {
    // We're connected but couldn't say so. Swallow the error.
  });
}

function stopPlaying(serverId) {
  const connectionInformation = state.audioConnectionManager.connectionInfoForServerId[serverId];
  if (!connectionInformation) {
    return;
  }
  const { connection } = connectionInformation;
  connection.stopPlaying();
}

function play(serverId, resource) {
  assert(hasConnectionInServer(serverId));
  const connectionInformation = state.audioConnectionManager.connectionInfoForServerId[serverId];
  const { connection } = connectionInformation;
  stopPlaying(serverId);
  return connection.play(resource);
}

function getConnectedVoiceChannelForServerId(serverId) {
  const connectionInformation = state.audioConnectionManager.connectionInfoForServerId[serverId];
  if (!connectionInformation) {
    return undefined;
  }

  return connectionInformation.voiceChannel;
}

function getVoiceChannelForUser(guild, userId) {
  const voiceChannels = guild.channels.filter(channel => channel.type === VOICE_CHANNEL_TYPE);
  const userVoiceChannel = voiceChannels.find(channel => channel.voiceMembers.get(userId));

  return userVoiceChannel;
}

function userCanJoinAndTalk(voiceChannel, user) {
  const permissions = voiceChannel.permissionsOf(user.id).json;
  return permissions.voiceConnect && permissions.voiceSpeak;
}

function getChannelsCanTalkIn(guild, user) {
  const voiceChannels = guild.channels.filter(channel => channel.type === VOICE_CHANNEL_TYPE);
  return voiceChannels.filter(channel => userCanJoinAndTalk(channel, user));
}

module.exports = {
  play,
  stopPlaying,
  closeConnection,
  openConnectionFromMessage,
  getConnectedVoiceChannelForServerId,
};
