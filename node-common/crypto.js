const crypto = require('crypto');

function generateDeckSecret() {
  return new Promise((fulfill, reject) => {
    crypto.randomBytes(6, (err, buffer) => {
      if (err) {
        return reject(err);
      }

      fulfill(buffer.toString('hex'));
    });
  });
}

module.exports = {
  generateDeckSecret,
};
