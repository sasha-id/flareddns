const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { createRateLimiter } = require('./ratelimit');

describe('Rate limiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = createRateLimiter({ windowMs: 1000, maxRequests: 3 });
  });

  it('should allow requests under the limit', () => {
    assert.strictEqual(rateLimiter.check('host1'), true);
    assert.strictEqual(rateLimiter.check('host1'), true);
    assert.strictEqual(rateLimiter.check('host1'), true);
  });

  it('should block requests over the limit', () => {
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    assert.strictEqual(rateLimiter.check('host1'), false);
  });

  it('should track hostnames independently', () => {
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    assert.strictEqual(rateLimiter.check('host1'), false);
    assert.strictEqual(rateLimiter.check('host2'), true);
  });

  it('should clear all limits on reset', () => {
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    assert.strictEqual(rateLimiter.check('host1'), false);
    rateLimiter.reset();
    assert.strictEqual(rateLimiter.check('host1'), true);
  });

  it('should reset after window expires', async () => {
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    rateLimiter.check('host1');
    assert.strictEqual(rateLimiter.check('host1'), false);
    await new Promise(r => setTimeout(r, 1100));
    assert.strictEqual(rateLimiter.check('host1'), true);
  });
});
