'use strict'
const logger = require('./../core/logger.js');
const assert = require('assert');

exports.assertIsString = function() {
  let args = Array.from(arguments);
  for (let arg of args) {
    assert(typeof arg === typeof '', 'Argument is not a string');
  }
}

exports.assertIsArray = function() {
  let args = Array.from(arguments);
  for (let arg of args) {
    assert(args && Array.isArray(arg), 'Argument is not an array');
  }
}

exports.assertIsNumber = function() {
  let args = Array.from(arguments);
  for (let arg of args) {
    assert(typeof arg === typeof 1, 'Argument is not a number');
  }
}

exports.assertIsBoolean = function() {
  let args = Array.from(arguments);
  for (let arg of args) {
    assert(typeof arg === typeof true, 'Argument is not a boolean');
  }
}

exports.tagArrayToString = function(tagArray) {
  if (Array.isArray(tagArray) && tagArray.length > 0) {
    let result = '[';
    result += tagArray.join(', ');
    result += ']';
    return result;
  } else {
    return;
  }
};

exports.isNonEmptyArray = function(array) {
  return Array.isArray(array) && array.length > 0;
};

exports.retryPromise = function(promiseFactory, retryCount) {
  return promiseFactory().catch(err => {
    if (retryCount > 0) {
      logger.logFailure('UTIL', 'Promise failed, but there are still retries left. Retrying.', err);
      return exports.retryPromise(promiseFactory, retryCount - 1);
    } else {
      throw err;
    }
  });
};
