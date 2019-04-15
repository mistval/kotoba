const routes = require('express').Router();
const checkAuth = require('./../auth/check_auth.js');
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(mongoConnection);

routes.get(
  '/me',
  checkAuth,
  (req, res) => {
    return res.json(req.user);
  },
);

routes.get(
  '/me/game_reports',
  checkAuth,
  async (req, res) => {
    const allReports = await GameReportModel.find({});
    const reports = await GameReportModel
      .find({ participants: req.user })
      .sort({ startTime: -1 })
      .limit(40)
      .select('sessionName startTime discordServerName discordServerIconUri')
      .lean()
      .exec();

    res.json(reports);
  },
);

routes.get(
  '/me/decks',
  checkAuth,
  async (req, res) => {
    const decks = await CustomDeckModel.find({ owner: req.user._id }).lean().exec();
    return res.json(decks);
  },
);

module.exports = routes;
