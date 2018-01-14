const QuizManager = require('./../kotoba/quiz_manager.js');

module.exports = {
  name: 'Quiz Answer',
  action: (bot, msg) => {
    if (!QuizManager.hasQuizSession(msg.channel.id)) {
      return false;
    }

    let userName = msg.author.username + '#' + msg.author.discriminator;
    let result = QuizManager.processUserInput(msg.channel.id, msg.author.id, userName, msg.content);
    if (result) {
      return true;
    }
    let isDm = !msg.channel.guild;
    if (isDm) {
      return 'Wrong answer in DM';
    }
    return false;
  }
};
