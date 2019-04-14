const express = require('express');
const morgan = require('morgan');
const authInit = require('./auth/auth_init.js');
const session  = require('express-session');
const MongoStore = require('connect-mongo')(session);
const config = require('./config.js');
const readline = require('readline');
const rfs = require('rotating-file-stream');
const moment = require('moment');
const mongoConnection = require('kotoba-node-common').database.connection;

const app = express();
const server = require('http').Server(app);
const sockets = require('socket.io')(server, { path: '/api/socket.io' });
const kanjiGame = require('./quiz/start.js');
const shiritori = require('./shiritori/socket_server.js');
const routes = require('./routes');

server.listen(process.env.PORT || 80);

/* Set up logging */

const loggingConfig = config.logging;

const accessLogStream = rfs(
  'access.log',
  {
    interval: '1d',
    path: loggingConfig.logFilePath,
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

const sessionConfig = config.session;

const sessionStore = new MongoStore({
  mongooseConnection: mongoConnection,
});

app.use(
  session({
    secret: sessionConfig.secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  }),
);

/* Set up auth */

authInit(app);

/* Allow cross origin from localhost for dev */

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: false, limit: '4mb' }));
app.use('/api/', routes);

// Start socket servers
kanjiGame.startListen(sockets);
shiritori.startListen(sockets);

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

module.exports = app;
