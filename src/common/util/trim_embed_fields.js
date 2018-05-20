const EMBED_FIELD_MAX_LENGTH = 1024;
const EMBED_FIELD_TRIM_REPLACEMENT = ' [...]';

function trimEmbedFields(content) {
  if (!content || !content.embed || !content.embed.fields || content.embed.fields.length === 0) {
    return content;
  }

  const contentCopy = Object.assign({}, content);
  contentCopy.embed = Object.assign({}, content.embed);
  const { fields } = contentCopy.embed;

  contentCopy.embed.fields = fields.map((field) => {
    const fieldCopy = Object.assign({}, field);
    if (fieldCopy.value.length > EMBED_FIELD_MAX_LENGTH) {
      fieldCopy.value = fieldCopy.value.substring(
        0,
        EMBED_FIELD_MAX_LENGTH - EMBED_FIELD_TRIM_REPLACEMENT.length,
      );

      fieldCopy.value += EMBED_FIELD_TRIM_REPLACEMENT;
    }

    return fieldCopy;
  });

  return contentCopy;
}

module.exports = trimEmbedFields;
