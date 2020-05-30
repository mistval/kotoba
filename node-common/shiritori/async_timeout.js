function asyncTimeout(timeoutMs) {
  return new Promise((fulfill) => {
    setTimeout(() => {
      fulfill();
    }, timeoutMs);
  });
}

module.exports = asyncTimeout;
