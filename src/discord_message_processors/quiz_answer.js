'use strict'
const reload = require('require-reload')(require);
const QuizManager = reload('./../common/quiz/manager.js');

module.exports = {
  name: 'Quiz Answer',
  action: (erisBot, monochrome, msg) => {
    if (!QuizManager.hasQuizSession(msg.channel.id)) {
      return false;
    }

    let userName = msg.author.username + '#' + msg.author.discriminator;
    let result = QuizManager.processUserInput(msg.channel.id, msg.author.id, userName, msg.content);
    if (result) {
      return true;
    }
    const msgLowercase = msg.content.toLowerCase();
    if (msgLowercase === 'skip' || msgLowercase === 's' || msgLowercase === 'ｓ') {
      return QuizManager.skip(msg.channel.id);
    }
    let isDm = !msg.channel.guild;
    if (isDm) {
      return 'Wrong answer in DM';
    }
    return false;
  }
};
