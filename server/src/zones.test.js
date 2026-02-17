const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Zone matching', () => {
  const { findZoneForHostname } = require('./zones');

  const zones = [
    { id: 'z1', name: 'example.com' },
    { id: 'z2', name: 'example.co.id' },
    { id: 'z3', name: 'sub.example.com' },
    { id: 'z4', name: 'test.org' },
  ];

  it('should match simple hostname to zone', () => {
    const result = findZoneForHostname('home.example.com', zones);
    assert.strictEqual(result.id, 'z1');
  });

  it('should match multi-part TLD correctly', () => {
    const result = findZoneForHostname('home.example.co.id', zones);
    assert.strictEqual(result.id, 'z2');
  });

  it('should prefer longest match (sub.example.com over example.com)', () => {
    const result = findZoneForHostname('deep.sub.example.com', zones);
    assert.strictEqual(result.id, 'z3');
  });

  it('should match bare zone name', () => {
    const result = findZoneForHostname('test.org', zones);
    assert.strictEqual(result.id, 'z4');
  });

  it('should return null for no match', () => {
    const result = findZoneForHostname('unknown.net', zones);
    assert.strictEqual(result, null);
  });

  it('should not match partial zone names', () => {
    const result = findZoneForHostname('notexample.com', zones);
    assert.strictEqual(result, null);
  });
});
