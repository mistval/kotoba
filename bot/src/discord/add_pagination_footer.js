const constants = require('./../common/constants.js');

function addPaginationFooter(pages, authorName) {
  if (pages.length <= 1) {
    return pages;
  }

  const pageCopies = pages.map(page => ({
    ...page,
    embed: {
      ...page.embed,
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${authorName} can use the reaction buttons below to see more information!`,
      },
    },
  }));

  return pageCopies;
}

module.exports = addPaginationFooter;
