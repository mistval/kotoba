const globals = require('../common/globals.js');
const constants = require('../common/constants.js');
const { throwPublicErrorFatal } = require('../common/util/errors.js');

const VOICE_CHANNEL_TYPE = 2;
const STAGE_CHANNEL_TYPE = 13;
const EMBED_TITLE = 'Audio';

function hasConnectionInServer(bot, serverId) {
  return !!bot.voiceConnections.get(serverId);
}

function userCanJoinAndTalk(voiceChannel, user) {
  const permissions = voiceChannel.permissionsOf(user.id).json;
  return permissions.voiceConnect && permissions.voiceSpeak;
}

function getChannelsCanTalkIn(guild, user) {
  const voiceChannels = guild.channels.filter((channel) => channel.type === VOICE_CHANNEL_TYPE);
  return voiceChannels.filter((channel) => userCanJoinAndTalk(channel, user));
}

function getVoiceChannelForUser(guild, userId) {
  const voiceChannels = guild.channels.filter(
    (channel) => channel.type === VOICE_CHANNEL_TYPE || channel.type === STAGE_CHANNEL_TYPE,
  );

  const userVoiceChannel = voiceChannels.find((channel) => channel.voiceMembers.get(userId));

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

function isStageChannel(bot, connection) {
  const guild = bot.guilds.get(connection.id);
  return guild?.channels.get(connection.channelID)?.type !== STAGE_CHANNEL_TYPE;
}

function isUsableConnection(bot, connection) {
  return connection
    && connection.channelID
    && isStageChannel(bot, connection);
}

class AudioConnection {
  constructor(bot, msg, voiceChannel) {
    this.bot = bot;
    this.msg = msg;
    this.initialVoiceChannel = voiceChannel;
  }

  static async getOrCreateConnection(bot, serverId, voiceChannel) {
    const connection = bot.voiceConnections.get(serverId);
    if (isUsableConnection(bot, connection)) {
      return connection;
    }

    try {
      bot.guilds.get(serverId).leaveVoiceChannel();
      const voiceConnection = await voiceChannel.join();
      subscribeEvents(voiceConnection);
      return voiceConnection;
    } catch (err) {
      bot.guilds.get(serverId).leaveVoiceChannel();

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

    if (voiceChannel.type === STAGE_CHANNEL_TYPE) {
      return throwPublicErrorFatal('Audio', 'I cannot join stage channels. Please use a normal voice channel.', 'Stage channel');
    }

    const channelsCanTalkIn = getChannelsCanTalkIn(msg.channel.guild, bot.user);
    if (channelsCanTalkIn.indexOf(voiceChannel) === -1) {
      const channelsCanTalkInString = channelsCanTalkIn.map((channel) => `**<#${channel.id}>**`).join(' ');
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
      this.initialVoiceChannel,
    );

    return voiceConnection.stopPlaying();
  }

  async play(resource) {
    await this.stopPlaying();

    const voiceConnection = await AudioConnection.getOrCreateConnection(
      this.bot,
      this.msg.channel.guild.id,
      this.initialVoiceChannel,
    );

    return voiceConnection.play(resource);
  }

  async getVoiceChannel() {
    const voiceConnection = await AudioConnection.getOrCreateConnection(
      this.bot,
      this.msg.channel.guild.id,
      this.initialVoiceChannel,
    );

    const guildId = voiceConnection.id;
    const channelId = voiceConnection.channelID;
    return this.bot.guilds.get(guildId).channels.get(channelId);
  }

  close() {
    return this.msg.channel.guild.leaveVoiceChannel();
  }
}

module.exports = AudioConnection;
