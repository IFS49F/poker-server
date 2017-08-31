const proxyquire = require('proxyquire');
const { expect } = require('chai');

describe('db/redis', () => {
  // override real redis operations during testing
  const redis = proxyquire('../../app/db/redis', {
    // there is no `constructor` in `=>`, so if we are using
    // `=>` instead of `function` here, we will get `TypeError:
    // Redis is not a constructor`.
    'ioredis': function() {
      return {
        get(key) {
          if (key === 'noResults') { return Promise.resolve(null); }

          return Promise.resolve(JSON.stringify({
            team: [],
            show: false
          }));
        },

        set(key, value) {
          return Promise.resolve(value);
        },

        del(key) {
          return Promise.resolve(key);
        }
      };
    }
  });

  describe('redis.get', () => {
    it('should return a rejected promise when the key is invalid', (done) => {
      redis.get(null).catch(done);
    });

    it('should return `null` when returns no results', (done) => {
      redis.get('noResults').then((result) => {
        expect(result).to.be.null;
        done();
      });
    });

    it('should return deserialized value', (done) => {
      redis.get('hasResults').then((result) => {
        expect(result).to.deep.equal({
          team: [],
          show: false
        });
        done();
      });
    });
  });

  describe('redis.set', () => {
    it('should return a rejected promise when the key is invalid', (done) => {
      redis.set(null, 'value').catch(done);
    });

    it('should pass through key and string value to redis', (done) => {
      redis.set('key', 'value').then((result) => {
        expect(result).to.equal('value');
        done();
      });
    });

    it('should pass through key and auto-serialized value to redis', (done) => {
      redis.set('key', {
        key: 'value'
      }).then((result) => {
        expect(result).to.equal(JSON.stringify({
          key: 'value'
        }));
        done();
      });
    });
  });

  describe('redis.del', () => {
    it('should return a rejected promise when the key is invalid', (done) => {
      redis.del(null).catch(done);
    });

    it('should delete record via key', (done) => {
      redis.del('key').then((result) => {
        expect(result).to.equal('key');
        done();
      });
    });
  });
});
