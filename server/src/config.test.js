const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('Config', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('./config')];
  });

  it('should parse DDNS_USERS into array of {username, password}', () => {
    process.env.DDNS_USERS = 'user1:pass1,user2:pass2';
    const config = require('./config');
    assert.deepStrictEqual(config.ddnsUsers, [
      { username: 'user1', password: 'pass1' },
      { username: 'user2', password: 'pass2' },
    ]);
  });

  it('should handle single DDNS user', () => {
    process.env.DDNS_USERS = 'ddns:secret';
    const config = require('./config');
    assert.deepStrictEqual(config.ddnsUsers, [
      { username: 'ddns', password: 'secret' },
    ]);
  });

  it('should provide defaults for optional values', () => {
    delete process.env.PORT;
    delete process.env.SESSION_SECRET;
    const config = require('./config');
    assert.strictEqual(config.port, 8080);
    assert.ok(config.sessionSecret.length > 0);
  });
});
