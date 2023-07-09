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
  if (!content || !content.embeds) {
    return content;
  }

  return {
    ...content,
    embeds: content.embeds.map((embed) => ({
      ...embed,
      title: trimString(embed.title, EMBED_TITLE_MAX_LENGTH),
      url: embed.url || undefined,
      fields: embed.fields.filter((field) => field.name?.trim()).map((field) => ({
        ...field,
        name: trimString(field.name, EMBED_FIELD_NAME_MAX_LENGTH),
        value: trimString(field.value, EMBED_FIELD_VALUE_MAX_LENGTH),
      })),
    })),
  };
}

module.exports = trimEmbed;
