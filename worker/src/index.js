const WorkerPool = require('./worker_pool.js');
const path = require('path');
const polka = require('polka');
const send = require('@polka/send-type');

const PORT = parseInt(process.env.PORT || 80);
const WORKER_JOBS_PATH = path.join(__dirname, 'worker_jobs.js');
const NUM_WORKERS = parseInt(process.env.NUM_WORKERS || 4);

const workerPool = new WorkerPool(NUM_WORKERS, WORKER_JOBS_PATH);
const cachedStatsForUser = {};

polka().get('/users/:userId/quizstats/data', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await workerPool.dispatch(
      'calculateStats',
      {
        userId,
        cachedStats: cachedStatsForUser[req.params.userId],
      },
    );

    cachedStatsForUser[userId] = result;
    return send(res, 200, result);
  } catch (err) {
    return send(res, 500, err);
  }
}).listen(PORT, (err) => {
  if (err) {
    console.warn(`Error starting`);
    console.warn(err);
    process.exit(1);
  }
});
