
const reload = require('require-reload')(require);

const QuizManager = reload('./../common/quiz/manager.js');

module.exports = {
  name: 'Quiz Answer',
  action: (erisBot, msg) => {
    if (!QuizManager.hasQuizSession(msg.channel.id)) {
      return false;
    }

    const userName = `${msg.author.username}#${msg.author.discriminator}`;
    const result = QuizManager.processUserInput(
      msg.channel.id,
      msg.author.id,
      userName,
      msg.content,
    );

    if (result) {
      return true;
    }
    const msgLowercase = msg.content.toLowerCase();
    if (msgLowercase === 'skip' || msgLowercase === 's' || msgLowercase === 'ｓ') {
      return QuizManager.skip(msg.channel.id);
    }
    const isDm = !msg.channel.guild;
    if (isDm) {
      return 'Wrong answer in DM';
    }
    return false;
  },
};
