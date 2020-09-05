const express = require('express');
const morgan = require('morgan');
const authInit = require('./auth/auth_init.js');
const session  = require('express-session');
const MongoStore = require('connect-mongo')(session);
const sessionConfig = require('./../config/config.js').api.session;
const readline = require('readline');
const rfs = require('rotating-file-stream');
const moment = require('moment');
const mongoConnection = require('kotoba-node-common').database.connection;
const { initializeResourceDatabase } = require('kotoba-node-common');
const path = require('path');

const app = express();
const server = require('http').Server(app);
const sockets = require('socket.io')(server, { path: '/api/socket.io' });
const kanjiGame = require('./quiz/start.js');
const shiritori = require('./shiritori/socket_server.js');
const routes = require('./routes');

server.listen(process.env.PORT || 80);

/* Set up logging */

const accessLogStream = rfs(
  'access.log',
  {
    interval: '1d',
    path: path.join(__dirname, 'access_logs'),
  },
);

function printUser(req) {
  if (!req.user) {
    return 'Unauthenticated';
  }

  const discordUser = req.user.discordUser || req.user;

  return `Discord user ${discordUser.username}#${discordUser.discriminator} (${discordUser.id})`;
}

function formatLogLine(tokens, req, res) {
  return [
    moment().format('MMMM Do YYYY, h:mm:ss a'),
    `${tokens.method(req, res)} ${tokens.url(req, res)}`,
    `Res status ${tokens.status(req, res)}`,
    `Response time ${tokens['response-time'](req, res)} ms`,
    printUser(req),
  ].join(' -- ')
}

app.use(morgan(formatLogLine, { stream: accessLogStream }));

/* Set up sessions */

const sessionStore = new MongoStore({
  mongooseConnection: mongoConnection,
});

app.use(
  session({
    cookie: {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year. Not really any need to expire sessions regularly.
    },
    secret: sessionConfig.secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  }),
);

/* Set up auth */

authInit(app);

app.use('/api', (req, res, next) => {
  if (!req.user) {
    return next();
  }

  if (req.user.ban) {
    return res.status(403).json({
      banReason: req.user.ban.reason,
    });
  } else {
    return next();
  }
});

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: false, limit: '4mb' }));
app.use('/api/', routes);

app.use((err, req, res, next) => {
  res.status(500).json({ success: false });
});

// Kill the process immediately on SIGINT in Windows.
// Otherwise mongoose keeps it running for a long time
// after SIGINT.
if (process.platform === "win32") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", () => {
    process.exit();
  });
}

const databasePath = path.join(__dirname, 'generated', 'resources.dat');

initializeResourceDatabase(databasePath).then((db) => {
  // Start socket servers
  kanjiGame.startListen(sockets);
  shiritori.startListen(sockets, db);
}).catch((err) => {
  console.warn(err);
  process.exit(1);
});

module.exports = app;
