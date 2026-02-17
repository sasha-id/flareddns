const net = require('node:net');

function getClientIp(req) {
  // Use req.ip when available (Express with trust proxy configured)
  if (req.ip) {
    return stripMapped(req.ip);
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
