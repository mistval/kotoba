const polka = require('polka');
const send = require('@polka/send-type');
const calculateStats = require('./quizstats/calculate_stats.js');

const PORT = parseInt(process.env.PORT || 80);

const cachedStatsForUser = {};

function start() {
  return polka()
    .get('/users/:id/quizstats/data', async (req, res) => {
      const result = await calculateStats(req.params.id);
      return send(res, 200, result);
    })
    .listen(PORT, (err) => {
      if (err) {
        console.warn(`Error starting`);
        console.warn(err);
        process.exit(1);
      }
    });
}

module.exports = start;
