const config = require('./config.json');
const api_keys = require('./src/common/api_keys.js');

if (config.botToken || Object.values(api_keys).some(value => !!value)) {
  console.log('Sensitive data found.');
  process.exit(1);
}

process.exit(0);
