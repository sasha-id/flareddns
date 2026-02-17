function createRateLimiter({ windowMs = 60000, maxRequests = 10 } = {}) {
  const hits = new Map();

  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.windowStart >= windowMs) {
        hits.delete(key);
      }
    }
  }, windowMs);
  sweepInterval.unref();

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

  function destroy() {
    clearInterval(sweepInterval);
    hits.clear();
  }

  return { check, reset, destroy };
}

module.exports = { createRateLimiter };
