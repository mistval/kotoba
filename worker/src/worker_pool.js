const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const ERROR_CODE = 1;
const SUCCESS_CODE = 0;

class WorkerPool {
  constructor(numWorkers, workerJobsPath) {
    this.idleQueue = [];
    this.workerJobsPath = workerJobsPath;
    for (let i = 0; i < numWorkers; i += 1) {
      const worker = new Worker(__filename, { workerData: workerJobsPath });

      worker.once('exit', (code) => {
        console.warn(`Worker exited unexpectedly with code ${code}`);
        for (let i = 0; i < this.idleQueue.length; ++i) {
          if (this.idleQueue[i] === worker) {
            this.idleQueue.splice(i, 1, new Worker(__filename, { workerData: workerJobsPath }));
          }
        }
      });

      this.idleQueue.push(worker);
    }
  }

  dispatch(jobName, data) {
    return new Promise((fulfill, reject) => {
      const idleWorker = this.idleQueue.shift();
      if (!idleWorker) {
        return reject('No available workers');
      }

      idleWorker.once('message', (message) => {
        this.idleQueue.push(idleWorker);

        if (message.code === ERROR_CODE) {
          return reject(message.error);
        }

        fulfill(message.result);
      });

      idleWorker.once('error', (err) => {
        reject(err);
      });

      idleWorker.once('exit', (code) => {
        reject(`Worker exited with code: ${code}`);
      });

      idleWorker.postMessage({ jobName, jobArgument: data });
    });
  }
}

if (!isMainThread) {
  const jobs = require(workerData);

  parentPort.on('message', async (jobData) => {
    const { jobName, jobArgument } = jobData;

    if (!jobs[jobName]) {
      return parentPort.postMessage({ code: ERROR_CODE, error: `Unable to find job '${jobName}' in job module at ${workerData}` });
    }

    try {
      const jobResult = await jobs[jobName](jobArgument);
      parentPort.postMessage({ code: SUCCESS_CODE, result: jobResult});
    } catch (err) {
      parentPort.postMessage({ code: ERROR_CODE, error: err });
    }
  });
}

module.exports = WorkerPool;
