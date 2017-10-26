'use strict'
const reload = require('require-reload')(require);
const fs = require('fs');

/**
* Utils for interacting with the file system.
*/
class FileSystemUtils {
  /**
  * Don't construct me
  */
  constructor() {
    throw new Error();
  }

  /**
  * @param {String} directory - The directory to read filenames from.
  */
  static getFilesInDirectory(directory) {
    return new Promise((fulfill, reject) => {
      let filePaths = [];
      fs.readdir(directory, (err, files) => {
        if (err) {
          reject(err);
        } else {
          for (let j = 0; j < files.length; ++j) {
            filePaths.push(directory + '/' + files[j]);
          }
        }

        fulfill(filePaths);
      });
    });
  }
}

module.exports = FileSystemUtils;
