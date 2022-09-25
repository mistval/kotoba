const routes = require('express').Router();
const mongoConnection = require('kotoba-node-common').database.connection;
const ReportModel = require('kotoba-node-common').models.createGameReportModel(mongoConnection);
const mongoose = require('mongoose');

routes.get(
  '/:id',
  async (req, res, next) => {
    try {
      let id;
      try {
        id = mongoose.Types.ObjectId.createFromHexString(req.params.id);
      } catch (err) {
        return res.status(404).send();
      }

      const report = await ReportModel
        .findById(id)
        .populate({ path: 'participants', select: '-discordUser.email' })
        .lean()
        .exec();

      if (!report) {
        return res.status(404).json({ message: 'Deck not found. Please check the link.' });
      }

      res.header('Cache-Control', 'max-age=31536000');

      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = routes;
