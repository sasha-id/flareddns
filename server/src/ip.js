const net = require('node:net');

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = xff.split(',')[0].trim();
    return stripMapped(first);
  }

  const xri = req.headers['x-real-ip'];
  if (xri) {
    return stripMapped(xri.trim());
  }

  return stripMapped(req.socket.remoteAddress || '');
}

function stripMapped(ip) {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}

function isIPv4(ip) {
  return net.isIPv4(ip);
}

function isIPv6(ip) {
  return net.isIPv6(ip);
}

module.exports = { getClientIp, isIPv4, isIPv6 };
