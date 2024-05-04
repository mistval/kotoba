/**
 * Splice an array of elements into smaller chunks
 * @param arr The array to splice
 * @param chunkSize The size of each chunk
 * @param transform The transform function to apply to each chunk (and possibly it's elements)
 * @returns Array[][] Returns an array of pages with an array of fields inside of every page
 */
function chunk(arr, chunkSize, transform = (c) => c) {
  const result = [];
  const arrCopy = [...arr];

  while (arrCopy.length > 0) {
    result.push(arrCopy.splice(0, chunkSize));
  }

  return result.map((c, i) => transform(c, i));
}

// Adapted from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  const newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newArray[i];
    newArray[i] = newArray[j];
    newArray[j] = temp;
  }
  return newArray;
}

function partition(array, partionerFunc) {
  const partition1 = array.filter((el) => partionerFunc(el));
  const partition2 = array.filter((el) => !partionerFunc(el));
  return [partition1, partition2];
}

module.exports = {
  chunk,
  shuffle,
  partition,
};
