const mongoose = require('mongoose');

const DB_NAME = 'kotoba';
const DB_HOST = process.env.MONGO_HOST || 'localhost:27017';
const DB_CONNECTION_STRING = `mongodb://${DB_HOST}/${DB_NAME}`;
const connection = mongoose.createConnection(DB_CONNECTION_STRING);

module.exports = {
  connection,
  DB_CONNECTION_STRING,
};
