const path = require('path');
const polka = require('polka');
const send = require('@polka/send-type');
const calculateStats = require('./quizstats/calculate.js');
const renderFurigana = require('./render_furigana.js');

const PORT = parseInt(process.env.PORT || 80, 10);

polka().get('/users/:userId/quizstats', async (req, res) => {
  const result = await calculateStats(req.params.userId);
  if (result) {
    return send(res, 200, result);
  }
  return send(res, 404);
}).get('/furigana/rendered', async (req, res) => {
  try {
    const result = await renderFurigana(
      req.query.text,
      req.query.size,
      req.query.color,
      req.query.background_color,
      req.query.font_alias,
    );

    send(res, 200, result, { 'Content-Type': 'image/png' });
  } catch (err) {
    send(res, 500, { message: err.message, stack: err.stack });
  }
}).listen(PORT, (err) => {
  if (err) {
    console.warn('Error starting');
    console.warn(err);
    process.exit(1);
  }
});
