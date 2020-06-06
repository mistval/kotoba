const Kuroshiro = require('kuroshiro').default;
const KuroshiroKuromoji = require('kuroshiro-analyzer-kuromoji');

const kuroshiro = new Kuroshiro();
const initPromise = kuroshiro.init(new KuroshiroKuromoji());

function isBreakableCharacter(char) {
  if (char >= '\u3040' && char <= '\u309f') {
    return true; // hiragana
  }
  if (char >= '\u30a0' && char <= '\u30ff') {
    return true; // katakana
  }
  if (char >= '\u4e00' && char <= '\u9faf') {
    return true; // ideographs
  }
  if (/\s/.test(char)) {
    return true;
  }
  return false;
}

function splitResults(results) {
  const newResults = [];

  results.forEach((chunk) => {
    if (chunk.reading) {
      newResults.push(chunk);
    } else {
      const characters = chunk.text.split('').reverse();
      let nextChunkText = '';
      while (characters.length > 0) {
        const character = characters.pop();
        if (isBreakableCharacter(character)) {
          if (nextChunkText) {
            newResults.push({ text: nextChunkText });
            nextChunkText = '';
          }
          newResults.push({ text: character });
        } else {
          nextChunkText += character;
        }
      }

      if (nextChunkText) {
        newResults.push({ text: nextChunkText });
      }
    }
  });

  return newResults;
}

async function getFurigana(text) {
  await initPromise;
  const results = await kuroshiro.convert(text, { to: 'hiragana', mode: 'raw' });
  return splitResults(results);
}

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.getFurigana = async (req, res) => {
  try {
    const text = req.body.text;
    if (typeof text !== 'string') {
      throw new Error(`Input is not a string`);
    }

    if (text.length > 500) {
      throw new Error('Input is too long');
    }

    res.json(await getFurigana(text));
  } catch (err) {
    res.status(500).send(err.message);
    throw err;
  }
};
