'use strict'
const DEFAULT_DELETION_TIME = 7000;

/**
* Utils for helping with Eris.
*/
class ErisUtils {
  /**
  * Don't construct me
  */
  constructor() {
    throw new Error();
  }

  /**
  * Sends a message and then deletes it sometime afterward
  * @param {Eris.Message} msg - The message being responded to.
  * @param {String} messageToSend - The text of the message to send and then delete.
  * @param {Number} [deleteTime=7000] - The time to wait in milliseconds before deleting the message.
  */
  static sendMessageAndDelete(msg, messageToSend, deleteTime) {
    if (!deleteTime) {
      deleteTime = DEFAULT_DELETION_TIME;
    }
    msg.channel.createMessage(messageToSend).then(sentMessage => {
      setTimeout(() => sentMessage.delete('i sent it'), deleteTime);
    });
  }
}

module.exports = ErisUtils;
