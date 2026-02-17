function createRateLimiter({ windowMs = 60000, maxRequests = 10 } = {}) {
  const hits = new Map();

  function check(key) {
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  function reset() {
    hits.clear();
  }

  return { check, reset };
}

module.exports = { createRateLimiter };
