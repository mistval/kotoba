const config = require('../../config/frontend_config.js');
const fs = require('fs');
const path = require('path');

fs.writeFileSync(path.join(__dirname, '..', 'src', 'config.json'), JSON.stringify(config));
