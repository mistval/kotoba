'use strict'
const logger = require('./logger.js');

const LOGGER_TITLE = 'NAVIGATION';
const EDIT_DELAY_TIME_IN_MS = 2000;

/**
* Represents a navigation. A navigation allows its owner to browse information by using reactions.
* In response to the reactions, the bot edits its message.
* Note: in order to mostly work around a Discord desktop client bug (https://trello.com/c/Nnkj5D0W/1154-editing-a-message-may-sometimes-cause-part-of-previous-message-to-appear),
*   the message gets edited twice per reaction. This can easily lead to light rate-limiting against your bot, which is handled seemlessly (thanks Eris).
*   There is also rate-limiting built into this class, though it does not limit the rate sufficiently to prevent Discord's ratelimiting.
*/
class Navigation {
  /**
  * @param {String} ownerId - The Discord user ID of this navigation's owner (who is allowed to manipulate it with reactions).
  * @param {String} showPageArrows - Whether the page arrows should be shown, or only the chapter emotes.
  * @param {String} initialEmojiName - The unicode emote name for the chapter that should be shown initially.
  * @param {Object} chapterForEmojiName - A dictionary mapping from unicode emoji to NavigationChapter.
  */
  constructor(ownerId, showPageArrows, initialEmojiName, chapterForEmojiName) {
    let keys = Object.keys(chapterForEmojiName);
    if (keys.indexOf(initialEmojiName) === -1) {
      logger.logFailure(LOGGER_TITLE, 'Value of initialEmojiName not found in chapterForEmojiName');
      initialEmojiName = keys[0];
    }
    this.showPageArrows_ = showPageArrows;
    this.chapterForEmojiName_ = chapterForEmojiName;
    this.currentEmojiName_ = initialEmojiName;
    this.ownerId_ = ownerId;
    this.actionAccumulator_ = new ActionAccumulator(EDIT_DELAY_TIME_IN_MS);
    this.message_ = undefined;
  }

  /**
  * @param {Eris.Message} msg - The message the navigation is getting created in response to. The navigation will be sent to the same channel.
  */
  createMessage(msg) {
    let chapter = this.getChapterForEmojiName_(this.currentEmojiName_);
    return chapter.getCurrentPage().then(navigationPage => {
      return msg.channel.createMessage(navigationPage.content);
    }).then(sentMessage => {
      this.message_ = sentMessage;
      let emojis = Object.keys(this.chapterForEmojiName_);
      if (emojis.length > 1) {
        for (let emoji of emojis) {
          msg.channel.addMessageReaction(this.message_.id, emoji);
        }
      }

      if (this.showPageArrows_) {
        msg.channel.addMessageReaction(this.message_.id, '⬅');
        msg.channel.addMessageReaction(this.message_.id, '➡');
      }

      return sentMessage.id;
    }).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to create navigation.', err);
    });
  }

  /**
  * When an emoji is added or removed, this gets called and, if appropriate, the state of the navigation changes.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {String} emoji - The unicode emoji that was toggled.
  * @param {String} userId - The id of the user who toggled the emoji.
  */
  handleEmojiToggled(bot, emoji, userId) {
    this.actionAccumulator_.enqueue(() => {
      if (bot.user.id === userId) {
        return;
      } else if (emoji.name === this.currentEmojiName_) {
        return;
      } else if (userId !== this.ownerId_) {
        return;
      }

      let pagePromise = undefined;
      let desiredEmojiName = emoji.name;

      if (this.showPageArrows_ && emoji.name === '⬅') {
        pagePromise = this.getChapterForEmojiName_(this.currentEmojiName_).flipToPreviousPage();
        desiredEmojiName = this.currentEmojiName_;
      } else if (this.showPageArrows_ && emoji.name === '➡') {
        pagePromise = this.getChapterForEmojiName_(this.currentEmojiName_).flipToNextPage();
        desiredEmojiName = this.currentEmojiName_;
      } else {
        let chapter = this.getChapterForEmojiName_(emoji.name);
        if (!chapter) {
          return;
        }
        this.currentEmojiName_ = emoji.name;
        pagePromise = chapter.getCurrentPage();
      }

      pagePromise.then(navigationPage => {
        if (navigationPage && desiredEmojiName === this.currentEmojiName_) {
          // TODO. Don't need to do this double edit after Discord fixes this: https://trello.com/c/Nnkj5D0W/1154-editing-a-message-may-sometimes-cause-part-of-previous-message-to-appear
          let replaceContent = {};
          replaceContent.content = '';
          replaceContent.embed = {
            title: '',
            description: '',
          };
          this.message_.edit(replaceContent).then(() => {
            this.message_.edit(navigationPage.content).catch(err => {
              logger.logFailure(LOGGER_TITLE, 'Error editing navigation', err);
            });
          }).catch(err => {
            logger.logFailure(LOGGER_TITLE, 'Error editing navigation', err);
          });
        }
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error navigating.', err);
      });
    });
  }

  getChapterForEmojiName_(emojiName) {
    let keys = Object.keys(this.chapterForEmojiName_);
    for (let key of keys) {
      if (key === emojiName) {
        return this.chapterForEmojiName_[key];
      }
    }

    return;
  }
}

class ActionAccumulator {
  constructor(delayInMs) {
    this.delayInMs_ = delayInMs;
    this.timerInFlight_ = false;
    this.callback_ = undefined;
  }

  enqueue(callback) {
    if (this.timerInFlight_) {
      this.callback_ = callback;
    } else {
      this.timerInFlight_ = true;
      callback();
      setTimeout(() => {
        this.timerInFlight_ = false;
        if (this.callback) {
          this.callback_();
          this.callback_ = undefined;
        }
      },
      this.delayInMs);
    }
  }
}

module.exports = Navigation;
