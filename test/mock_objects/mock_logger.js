class Logger {
  logSuccess() {
    this.succeeded = true;
  }

  logFailure() {
    this.failed = true;
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
