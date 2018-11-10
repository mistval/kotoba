const globals = require('./../globals.js');

function retryPromise(promiseFactory, retryCount=3) {
  return promiseFactory().catch((err) => {
    if (retryCount > 0) {
      globals.logger.logFailure('UTIL', 'Promise failed, but there are still retries left. Retrying.', err);
      return retryPromise(promiseFactory, retryCount - 1);
    }
    throw err;
  });
}

module.exports = retryPromise;
