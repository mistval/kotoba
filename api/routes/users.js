const routes = require('express').Router();
const checkAuth = require('./../auth/check_auth.js');
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const GameReportModel = require('kotoba-node-common').models.createGameReportModel(mongoConnection);

routes.get(
  '/me',
  checkAuth,
  async (req, res, next) => {
    try {
      const response = {
        ...req.user.toJSON({ virtuals: true }),
        privileges: req.user.privileges,
      };

      delete response.antiPrivileges;

      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

routes.get(
  '/me/game_reports',
  checkAuth,
  async (req, res, next) => {
    try {
      const reports = await GameReportModel
        .find({ participants: req.user })
        .sort({ startTime: -1 })
        .limit(40)
        .select('sessionName startTime discordServerName discordServerIconUri')
        .lean()
        .exec();

      res.json(reports);
    } catch (err) {
      next(err);
    }
  },
);

routes.get(
  '/me/decks',
  checkAuth,
  async (req, res, next) => {
    try {
      const decks = await CustomDeckModel.find({ owner: req.user._id }).lean().exec();
      return res.json(decks);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = routes;
