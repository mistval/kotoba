const constants = require('./../common/constants.js');

function addPaginationFooter(pages, authorName) {
  let sanitizedPages = pages;
  const single = !Array.isArray(pages);
  if (single) {
    sanitizedPages = [pages];
  }

  const pageCopies = sanitizedPages.map(page => ({
    ...page,
    embed: {
      ...page.embed,
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${authorName} can use the reaction buttons below to see more information!`,
      },
    },
  }));

  if (single) {
    return pageCopies[0];
  }

  return pageCopies;
}

module.exports = addPaginationFooter;
