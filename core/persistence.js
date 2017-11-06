'use strict'
const reload = require('require-reload')(require);
const storage = require('./util/node_persist_atomic.js');

let implementation;

/**
* A utility to help with persisting data. Singleton.
*/
class Persistence {
  constructor() {
    this.reload();
  }

  /**
  * Init persistence. Should only be called once at process launch, so do it synchronously to cut down on complexity.
  * @param {Object} options - The options to pass into the node-persist initializer.
  */
  init(options) {
    storage.init(options);
    this.initialized_ = true;
  }

  /**
  * Reload the class' main implementation. Since this class is a singleton and holds a file handle that we don't want to close, we do not want to reload this file.
  */
  reload() {
    implementation = reload('./implementations/persistence_implementation.js');
  }

  /**
  * Get data associated with a userId
  * @param {String} userId - The id of the user to get data associated with.
  * @returns {Promise} a promise that will be fulfilled with the user data object.
  */
  getDataForUser(userId) {
    return implementation.getDataForUser(userId, this);
  }

  /**
  * Get data associated with a serverId
  * @param {String} serverId - The id of the server to get data associated with.
  * @returns {Promise} a promise that will be fulfilled with the server data object.
  */
  getDataForServer(serverId) {
    return implementation.getDataForServer(serverId, this);
  }

  /**
  * Get global data
  * @returns {Promise} a promise that will be fulfilled with the global data object.
  */
  getGlobalData() {
    return implementation.getGlobalData(this);
  }

  /**
  * Edit data associated with a userId
  * @param {String} userId - The id of the user to set data associated with.
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editDataForUser(userId, editFunction) {
    return implementation.editDataForUser(userId, editFunction, this);
  }

  /**
  * Edit data associated with a userId
  * @param {String} serverId - The id of the server to set data associated with.
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editDataForServer(serverId, editFunction) {
    return implementation.editDataForServer(serverId, editFunction, this);
  }

  /**
  * Edit global data
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editGlobalData(editFunction) {
    return implementation.editGlobalData(editFunction, this);
  }
}

module.exports = new Persistence();
