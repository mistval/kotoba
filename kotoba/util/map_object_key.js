function mapObjectKey(object, lambda) {
  const newObject = {};
  Object.keys(object).forEach((key) => {
    newObject[key] = lambda(key);
  });

  return newObject;
}

module.exports = mapObjectKey;
