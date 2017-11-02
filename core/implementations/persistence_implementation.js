'use strict'
const reload = require('require-reload')(require);
const storage = require('./../util/node_persist_atomic.js');

const USER_DATA_KEY_PREFIX = 'User';
const SERVER_DATA_KEY_PREFIX = 'Server';
const GLOBAL_DATA_KEY = 'Global';
const ALLOWED_CHANNELS_FOR_COMMAND_KEY = 'AllowedChannelsForCommand';

function getData(key) {
  return storage.getItem(key).then(data => {
    if (data) {
      return data;
    } else {
      return {};
    }
  });
}

function editData(key, editFunction) {
  return storage.editItem(key, data => {
    if (!data) {
      data = {};
    }
    return editFunction(data);
  });
}

function keyForUserId(userId) {
  return USER_DATA_KEY_PREFIX + userId;
}

function keyForServerId(serverId) {
  return SERVER_DATA_KEY_PREFIX + serverId;
}

class PersistenceImplementation {
  static getDataForUser(userId, persistenceState) {
    return getData(keyForUserId(userId));
  }

  static getDataForServer(serverId, persistenceState) {
    return getData(keyForServerId(serverId));
  }

  static getGlobalData(persistenceState) {
    return getData(GLOBAL_DATA_KEY);
  }

  static getAllowedChannelsForCommand(msg, commandId, persistenceState) {
    if (!msg.channel.guild) {
      return Promise.reject(new Error('Trying to get allowed channels in a DM channel. Can\t do that.'));
    }

    return PersistenceImplementation.getDataForServer(msg.channel.guild.id, persistenceState).then(data => {
      if (data) {
        let allowedChannelsForCommand = data[ALLOWED_CHANNELS_FOR_COMMAND_KEY];
        if (allowedChannelsForCommand) {
          return allowedChannelsForCommand[commandId];
        }
      }

      return;
    });
  }

  static editDataForUser(userId, editDataFunction, persistenceState) {
    let key = keyForUserId(userId);
    return editData(key, editDataFunction);
  }

  static editDataForServer(serverId, editDataFunction, persistenceState) {
    let key = keyForServerId(serverId);
    return editData(key, editDataFunction);
  }

  static editGlobalData(editDataFunction, persistenceState) {
    return editData(GLOBAL_DATA_KEY, editDataFunction);
  }

  static editAllowedChannelsForCommand(msg, commandId, editFunction, persistenceState) {
    if (!msg.channel.guild) {
      let errorMessage = 'Trying to set allowed channels in a DM channel. Can\t do that.';
      return Promise.reject(new Error(errorMessage));
    }

    return PersistenceImplementation.editDataForServer(
      msg.channel.guild.id,
      data => {
        if (!data[ALLOWED_CHANNELS_FOR_COMMAND_KEY]) {
          data[ALLOWED_CHANNELS_FOR_COMMAND_KEY] = {};
        }

        let newAllowedChannels = editFunction(data[ALLOWED_CHANNELS_FOR_COMMAND_KEY][commandId]);
        data[ALLOWED_CHANNELS_FOR_COMMAND_KEY][commandId] = newAllowedChannels;
        return data;
      },
      persistenceState).then(data => {
        return data[ALLOWED_CHANNELS_FOR_COMMAND_KEY][commandId];
      });
  }
}

module.exports = PersistenceImplementation;
