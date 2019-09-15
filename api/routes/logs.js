const routes = require('express').Router();
const checkAuth = require('./../auth/check_auth.js');
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'access_logs');

fs.mkdirSync(logDir, { recursive: true });

function checkIsAdmin(req, res, next) {
  if (!req.user.admin) {
    return res.status(403).json({ message: 'Admin only' });
  }

  next();
}

function getLogFileNames() {
  return new Promise((fulfill, reject) => {
    fs.readdir(logDir, (err, files) => {
      if (err) {
        return reject(err);
      }

      fulfill(files);
    });
  });
}

async function readLogFile(fileIndex) {
  const fileNames = await getLogFileNames();

  return new Promise((fulfill, reject) => {
    const filePath = path.join(logDir, fileNames[fileIndex]);
    fs.readFile(filePath, 'utf8', (err, text) => {
      if (err) {
        return reject(err);
      }

      fulfill(text);
    });
  });
}

routes.get(
  '/:fileIndex',
  checkAuth,
  checkIsAdmin,
  async (req, res) => {
    try {
      const fileText = await readLogFile(parseInt(req.params.fileIndex));
      res.json({ content: fileText });
    } catch (err) {
      res.status(500).json({ message: 'Error getting log file' });
    }
  }
);

routes.get(
  '/',
  checkAuth,
  checkIsAdmin,
  async (req, res) => {
    try {
      const fileNames = await getLogFileNames();
      res.json(fileNames);
    } catch (err) {
      res.status(500).json({ message: 'Error getting log files' });
    }
  },
);

module.exports = routes;
