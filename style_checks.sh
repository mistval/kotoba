FILES="\
  core/* \
  core/commands/* \
  core/implementations/* \
  core/util/* \
  message_processors/* \
  commands/* \
  kotoba/* \
  test/*"

jscs -c ./style_rules.json ${FILES}