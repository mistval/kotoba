const routes = require('express').Router();
const mongoConnection = require('kotoba-node-common').database.connection;
const ReportModel = require('kotoba-node-common').models.createGameReportModel(mongoConnection);

routes.get(
  '/:id',
  async (req, res) => {
    const report = await ReportModel
      .findById(req.params.id)
      .populate({ path: 'participants', select: '-discordUser.email' })
      .lean()
      .exec();

    if (!report) {
      return res.status(404).json({ message: 'Deck not found. Please check the link.' });
    }

    res.json(report);
  }
);

module.exports = routes;
