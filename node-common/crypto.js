const crypto = require('crypto');

function generateDeckSecret() {
  const secret = crypto.randomBytes(6);
  return secret.toString('hex');
}

module.exports = {
  generateDeckSecret,
};
