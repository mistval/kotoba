const Kuroshiro = require('kuroshiro').default;
const KuroshiroKuromoji = require('kuroshiro-analyzer-kuromoji');

const kuroshiro = new Kuroshiro();
const initPromise = kuroshiro.init(new KuroshiroKuromoji());

async function getFurigana(text) {
  await initPromise;
  const result = await kuroshiro.convert(text, { to: 'hiragana', mode: 'raw' });
  return result;
}

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.getFurigana = async (req, res) => {
  try {
    if (typeof req.query.text !== 'string') {
      throw new Error(`Input is not a string`);
    }

    const text = decodeURIComponent(req.query.text);
    if (text.length > 500) {
      throw new Error('Input is too long');
    }

    res.json(await getFurigana(req.query.text));
  } catch (err) {
    res.status(500).send(err.message);
    throw err;
  }
};
