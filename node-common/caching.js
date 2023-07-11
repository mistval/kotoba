const locko = require('locko');
const NodeCache = require('node-cache');
const mongoConnection = require('./mongodb').connection;
const databaseCache = require('./mongoose_models/cache.js')(mongoConnection);

const DEFAULT_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

const inProcessCache = new NodeCache({
  stdTTL: DEFAULT_CACHE_TTL_SECONDS,
  useClones: false,
  maxKeys: 100000,
});

async function getCachedInProcess(key, ttlSeconds, getter) {
  const cached1 = inProcessCache.get(key);
  if (cached1) {
    return cached1;
  }

  return locko.doWithLock(`process_cache:${key}`, async () => {
    const cached2 = inProcessCache.get(key);
    if (cached2) {
      return cached2;
    }

    const value = await getter();
    inProcessCache.set(key, value, ttlSeconds);
    return value;
  });
}

function queryDatabaseCache(key) {
  return databaseCache.findByIdAndUpdate(
    key,
    { $inc: { hits: 1 } },
    {
      projection: {
        _id: 0,
        data: 1,
      }
    }
  ).lean().exec();
}

async function getCachedInDatabase(key, ttlSeconds, getter) {
  const cached1 = await queryDatabaseCache(key);

  if (cached1) {
    return cached1.data;
  }

  return locko.doWithLock(`database_cache:${key}`, async () => {
    const cached2 = await queryDatabaseCache(key);
    if (cached2) {
      return cached2.data;
    }

    const value = await getter();

    await databaseCache.create({
      _id: key,
      data: value,
      hits: 0,
      expires: new Date(Date.now() + ttlSeconds * 1000),
    });

    return value;
  });
}

module.exports = {
  getCachedInProcess,
  getCachedInDatabase,
};
