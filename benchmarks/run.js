const { doFTSQueryBenchmark } = require('./benchmarks/query_quiz_fts.js');
const { doRenderBenchmark } = require('./benchmarks/render_text.js');

async function main() {
  await doFTSQueryBenchmark(100_000);
  await doRenderBenchmark({ parallelism: 1 });
  await doRenderBenchmark({ parallelism: 2 });
  await doRenderBenchmark({ parallelism: 3 });
  await doRenderBenchmark({ parallelism: 4 });
  await doRenderBenchmark({ parallelism: 8 });
  await doRenderBenchmark({ parallelism: 16 });
  await doRenderBenchmark({ parallelism: 4, effect: 'antiocr', numWords: 1000 });
}

main().then(() => {
  console.log('Done!');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
