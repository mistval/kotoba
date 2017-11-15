class Logger {
  logSuccess() {
    this.succeeded = true;
  }

  logFailure(loggerTitle, failureMessage, err) {
    this.failed = true;
    this.error = err;
    this.failureMessage = failureMessage;
  }

  logInputReaction(title, msg, inputReactorTitle, succeeded, failureMessage) {
    if (succeeded) {
      this.succeeded = true;
    } else {
      this.failed = true;
    }
  }
}

module.exports = Logger;
