const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('IP detection', () => {
  const { getClientIp, isIPv4, isIPv6 } = require('./ip');

  it('should use req.ip when available (Express trust proxy)', () => {
    const req = {
      ip: '1.2.3.4',
      socket: { remoteAddress: '127.0.0.1' },
    };
    assert.strictEqual(getClientIp(req), '1.2.3.4');
  });

  it('should fall back to socket address when req.ip is not set', () => {
    const req = {
      socket: { remoteAddress: '192.168.1.1' },
    };
    assert.strictEqual(getClientIp(req), '192.168.1.1');
  });

  it('should strip IPv6-mapped IPv4 prefix from req.ip', () => {
    const req = {
      ip: '::ffff:192.168.1.1',
      socket: { remoteAddress: '::ffff:192.168.1.1' },
    };
    assert.strictEqual(getClientIp(req), '192.168.1.1');
  });

  it('should strip IPv6-mapped IPv4 prefix from socket', () => {
    const req = {
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
