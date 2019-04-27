class Logger {
  logFailure(title, message, err) {
    console.warn(`Error:: ${title} :: ${message}`);
    console.warn(err);
  }

  logSuccess(title, message) {
    console.log(`${title} :: ${message}`);
  }
}

module.exports = {
  logger: new Logger(),
};
