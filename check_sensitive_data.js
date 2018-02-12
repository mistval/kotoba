const config = require('./config.json');
const api_keys = require('./kotoba/api_keys.js');

if (config.botToken || Object.keys(api_keys).some(key => !!api_keys[key])) {
  console.log('Sensitive data found.');
  process.exit(1);
}

process.exit(0);