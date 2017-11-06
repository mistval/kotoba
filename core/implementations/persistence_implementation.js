'use strict'
const reload = require('require-reload')(require);
const storage = require('./../util/node_persist_atomic.js');

const USER_DATA_KEY_PREFIX = 'User';
const SERVER_DATA_KEY_PREFIX = 'Server';
const GLOBAL_DATA_KEY = 'Global';

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
}

module.exports = PersistenceImplementation;
