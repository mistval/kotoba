const assert = require('assert');
const globals = require('../globals.js');

async function retryPromise(promiseFactory, retryCount = 3) {
  let retriesLeft = retryCount;

  do {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await promiseFactory();
    } catch (err) {
      globals.logger.warn({
        event: 'ERROR',
        detail: 'Promise failed, but there are still retries left. Retrying.',
        err,
      });
      retriesLeft -= 1;
      if (retriesLeft <= 0) {
        throw err;
      }
    }
  } while (retriesLeft > 0);

  assert(false, 'Unexpected branch');
  return undefined;
}

module.exports = retryPromise;
