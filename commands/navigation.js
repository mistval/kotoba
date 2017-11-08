'use strict'
const reload = require('require-reload')(require);
const NavigationPage = reload('./../core/navigation_page.js');
const NavigationChapter = reload('./../core/navigation_chapter.js');
const Navigation = reload('./../core/navigation.js');
const NavigationManager = require('./../core/navigation_manager.js');

/*
* Demonstrates how to create a navigation with three chapters.
* The first chapter has 3 pages of latin text.
* The second has 2 pages of galaxy photos.
* The third has infinite pages of random numbers.
*/
module.exports = {
  commandAliases: ['bot!navigation', 'bot!nav', 'nnnnn'],
  canBeChannelRestricted: true,
  uniqueId: 'nav403543',
  serverAdminOnly: false,
  shortDescription: 'Demonstrate how to use a navigation.',
  aliasesForHelp: ['bot!navigation', 'bot!nav'],
  action(bot, msg, suffix) {
    let randomNumberChapter = new NavigationChapter(new RandomNumberDataSource());

    const latinPar1 = {embed: {title: 'Page 1', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'}};
    const latinPar2 = {embed: {title: 'Page 2', description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.'}};
    const latinPar3 = {embed: {title: 'Page 3', description: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?'}};

    let latinChapter = NavigationChapter.fromContent([latinPar1, latinPar2, latinPar3]);

    const galaxyPictureContent1 = {
      embed: {
        title: 'Image 1',
        description: 'ooo, pretty',
        image: {url: 'https://www.nasa.gov/sites/default/files/thumbnails/image/hubble_friday_05132016.jpg'},
      }
    };
    const galaxyPictureContent2 = {
      embed: {
        title: 'Image 2',
        description: 'ooo, sparkly',
        image: {url: 'https://i.pinimg.com/originals/c9/43/b8/c943b86f2595208039fa2af11cf02ec7.jpg'},
      }
    };

    let galaxyPictureChapter = NavigationChapter.fromContent([galaxyPictureContent1, galaxyPictureContent2]);

    let chapterForReaction = {
      '🇮🇹': latinChapter,
      '⭐': galaxyPictureChapter,
      '🐺': randomNumberChapter,
    };

    let navigation = new Navigation(msg.author.id, true, '🇮🇹', chapterForReaction);
    return NavigationManager.register(navigation, 10000000, msg);
  },
};

class RandomNumberDataSource {
  prepareData(arg) {
    // If the data for all the pages can be retrieved easily (with just one HTTP request, API call, etc),
    // then it should be retrieved here and returned. Otherwise it should be retrieved page by page in
    // getPageFromPreparedData(). Whatever is returned here is later passed as the argument to
    // getPageFromPreparedData().

    // If available synchronously, the data itself can be returned.
    // Otherwise, a promise can be returned. What that promise resolves
    // with will be passed into getPageFromPreparedData.
    return Promise.resolve();
  }

  getPageFromPreparedData(arg, pageIndex) {
    let number = Math.floor((Math.random() * 1000) % 1000);

    // Either a NavigationPage or a Promise that returns a NavigationPage can be returned.
    return new NavigationPage({
      embed: {
        title: 'Random Number ' + (pageIndex + 1).toString(),
        description: (number + 1).toString(),
      }});
  }
}
