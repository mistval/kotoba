function safeSetTimeout(func, delay) {
  if (typeof delay !== 'number' || Number.isNaN(delay)) {
    throw new Error('delay must be a non-NaN number');
  }

  if (delay < 0) {
    throw new Error('delay must be non-negative');
  }

  if (delay > 2147483647) {
    throw new Error('delay is too long');
  }

  return setTimeout(func, delay);
}

function safeWait(delay) {
  return new Promise((resolve) => {
    safeSetTimeout(resolve, delay);
  });
}

module.exports = {
  safeSetTimeout,
  safeWait,
};
