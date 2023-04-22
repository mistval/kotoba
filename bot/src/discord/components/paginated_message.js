const assert = require('assert');
const { InteractiveMessage } = require('./interactive_message.js');
const { Button, ComponentGroup } = require('./message_components.js');

function createArray(el) {
  return Array.isArray(el) ? el : [el];
}

function endArrayWithUndefined(arr) {
  return arr[arr.length - 1] === undefined
    ? arr
    : [...arr, undefined];
}

class PaginatedMessage {
  static async sendAsMessageReply(msg, chaptersArg, interactiveMessageOptions) {
    return this.send(msg.channel, msg.author.id, chaptersArg, interactiveMessageOptions);
  }

  static async send(channel, ownerId, chaptersArg, interactiveMessageOptions) {
    assert(chaptersArg.length, 'Must have at least one chapter');
    const isSingleChapter = chaptersArg.length === 1;
    const chapters = chaptersArg.map((c) => {
      assert(c.pages || c.getPages, 'Chapter must have either pages or getPages function');
      const pages = c.pages ? endArrayWithUndefined(c.pages) : [];

      return {
        ...c,
        pages,
      };
    });

    const interactiveMessage = new InteractiveMessage(ownerId, interactiveMessageOptions);
    let currentChapterIndex = 0;
    let currentPageIndex = 0;

    async function updateInteractiveMessage() {
      const currentChapter = chapters[currentChapterIndex];
      const needsPage = currentPageIndex >= currentChapter.pages.length;

      if (needsPage) {
        const pages = createArray(await currentChapter.getPages(currentPageIndex));
        currentChapter.pages.push(...pages);
      }

      let currentPage = currentChapter.pages[currentPageIndex];
      if (!currentPage) {
        currentPageIndex -= 1;
        currentPage = currentChapter.pages[currentPageIndex];
      }

      interactiveMessage.setEmbed(currentPage.embed);
      const isOnFirstPage = currentPageIndex === 0;
      const isOnLastPage = currentChapter.pages.length === currentPageIndex + 2
        && !currentChapter.pages[currentPageIndex + 1];
      const isSinglePage = isOnFirstPage && isOnLastPage;
      const hideArrows = isSingleChapter && isSinglePage;

      const chapterButtons = !isSingleChapter && chapters.map((chapter, i) => {
        const isCurrentChapter = i === currentChapterIndex;
        return Button(chapter.title, async () => {
          if (isCurrentChapter) {
            return;
          }

          const previousChapterIndex = currentChapterIndex;
          currentChapterIndex = i;
          currentPageIndex = 0;

          try {
            await updateInteractiveMessage();
          } catch (err) {
            currentChapterIndex = previousChapterIndex;
            throw err;
          }
        }, { style: isCurrentChapter ? 3 : 1 });
      });

      const arrowButtons = !hideArrows && [
        Button('◀️', async () => {
          if (currentPageIndex === 0) {
            return;
          }

          currentPageIndex -= 1;
          try {
            await updateInteractiveMessage();
          } catch (err) {
            currentPageIndex += 1;
            throw err;
          }
        }, { disabled: isOnFirstPage }),
        Button('▶️', async () => {
          currentPageIndex += 1;

          try {
            await updateInteractiveMessage();
          } catch (err) {
            currentPageIndex -= 1;
            throw err;
          }
        }, { disabled: isOnLastPage }),
      ].filter(Boolean);

      const components = ComponentGroup([
        chapterButtons,
        arrowButtons,
      ].filter(Boolean));

      interactiveMessage.setComponents(components);
      return interactiveMessage.sendOrUpdate(channel);
    }

    await updateInteractiveMessage();

    return interactiveMessage;
  }
}

module.exports = {
  PaginatedMessage,
};
