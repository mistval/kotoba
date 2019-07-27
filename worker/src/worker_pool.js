const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const ERROR_CODE = 1;
const SUCCESS_CODE = 0;

class WorkerPool {
  constructor(numWorkers, workerJobsPath) {
    this.idleQueue = [];
    this.dispatchQueue = [];
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

  dispatchNext() {
    const worker = this.idleQueue.shift();
    if (!worker) {
      return;
    }

    const nextJob = this.dispatchQueue.shift();
    if (!nextJob) {
      return;
    }

    worker.once('message', (message) => {
      this.returnWorkerToIdle(worker);

      if (message.code === ERROR_CODE) {
        return nextJob.reject(message.error);
      }

      nextJob.fulfill(message.result);
    });

    worker.once('error', (err) => {
      nextJob.reject(err);
    });

    worker.once('exit', (code) => {
      nextJob.reject(`Worker exited with code: ${code}`);
    });

    worker.postMessage({ jobName: nextJob.jobName, jobArgument: nextJob.jobArgument });
  }

  returnWorkerToIdle(worker) {
    this.idleQueue.push(worker);
    this.dispatchNext();
  }

  dispatch(jobName, jobArgument) {
    return new Promise((fulfill, reject) => {
      this.dispatchQueue.push({ jobName, jobArgument, fulfill, reject });
      this.dispatchNext();
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
      parentPort.postMessage({ code: ERROR_CODE, error: err.toString() });
    }
  });
}

module.exports = WorkerPool;
