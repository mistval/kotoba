const storage = require('node-persist');

let storageInit;

/* This is a wrapper around node-persist that supports atomic edits (reading and then writing) */

const editLockForKey = {};

class EditLock {
  constructor(key) {
    this.key_ = key;
    this.queue_ = [];
    this.editing_ = false;
  }

  edit(editFunction) {
    return new Promise((fulfill, reject) => {
      this.queue_.push({editFunction: editFunction, fulfill: fulfill, reject: reject});
      this.tryEditNext_();
    });
  }

  tryEditNext_() {
    if (!this.editing_ && this.queue_.length > 0) {
      this.editing_ = true;
      let nextEdit = this.queue_.pop();
      // Get the data from the database
      storage.getItem(this.key_).then(data => {
        // Callback to the edit function to edit it
        return Promise.resolve(nextEdit.editFunction(data)).then(newData => {
          // Put the edited data back into the database
          return storage.setItem(this.key_, newData).then(() => {
            // Release the lock, fulfill, and move on to the next edit if it exists
            this.finishEdit(nextEdit);
            nextEdit.fulfill(newData);
          }).catch(err => {
            nextEdit.reject(err);
            this.finishEdit(nextEdit);
          });
        }).catch(err => {
          nextEdit.reject(err);
          this.finishEdit(nextEdit);
        });
      }).catch(err => {
        nextEdit.reject(err);
        this.finishEdit(nextEdit);
      });
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

function getOrCreateEditLockForKey(key) {
  if (!editLockForKey[key]) {
    editLockForKey[key] = new EditLock(key);
  }

  return editLockForKey[key];
}

function checkInit() {
  if (!storageInit) {
    throw new Error('Storage has not been initialized. Call init() before trying to access storage.');
  }
}

module.exports.init = function(options) {
  storageInit = storage.init(options);
};

module.exports.editItem = function(itemKey, editFunction) {
  checkInit();
  return storageInit.then(() => getOrCreateEditLockForKey(itemKey).edit(editFunction));
};

module.exports.getItem = function(itemKey) {
  checkInit();
  return storageInit.then(() => storage.getItem(itemKey));
};
