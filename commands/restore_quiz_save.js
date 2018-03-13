'use strict'
const reload = require('require-reload')(require);
const PublicError = reload('monochrome-bot').PublicError;
const pauseManager = require('./../kotoba/quiz/pause_manager.js');
const constants = require('./../kotoba/constants.js');

/**
* Evaluate arbitrary javascript code and return the result. Syntax: }eval [javascript code]
*/
module.exports = {
  commandAliases: ['}restoresave'],
  botAdminOnly: true,
  action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('You need to provide a user ID and index to restore.', false, 'No suffix');
    }
    let [userId, saveIndex] = suffix.split(' ');
    if (userId && saveIndex === undefined) {
      return pauseManager.getRestorable(userId).then(mementos => {
        return msg.channel.createMessage(mementos.map((memento, index) => {
          let date = new Date(memento.time);
          let dateString = `${date.getDate() + 1}/${date.getMonth() + 1}/${date.getFullYear()}`;
          return `${index}: ${memento.quizType} ${dateString}`;
        }).join('\n'));
      });
    }

    return pauseManager.getRestorable(userId).then(mementos => {
      return pauseManager.restore(userId, mementos[parseInt(saveIndex)]).then(indexString => {
        return msg.channel.createMessage({
          embed: {
            title: `One save was restored for <@${userId}>. They can load it by saying k!quiz unpause ${indexString}.`,
            color: constants.EMBED_NEUTRAL_COLOR,
          }
        });
      });
    });
  },
};
