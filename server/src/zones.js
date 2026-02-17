function findZoneForHostname(hostname, zones) {
  const sorted = [...zones].sort((a, b) => b.name.length - a.name.length);

  for (const zone of sorted) {
    if (hostname === zone.name || hostname.endsWith('.' + zone.name)) {
      return zone;
    }
  }

  return null;
}

module.exports = { findZoneForHostname };
