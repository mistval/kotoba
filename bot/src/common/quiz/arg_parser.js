function parseSubArgs(input) {
  let range;
  const equalsArguments = {};

  input = input.replace(/([^ ]*)=([^ ]*)/g, (m, argName, argValue) => {
    argValue = Number.parseFloat(argValue) || argValue.replace('[', '(').replace(']', ')');
    equalsArguments[argName] = argValue;
    return '';
  }).replace(/(\w+)-(\w+)/g, (m, start, end) => {
    range = { start: Number.parseFloat(start) || start, end: Number.parseFloat(end) || end };
    return '';
  });

  const keywords = input.split(' ').filter(x => x).map(k => Number.parseFloat(k) || k);

  return { range, equalsArguments, keywords };
}

function parseArgs(input, expectDeckFirst) {
  input = input
    .replace(/\s+/g, ' ')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*-\s*/g, '-')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*,\s*/g, ',')
    // Temporarily replace the parens in color functions with square brackets
    .replace(/rgb\(([^)]*)\)/g, 'rgb[$1]')
    .replace(/rgba\(([^)]*)\)/g, 'rgba[$1]')
    .replace(/hsl\(([^)]*)\)/g, 'hsl[$1]')
    .replace(/hsla\(([^)]*)\)/g, 'hsla[$1]')
    .replace(/hwb\(([^)]*)\)/g, 'hwb[$1]')
    .replace(/lab\(([^)]*)\)/g, 'lab[$1]')
    .trim()
    .toLowerCase();

  // Consume all decks that have arguments
  const decks = [];
  input = input.replace(/(\w*)\(([^)]*)\)/g, (m, deckName, args) => {
    const deckArgs = parseSubArgs(args);
    decks.push({ deckName, deckArgs });
    return '';
  });

  input = input.replace(/ +/g, ' ').replace(/\s*\+\s*/g, '+');

  // If the first token is supposed to be deck(s), consume it
  if (expectDeckFirst) {
    const tokens = input.split(' ');
    if (tokens[0]) {
      const deckList = tokens[0].split('+').map(s => s.trim()).filter(s => s);
      for (const deckName of deckList) {
        decks.push({ deckName, deckArgs: {} });
      }
    }

    input = tokens.slice(1).join(' ');
  }

  const globalArgs = parseSubArgs(input);

  return { globalArgs, decks };
}

module.exports = {
  parseSubArgs,
  parseArgs,
};
