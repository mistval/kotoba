const EMBED_FIELD_MAX_LENGTH = 1024;

// Experimentally determined. It's supposed to be 256 but in practice it seems to not be >.>
const EMBED_TITLE_MAX_LENGTH = 242;
const EMBED_FIELD_TRIM_REPLACEMENT = ' [...]';

function trimString(str, maxLength) {
  if (!str) {
    return str;
  }

  if (str.length > maxLength) {
    let trimmedStr = str.substring(
      0,
      maxLength - EMBED_FIELD_TRIM_REPLACEMENT.length,
    );

    trimmedStr += EMBED_FIELD_TRIM_REPLACEMENT;
    return trimmedStr;
  }

  return str;
}

function trimEmbed(content) {
  if (!content || !content.embed) {
    return content;
  }

  const contentCopy = Object.assign({}, content);
  contentCopy.embed = Object.assign({}, content.embed);
  contentCopy.embed.title = trimString(contentCopy.embed.title, EMBED_TITLE_MAX_LENGTH);

  if (!contentCopy.embed.fields || contentCopy.embed.fields.length === 0) {
    return contentCopy;
  }

  const { fields } = contentCopy.embed;

  contentCopy.embed.fields = fields.map((field) => {
    const fieldCopy = Object.assign({}, field);
    fieldCopy.value = trimString(fieldCopy.value, EMBED_FIELD_MAX_LENGTH);

    return fieldCopy;
  });

  return contentCopy;
}

module.exports = trimEmbed;
