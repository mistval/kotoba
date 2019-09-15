function chunk(arr, chunkSize) {
  const result = [];
  const arrCopy = [...arr];

  while (arrCopy.length > 0) {
    result.push(arrCopy.splice(0, chunkSize));
  }

  return result;
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

module.exports = {
  chunk,
  shuffle,
};
