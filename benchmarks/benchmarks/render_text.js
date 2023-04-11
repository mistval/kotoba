const assert = require('assert');
const pLimit = require('p-limit');
const words = require('../utils/words.json');
const { render } = require('../utils/render_text.js');

async function doRenderBenchmark({
  numWords = 10000,
  parallelism = 4,
  effect = undefined,
  fontSize = undefined,
  font = undefined,
} = {}) {
  const limit = pLimit(parallelism);
  const wordsToUse = words.slice(0, numWords);
  assert(wordsToUse.length === numWords);
  const factoryFunctions = wordsToUse.map((word) => {
    return () => {
      return render(word, undefined, undefined, fontSize, font, effect);
    };
  });

  const timerName = `Rendering ${numWords} words with ${parallelism} parallelism`;
  console.time(timerName);
  await Promise.all(factoryFunctions.map((factoryFunction) => {
    return limit(factoryFunction);
  }));
  console.timeEnd(timerName);
}

module.exports = {
  doRenderBenchmark,
};
