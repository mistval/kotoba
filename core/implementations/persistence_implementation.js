'use strict'
const storage = require('node-persist');

const USER_DATA_KEY_PREFIX = 'User';
const SERVER_DATA_KEY_PREFIX = 'Server';
const GLOBAL_DATA_KEY = 'Global';
const ALLOWED_CHANNELS_FOR_COMMAND_KEY = 'AllowedChannelsForCommand';

const editLockForKey = {};

function getData(key) {
  return storage.getItem(key).then(data => {
    if (data) {
      return data;
    } else {
      return {};
    }
  });
}

function setData(key, value) {
  return storage.setItem(key, value);
}

function keyForUserId(userId) {
  return USER_DATA_KEY_PREFIX + userId;
}

function keyForServerId(serverId) {
  return SERVER_DATA_KEY_PREFIX + serverId;
}

function getOrCreateEditLockForKey(key) {
  if (!editLockForKey[key]) {
    editLockForKey[key] = new EditLock(key);
  }

  return editLockForKey[key];
}

class EditLock {
  constructor(key) {
    this.key_ = key;
    this.queue_ = [];
    this.editing_ = false;
  }

  edit(editFunction) {
    let promise = new Promise((fulfill, reject) => {
      this.queue_.push({editFunction: editFunction, fulfill: fulfill, reject: reject});
      this.tryEditNext_();
    });

    return promise;
  }

  tryEditNext_() {
    if (!this.editing_ && this.queue_.length > 0) {
      this.editing_ = true;
      let nextEdit = this.queue_.pop();
      getData(this.key_).then(data => {
        let newData = nextEdit.editFunction(data);
        setData(this.key_, newData).then(() => {
          this.finishEdit(nextEdit);
          nextEdit.fulfill(newData);
        }).catch(nextEdit.reject).then(() => this.finishEdit(nextEdit));
      }).catch(nextEdit.reject).then(() => this.finishEdit(nextEdit));
    }
  }

  finishEdit(edit) {
    if (this.queue_.length === 0) {
      delete editLockForKey[this.key_];
    }

    this.editing_ = false;
    this.tryEditNext_();
  }
}

class PersistenceImplementation {
  static getDataForUser(userId, persistenceState) {
    return getData(keyForUserId(userId), persistenceState);
  }

  static getDataForServer(serverId, persistenceState) {
    return getData(keyForServerId(serverId), persistenceState);
  }

  static getGlobalData(persistenceState) {
    return getData(GLOBAL_DATA_KEY, persistenceState);
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

  static editDataForUser(userId, editData, persistenceState) {
    let key = keyForUserId(userId);
    return getOrCreateEditLockForKey(key).edit(editData);
  }

  static editDataForServer(serverId, editData, persistenceState) {
    let key = keyForServerId(serverId);
    return getOrCreateEditLockForKey(key).edit(editData);
  }

  static editGlobalData(editData, persistenceState) {
    return getOrCreateEditLockForKey(GLOBAL_DATA_KEY).edit(editData);
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
