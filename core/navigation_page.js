'use strict'
/**
* Represents one page in a navigation
*/
class NavigationPage {
  /**
  * @param {(String|Object)} content - The content for the page, it is what will get passed into Eris' createMessage method.
  * @param {Object} [file] - The file object to pass into Eris' createMessage method.
  * @param {Boolean} [errored] - Whether the page is errored. If it is, it will not be loaded.
  */
  constructor(content, file, errored) {
    this.content = content;
    this.file = file;
    this.errored = errored;
  }
}

module.exports = NavigationPage;
