const assert = require('assert');
const globals = require('./../common/globals.js');

const constants = require('./../common/constants.js');
const { throwPublicErrorFatal } = require('./../common/util/errors.js');

const VOICE_CHANNEL_TYPE = 2;
const EMBED_TITLE = 'Audio';

function hasConnectionInServer(bot, serverId) {
  return !!bot.voiceConnections.get(serverId);
}

function userCanJoinAndTalk(voiceChannel, user) {
  const permissions = voiceChannel.permissionsOf(user.id).json;
  return permissions.voiceConnect && permissions.voiceSpeak;
}

function getChannelsCanTalkIn(guild, user) {
  const voiceChannels = guild.channels.filter(channel => channel.type === VOICE_CHANNEL_TYPE);
  return voiceChannels.filter(channel => userCanJoinAndTalk(channel, user));
}

function getVoiceChannelForUser(guild, userId) {
  const voiceChannels = guild.channels.filter(channel => channel.type === VOICE_CHANNEL_TYPE);
  const userVoiceChannel = voiceChannels.find(channel => channel.voiceMembers.get(userId));

  return userVoiceChannel;
}

function subscribeEvents(voiceConnection) {
  voiceConnection.on('warn', (message) => {
    globals.logger.warn({
      event: 'VOICE WARNING',
      detail: message,
    });
  });
  voiceConnection.on('error', (message) => {
    globals.logger.error({
      event: 'VOICE ERROR',
      detail: message,
    });
  });
  voiceConnection.on('disconnect', () => {
    globals.logger.info({
      event: 'VOICE DISCONNECT',
      detail: voiceConnection.id,
    });
  });
}

class AudioConnection {
  constructor(bot, msg, voiceChannel) {
    this.bot = bot;
    this.msg = msg;
    this.voiceChannel = voiceChannel;
  }

  static async getOrCreateConnection(bot, serverId, voiceChannel) {
    const connection = bot.voiceConnections.get(serverId);
    if (connection && connection.channelID) {
      assert(connection.channelID === voiceChannel.id, 'We\'re connected, but to the wrong channel.');
      return connection;
    }

    try {
      await bot.guilds.get(serverId).leaveVoiceChannel();
      const voiceConnection = await voiceChannel.join();
      subscribeEvents(voiceConnection);
      return voiceConnection;
    } catch (err) {
      await bot.guilds.get(serverId).leaveVoiceChannel().catch((disconnectErr) => {
        globals.logger.error({
          event: 'VOICE WARNING',
          detail: 'Failed to disconnect from voice.',
          err: disconnectErr,
        });
      });

      globals.logger.warn({
        event: 'VOICE WARNING',
        detail: 'Failed to connect to voice.',
        err,
      });

      throw err;
    }
  }

  static async create(bot, msg) {
    if (!msg.channel.guild) {
      return throwPublicErrorFatal(EMBED_TITLE, 'A voice connection is required for that, but I can\'t connect to voice in a DM. Please try again in a server.', 'No voice in DM');
    }

    const serverId = msg.channel.guild.id;
    if (hasConnectionInServer(bot, serverId)) {
      return throwPublicErrorFatal(EMBED_TITLE, 'A voice connection is required for that, but I already have an active voice connection in this server. I can only have one voice connection per server.', 'Already in voice');
    }

    const voiceChannel = getVoiceChannelForUser(msg.channel.guild, msg.author.id);
    if (!voiceChannel) {
      return throwPublicErrorFatal('Audio', 'A voice connection is required for that. Please enter a voice channel and try again.', 'User not in voice');
    }

    const channelsCanTalkIn = getChannelsCanTalkIn(msg.channel.guild, bot.user);
    if (channelsCanTalkIn.indexOf(voiceChannel) === -1) {
      const channelsCanTalkInString = channelsCanTalkIn.map(channel => `**<#${channel.id}>**`).join(' ');
      return throwPublicErrorFatal('Audio', `I either don't have permission to join your voice channel, or I don't have permission to talk in it. I'm allowed to talk in the following voice channels: ${channelsCanTalkInString || '**None**'}`, 'Lack voice permission');
    }

    await AudioConnection.getOrCreateConnection(bot, msg.channel.guild.id, voiceChannel);

    try {
      await msg.channel.createMessage({
        embed: {
          title: EMBED_TITLE,
          description: `Connected to voice channel <#${voiceChannel.id}>`,
          color: constants.EMBED_CORRECT_COLOR,
        },
      });
    } catch (err) {
      globals.logger.warn({
        event: 'VOICE WARNING',
        detail: 'Could not send connect confirmation message.',
        err,
      });
    }

    return new AudioConnection(bot, msg, voiceChannel);
  }

  async stopPlaying() {
    const voiceConnection = await AudioConnection.getOrCreateConnection(
      this.bot,
      this.msg.channel.guild.id,
      this.voiceChannel,
    );

    return voiceConnection.stopPlaying();
  }

  async play(resource) {
    await this.stopPlaying();

    const voiceConnection = await AudioConnection.getOrCreateConnection(
      this.bot,
      this.msg.channel.guild.id,
      this.voiceChannel,
    );

    return voiceConnection.play(resource);
  }

  getVoiceChannel() {
    return this.voiceChannel;
  }

  close() {
    return this.msg.channel.guild.leaveVoiceChannel();
  }
}

module.exports = AudioConnection;
