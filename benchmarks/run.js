const { doRenderBenchmark } = require('./benchmarks/render_text.js');

async function main() {
  await doRenderBenchmark({ parallelism: 1 });
  await doRenderBenchmark({ parallelism: 2 });
  await doRenderBenchmark({ parallelism: 3 });
  await doRenderBenchmark({ parallelism: 4 });
  await doRenderBenchmark({ parallelism: 8 });
  await doRenderBenchmark({ parallelism: 16 });
}

main().then(() => {
  console.log('Done!');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
