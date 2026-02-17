const express = require('express');
const session = require('express-session');
const path = require('node:path');
const config = require('./config');
const { getDb, close } = require('./db');

const app = express();

app.set('trust proxy', true);

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
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

getDb();

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

const server = app.listen(config.port, () => {
  console.log(`FlareDDNS running on port ${config.port}`);
});

function shutdown() {
  console.log('Shutting down...');
  server.close(() => {
    close();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
