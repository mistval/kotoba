const mapObjectKey = require('./map_object_key.js');

function mapObjectValue(object, lambda) {
  return mapObjectKey(object, (key) => lambda(object[key]));
}

module.exports = mapObjectValue;
