const api_keys = require('./api_keys.js');

if (Object.values(api_keys).some(value => !!value)) {
  console.log('Sensitive data found.');
  process.exit(1);
}

process.exit(0);
