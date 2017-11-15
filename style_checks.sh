FILES="\
  core/* \
  core/commands/* \
  core/implementations/* \
  core/util/* \
  message_processors/* \
  commands/* \
  test/*"

jscs -c ./style_rules.json ${FILES}