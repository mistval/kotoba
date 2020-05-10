const mongoose = require('mongoose');

let connectPromise;

function connect() {
  if (!connectPromise) {
    connectPromise = new Promise((fulfill, reject) => {
      mongoose.connect(
        'mongodb://localhost/kotoba',
        { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true },
      );
      mongoose.connection.on('error', (err) => {
        reject(err);
      });
      mongoose.connection.once('open', () => {
        fulfill();
      });
    });
  }

  return connectPromise;
}

module.exports = connect;
