const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('IP detection', () => {
  const { getClientIp, isIPv4, isIPv6 } = require('./ip');

  it('should prefer X-Forwarded-For header', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    assert.strictEqual(getClientIp(req), '1.2.3.4');
  });

  it('should use X-Real-IP if no X-Forwarded-For', () => {
    const req = {
      headers: { 'x-real-ip': '5.6.7.8' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    assert.strictEqual(getClientIp(req), '5.6.7.8');
  });

  it('should fall back to socket address', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '192.168.1.1' },
    };
    assert.strictEqual(getClientIp(req), '192.168.1.1');
  });

  it('should strip IPv6-mapped IPv4 prefix', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '::ffff:192.168.1.1' },
    };
    assert.strictEqual(getClientIp(req), '192.168.1.1');
  });

  it('should detect IPv4 addresses', () => {
    assert.strictEqual(isIPv4('1.2.3.4'), true);
    assert.strictEqual(isIPv4('2001:db8::1'), false);
    assert.strictEqual(isIPv4('not-an-ip'), false);
  });

  it('should detect IPv6 addresses', () => {
    assert.strictEqual(isIPv6('2001:db8::1'), true);
    assert.strictEqual(isIPv6('1.2.3.4'), false);
  });
});
