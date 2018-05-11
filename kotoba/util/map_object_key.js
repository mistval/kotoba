function mapObjectKey(object, lambda) {
  const newObject = {};
  for (const key of Object.keys(object)) {
    newObject[key] = lambda(key);
  }
  return newObject;
}

module.exports = mapObjectKey;
