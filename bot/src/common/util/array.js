function chunk(arr, chunkSize) {
  const result = [];
  const arrCopy = [...arr];

  while (arrCopy.length > 0) {
    result.push(arrCopy.splice(0, chunkSize));
  }

  return result;
}

module.exports = {
  chunk,
};
