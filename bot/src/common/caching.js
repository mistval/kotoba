const locko = require('locko');
const Cache = require('node-cache');

const DEFAULT_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

const cache = new Cache({
  stdTTL: DEFAULT_CACHE_TTL_SECONDS,
  useClones: false,
  maxKeys: 100000,
});

async function getCached(key, ttl, getter) {
  const cached1 = cache.get(key);
  if (cached1) {
    return cached1;
  }

  return locko.doWithLock(`cache:${key}`, async () => {
    const cached2 = cache.get(key);
    if (cached2) {
      return cached2;
    }

    const value = await getter();
    cache.set(key, value, ttl);
    return value;
  });
}

module.exports = {
  getCached,
};
