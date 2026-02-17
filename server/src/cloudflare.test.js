const { describe, it, before, after, mock } = require('node:test');
const assert = require('node:assert');

describe('Cloudflare API client', () => {
  let cf;

  before(() => {
    global.originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = global.originalFetch;
  });

  it('should validate a token successfully', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, result: { id: 'abc', status: 'active' } }),
    }));

    cf = require('./cloudflare');
    const result = await cf.validateToken('test-token');
    assert.strictEqual(result.valid, true);
  });

  it('should return invalid for bad token', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      json: async () => ({ success: false, errors: [{ message: 'Invalid token' }] }),
    }));

    delete require.cache[require.resolve('./cloudflare')];
    cf = require('./cloudflare');
    const result = await cf.validateToken('bad-token');
    assert.strictEqual(result.valid, false);
  });

  it('should list zones', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        result: [{ id: 'z1', name: 'example.com', status: 'active' }],
        result_info: { total_pages: 1 },
      }),
    }));

    delete require.cache[require.resolve('./cloudflare')];
    cf = require('./cloudflare');
    const zones = await cf.listZones('test-token');
    assert.strictEqual(zones.length, 1);
    assert.strictEqual(zones[0].name, 'example.com');
  });
});
