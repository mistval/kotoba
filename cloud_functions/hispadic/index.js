const edictIndex = require('edict-index');
const hispadic = require('./hispadic.js');

const MAX_RESULTS = 20;

const index = edictIndex.buildIndex(hispadic);

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.search = (req, res) => {
  const results = index.search(decodeURIComponent(req.query.query), MAX_RESULTS);
  res.status(200).json(results);
};
