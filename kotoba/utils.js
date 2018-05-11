
const reload = require('require-reload')(require);

const logger = reload('monochrome-bot').logger;
const assert = require('assert');

module.exports.mapObjectKey = function (object, lambda) {
  const newObject = {};
  for (const key of Object.keys(object)) {
    newObject[key] = lambda(key);
  }
  return newObject;
};

module.exports.mapObjectValue = function (object, lambda) {
  return module.exports.mapObjectKey(object, key => lambda(object[key]));
};

// From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
module.exports.shuffleArray = function (array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
};

module.exports.assertIsString = function () {
  const args = Array.from(arguments);
  for (const arg of args) {
    assert(typeof arg === typeof '', 'Argument is not a string');
  }
};

module.exports.assertIsArray = function () {
  const args = Array.from(arguments);
  for (const arg of args) {
    assert(args && Array.isArray(arg), 'Argument is not an array');
  }
};

module.exports.assertIsNumber = function () {
  const args = Array.from(arguments);
  for (const arg of args) {
    assert(typeof arg === typeof 1, 'Argument is not a number');
  }
};

module.exports.assertIsBoolean = function () {
  const args = Array.from(arguments);
  for (const arg of args) {
    assert(typeof arg === typeof true, 'Argument is not a boolean');
  }
};

module.exports.tagArrayToString = function (tagArray) {
  if (Array.isArray(tagArray) && tagArray.length > 0) {
    let result = '[';
    result += tagArray.join(', ');
    result += ']';
    return result;
  }
  return '';
};

module.exports.isNonEmptyArray = function (array) {
  return Array.isArray(array) && array.length > 0;
};

module.exports.retryPromise = function (promiseFactory, retryCount) {
  return promiseFactory().catch((err) => {
    if (retryCount > 0) {
      logger.logFailure('UTIL', 'Promise failed, but there are still retries left. Retrying.', err);
      return module.exports.retryPromise(promiseFactory, retryCount - 1);
    }
    throw err;
  });
};
