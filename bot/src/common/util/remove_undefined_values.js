function removeUndefinedValues(obj) {
  const copy = { ...obj };

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) {
      delete copy[key];
    }
  });

  return copy;
}

module.exports = removeUndefinedValues;
