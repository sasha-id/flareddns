const express = require('express');
const session = require('express-session');
const path = require('node:path');
const config = require('./config');
const { getDb, getSetting, setSetting, close } = require('./db');

const app = express();

// Trust first proxy hop (nginx, traefik, etc.)
app.set('trust proxy', 1);

const SQLiteStore = require('connect-sqlite3')(session);
app.use(session({
  store: new SQLiteStore({
    dir: path.join(__dirname, '..', '..', 'data'),
    db: 'sessions.db',
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Init database before starting — fail fast on schema errors
getDb();

// Seed CF_API_TOKEN from env if DB has none
if (config.cfApiToken && !getSetting('cf_api_token')) {
  setSetting('cf_api_token', config.cfApiToken);
}

const { createAuthRouter } = require('./routes/auth');
const { createSetupRouter } = require('./routes/setup');
const { createApiRouter } = require('./routes/api');
const { createDdnsRouter } = require('./routes/ddns');

app.use(createDdnsRouter());
app.use('/api/auth', createAuthRouter());
app.use('/api/setup', createSetupRouter());
app.use('/api', createApiRouter());

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Express error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`FlareDDNS running on port ${config.port}`);
});

function shutdown() {
  console.log('Shutting down...');
  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(() => {
    clearTimeout(forceExit);
    close();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
