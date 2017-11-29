FILES="\
  message_processors/* \
  commands/* \
  kotoba/*"

jscs -c ./style_rules.json ${FILES}