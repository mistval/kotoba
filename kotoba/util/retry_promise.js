const reload = require('require-reload')(require);

const { logger } = reload('monochrome-bot');

function retryPromise(promiseFactory, retryCount) {
  return promiseFactory().catch((err) => {
    if (retryCount > 0) {
      logger.logFailure('UTIL', 'Promise failed, but there are still retries left. Retrying.', err);
      return retryPromise(promiseFactory, retryCount - 1);
    }
    throw err;
  });
}

module.exports = retryPromise;
