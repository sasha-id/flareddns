const crypto = require('node:crypto');

function parseDdnsUsers(raw) {
  if (!raw) return [];
  return raw.split(',').map(entry => {
    const [username, ...rest] = entry.trim().split(':');
    return { username, password: rest.join(':') };
  });
}

const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'changeme',
  ddnsUsers: parseDdnsUsers(process.env.DDNS_USERS),
  cfApiToken: process.env.CF_API_TOKEN || '',
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  dbPath: process.env.DB_PATH || undefined,
};

module.exports = config;
