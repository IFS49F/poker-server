const Redis = require('ioredis');
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const ts = new Date().getTime();
const redis = new Redis(redisUrl, {
  keyPrefix: `poker:${ts}:`
});
const isInvalidKey = (key) => !key || (typeof key !== 'string');

module.exports = {
  get(key) {
    if (isInvalidKey(key)) { return Promise.reject(); }

    return redis.get(key).then(result => {
      if (!result) { return null; }
      return JSON.parse(result);
    });
  },

  set(key, str) {
    if (isInvalidKey(key)) { return Promise.reject(); }

    const value = typeof str !== 'string' ? JSON.stringify(str) : str;
    return redis.set(key, value);
  },

  del(key) {
    if (isInvalidKey(key)) { return Promise.reject(); }

    return redis.del(key);
  }
};
