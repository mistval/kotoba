const assert = require('assert');
const state = require('./../common/static_state.js');
const globals = require('./../common/globals.js');

const VOICE_CHANNEL_TYPE = 2;

state.audioConnectionManager = state.audioConnectionManager || {
  connectionInfoForServerId: {},
};

function hasConnection(serverId) {
  return !!state.audioConnectionManager.connectionInfoForServerId[serverId];
}

function subscribeEvents(voiceConnection) {
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

async function openConnection(voiceChannel) {
  const serverId = voiceChannel.guild.id;
  assert(!hasConnection(serverId));
  const connectionInformation = {};
  state.audioConnectionManager.connectionInfoForServerId[serverId] = connectionInformation;

  try {
    const voiceConnection = await voiceChannel.join();
    subscribeEvents(voiceConnection);
    connectionInformation.connection = voiceConnection;
    connectionInformation.voiceChannel = voiceChannel;
  } catch (err) {
    delete state.audioConnectionManager.connectionInfoForServerId[serverId];
    throw err;
  }
}

function closeConnection(serverId) {
  if (!hasConnection(serverId)) {
    return;
  }

  const connectionInformation = state.audioConnectionManager.connectionInfoForServerId[serverId];
  return connectionInformation.voiceChannel.leave();
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
  assert(hasConnection(serverId));
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

function getVoiceChannelForMessageAuthor(msg) {
  const guild = msg.channel.guild;
  if (!guild) {
    return undefined;
  }

  const voiceChannels = guild.channels.filter(channel => channel.type === VOICE_CHANNEL_TYPE);
  const userVoiceChannel = voiceChannels.find(channel => channel.voiceMembers.get(msg.author.id));

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
  openConnection,
  hasConnection,
  getVoiceChannelForMessageAuthor,
  getConnectedVoiceChannelForServerId,
  getChannelsCanTalkIn,
};
