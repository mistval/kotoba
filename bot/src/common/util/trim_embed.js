const EMBED_FIELD_NAME_MAX_LENGTH = 256;
const EMBED_FIELD_VALUE_MAX_LENGTH = 1024;

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
  contentCopy.embed.url = contentCopy.embed.url || undefined;

  contentCopy.embed.fields = contentCopy.embed.fields
    ?.filter((f) => f.name?.trim())
    ?.map((field) => ({
      ...field,
      name: trimString(field.name, EMBED_FIELD_NAME_MAX_LENGTH),
      value: trimString(field.value, EMBED_FIELD_VALUE_MAX_LENGTH),
    }));

  return contentCopy;
}

module.exports = trimEmbed;
