const express = require('express');
const fs = require('fs');
const path = require('path');
const session  = require('express-session');
const MongoStore = require('connect-mongo')(session);
const { ErrorReporting } = require('@google-cloud/error-reporting');
const { Logging } = require('@google-cloud/logging');
const readline = require('readline');
const mongoConnection = require('kotoba-node-common').database.connection;
const { initializeResourceDatabase } = require('kotoba-node-common');
const authInit = require('./auth/auth_init.js');
const sessionConfig = require('./../config/config.js').api.session;

const app = express();
const server = require('http').Server(app);
const sockets = require('socket.io')(server, { path: '/api/socket.io' });
const kanjiGame = require('./quiz/start.js');
const shiritori = require('./shiritori/socket_server.js');
const routes = require('./routes');

const GCLOUD_KEY_PATH = path.join(__dirname, '..', 'config', 'gcloud_key.json');
const hasGCloudKey = fs.existsSync(GCLOUD_KEY_PATH);

const errors = hasGCloudKey
  ? new ErrorReporting({ keyFilename: GCLOUD_KEY_PATH })
  : undefined;

server.listen(process.env.PORT || 80);

/* Set up logging */

if (hasGCloudKey) {
  const logging = new Logging({ keyFilename: GCLOUD_KEY_PATH });
  const log = logging.log('kotoba-api');

  let logEntryQueue = [];

  setInterval(async () => {
    try {
      if (logEntryQueue.length > 0) {
        const logEntries = logEntryQueue;
        logEntryQueue = [];
        await log.write(logEntries);
      }
    } catch (err) {
      console.warn(err);
    }
  }, 60000);

  const logMetadata = {
    resource: { type: 'global' },
    severity: 'INFO',
  };

  app.use(function(req, res, next) {
    const startTime = Date.now();

    res.on("finish", async function() {
      try {
        const finishTime = Date.now();
        const responseTime = finishTime - startTime;

        const logInfo = {
          method: req.method,
          route: req.originalUrl,
          ip: req.ip,
          statusCode: res.statusCode,
          startTime,
          finishTime,
          responseTime,
        };

        if (req.user) {
          logInfo.user = {
            id: JSON.stringify(req.user._id),
            discordUser: {},
          };

          if (req.user.discordUser) {
            logInfo.user.discordUser.id = req.user.discordUser.id;
            logInfo.user.discordUser.username = req.user.discordUser.username;
            logInfo.user.discordUser.discriminator = req.user.discordUser.discriminator;
          }
        }

        if (logEntryQueue.length < 1000) {
          logEntryQueue.push(log.entry(logMetadata, logInfo));
        }
      } catch (err) {
        console.warn(err);
      }
    });

    next();
  });
} else {
  console.warn('No Google Cloud key found. Logs will not be sent to Stackdriver.');
}

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

if (errors) {
  app.use(errors.express);
}

app.use((err, req, res, next) => {
  console.warn(err);
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

const db = initializeResourceDatabase(databasePath);

// Start socket servers
kanjiGame.startListen(sockets);
shiritori.startListen(sockets, db);

module.exports = app;
