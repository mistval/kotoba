FILES="\
  README.md \
  core/* \
  message_processors/* \
  commands/*"

jsdoc ${FILES} --destination ./documentation
