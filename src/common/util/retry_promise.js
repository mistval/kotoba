const globals = require('./../globals.js');

async function retryPromise(promiseFactory, retryCount = 3) {
  do {
    try {
      return await promiseFactory();
    } catch (err) {
      globals.logger.logFailure('UTIL', 'Promise failed, but there are still retries left. Retrying.', err);
      retryCount -= 1;
      if (retryCount <= 0) {
        throw err;
      }
    }
  } while (retryCount > 0);
}

module.exports = retryPromise;
