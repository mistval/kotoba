const WorkerPool = require('./worker_pool.js');
const path = require('path');

const WORKER_JOBS_PATH = path.join(__dirname, 'worker_jobs.js');
const NUM_WORKERS = parseInt(process.env.NUM_WORKERS || 4);

const pool = new WorkerPool(NUM_WORKERS, WORKER_JOBS_PATH);

pool.dispatch('say something').then((result) => {
  console.log(result);
}).catch((err) => {
  console.warn(err);
});
