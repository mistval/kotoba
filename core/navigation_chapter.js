'use strict'
const reload = require('require-reload')(require);
const logger = require('./../core/logger.js');
const NavigationPage = reload('./navigation_page.js');

const LOGGER_TITLE = 'NAVIGATION';

/**
* Represents one page in a navigation.
*/
class NavigationChapter {
  /**
  * @param {Object} dataSource - A dataSource that has methods getPageFromPreparedData() and prepareData().
  * @param {Object} prepareDataArgument - The argument to the dataSource's prepareData() method.
  */
  constructor(dataSource, prepareDataArgument) {
    this.dataSource_ = dataSource;
    this.prepareDataArgument_ = prepareDataArgument;
    this.pages_ = [];
    this.currentPageIndex_ = 0;
  }

  /**
  * Factory method to create a NavigationChapter from an array of content objects (or strings)
  * @param {(Array<Object>|Array<String>)} contents - The array of page content for the NavigationChapter.
  */
  static fromContent(contents) {
    let navigationPages = [];
    for (let content of contents) {
      navigationPages.push(new NavigationPage(content));
    }

    return NavigationChapter.fromNavigationPages(navigationPages);
  }

  /**
  * Factory method to create a NavigationChapter from an array of NavigationPages.
  * @param {(Array<NavigationPage>)} pages - The pages for the NavigationChapter.
  */
  static fromNavigationPages(pages) {
    let dataSource = {};
    dataSource.prepareData = () => {
      return pages;
    };
    dataSource.getPageFromPreparedData = (preparedData, pageIndex) => {
      return preparedData[pageIndex];
    };
    let chapter = new NavigationChapter(dataSource);
    return chapter;
  }

  /**
  * @returns {Promise<NavigationPage>} The current page of the navigation.
  */
  getCurrentPage() {
    if (!this.preparedData_) {
      return Promise.resolve(this.dataSource_.prepareData(this.prepareDataArgument_)).then((preparedData) => {
        this.preparedData_ = preparedData;
        return this.getCurrentPageFromPreparedData_();
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error preparing data for navigation.', err);
        throw err;
      });
    } else {
      return this.getCurrentPageFromPreparedData_();
    }
  }

  /**
  * @returns {Promise<NavigationPage>} The previous page of the navigation, if it exists and is not errored.
  * If it does not exist or is errored, the Promise resolves with undefined.
  */
  flipToPreviousPage() {
    if (this.currentPageIndex_ > 0) {
      --this.currentPageIndex_;
      return this.getCurrentPage();
    }
    return Promise.resolve(undefined);
  }

  /**
  * @returns {Promise<NavigationPage>} The next page of the navigation, if it exists and is not errored.
  * If it does not exist or is errored, the Promise resolves with undefined.
  */
  flipToNextPage() {
    ++this.currentPageIndex_;
    return this.getCurrentPage();
  }

  getCurrentPageFromPreparedData_() {
    let pageToGet = this.currentPageIndex_;
    if (this.pages_[pageToGet]) {
      return Promise.resolve(this.pages_[pageToGet]);
    } else {
      return Promise.resolve(this.dataSource_.getPageFromPreparedData(this.preparedData_, pageToGet)).then(page => {
        while (this.pages_.length <= pageToGet) {
          this.pages_.push(undefined);
        }
        if (!this.pages_[pageToGet]) {
          this.pages_[pageToGet] = page;
        }
        if (!page) {
          return this.flipToPreviousPage().then(() => undefined);
        } else {
          return Promise.resolve(page);
        }
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error getting navigation page from prepared data.', err);
        return this.flipToPreviousPage().then(() => undefined);
      });
    }
  }
}

module.exports = NavigationChapter;
