const routes = require('express').Router();
const checkAuth = require('./../auth/check_auth.js');
const mongoose = require('mongoose');
const { CUSTOM_DECK_DIR } = require('kotoba-node-common').constants;
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const CustomDeckVoteModel = require('kotoba-node-common').models.createCustomDeckVoteModel(mongoConnection);
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-slow-down');
const { deckValidation } = require('kotoba-common');
const uuidv4 = require('uuid/v4');

const MAX_DECKS_PER_USER = 100;

function filePathForShortName(shortName) {
  return path.join(CUSTOM_DECK_DIR, `${shortName}.json`);
}

async function checkShortNameUnique(req, res, next) {
  try {
    assert(req.user, 'No user attached');

    const other = await CustomDeckModel.findOne({ shortName: req.body.shortName }).select('owner').lean().exec();

    if (req.method === 'POST' && other) {
      return res.status(409).json({ message: `There is already a deck with that short name (${req.body.shortName}). Please choose another.` });
    }

    if (req.method === 'PATCH' && other && !other._id.equals(req.deckMeta._id)) {
      return res.status(409).json({ message: `There is already a deck with that short name (${req.body.shortName}). Please choose another.` });
    }

    next();
  } catch (err) {
    next(err);
  }
}

async function checkHas100DecksOrFewer(req, res, next) {
  try {
    assert(req.user, 'No user attached');

    const existingDeckCount = await CustomDeckModel.countDocuments({ owner: req.user._id });
    if (existingDeckCount >= MAX_DECKS_PER_USER) {
      return res.status(403).json({ message: `You already have ${MAX_DECKS_PER_USER} decks, you can\'t add any more.` });
    }

    next();
  } catch (err) {
    next(err);
  }
}

function createAttachDeckMeta(lean) {
  return async (req, res, next) => {
    try {
      let id;
      try {
        id = mongoose.Types.ObjectId.createFromHexString(req.params.id);
      } catch (err) {
        return res.status(404).send();
      }

      let query = CustomDeckModel.findById(id);

      if (lean) {
        query = query.lean();
      }

      const deck = await query.exec();
      req.deckMeta = deck;

      next();
    } catch (err) {
      next(err);
    }
  };
}

function checkDeckMetaAttached(req, res, next) {
  if (!req.deckMeta) {
    return res.status(404).json({ message: 'Deck not found. It was deleted at some point. If you did not delete it, please report this.' });
  }

  next();
}

function checkRequesterIsAuthorized(req, res, next) {
  assert(req.deckMeta, 'No deck meta attached');
  assert(req.user, 'No user attached');

  if (!req.deckMeta.owner.equals(req.user._id) && !req.user.admin) {
    return res.status(403).send({ message: 'That deck does not belong to you. You can only view and edit decks that you own.' });
  }

  next();
}

async function attachDeckFull(req, res, next) {
  try {
    assert(req.deckMeta, 'No deck meta attached');
    const data = await fs.promises.readFile(filePathForShortName(req.deckMeta.shortName), 'utf8');
    req.deck = JSON.parse(data);
    next();
  } catch (err) {
    next(err);
  }
}

function checkCanCreateDecks(req, res, next) {
  if (!req.user.canCreateDecks) {
    return res.status(403).send();
  }

  return next();
}

const getLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  delayAfter: 10,
  delayMs: 250, // .25 seconds
});

routes.get(
  '/:id',
  getLimiter,
  checkAuth,
  createAttachDeckMeta(true),
  checkDeckMetaAttached,
  checkRequesterIsAuthorized,
  attachDeckFull,
  async (req, res) => {
    return res.json(req.deck);
  },
);

routes.delete(
  '/:id',
  checkAuth,
  createAttachDeckMeta(false),
  checkDeckMetaAttached,
  checkRequesterIsAuthorized,
  async (req, res, next) => {
    try {
      await req.deckMeta.delete();
      await CustomDeckVoteModel.deleteMany({ deck: req.deckMeta._id });
      await fs.promises.unlink(filePathForShortName(req.deckMeta.shortName));
      res.send();
    } catch (err) {
      next(err);
    }
  }
);

const postPatchLimiter = rateLimit({
  windowMs: 10000, // 10 seconds
  delayAfter: 2,
  delayMs: 7000, // 7 seconds
});

function writeFullDeck(deck) {
  return new Promise((fulfill, reject) => {
    const outPath = filePathForShortName(deck.shortName);
    fs.writeFile(outPath, JSON.stringify(deck), (err) => {
      if (err) {
        console.warn(err);
        reject(err);
      }

      fulfill();
    });
  });
}

routes.patch(
  '/:id',
  postPatchLimiter,
  checkAuth,
  checkCanCreateDecks,
  createAttachDeckMeta(false),
  checkDeckMetaAttached,
  checkRequesterIsAuthorized,
  checkShortNameUnique,
  attachDeckFull,
  async (req, res, next) => {
    try {
      req.deckMeta.name = req.body.name || req.deckMeta.name;
      req.deckMeta.shortName = req.body.shortName || req.deckMeta.shortName;
      req.deckMeta.lastModified = Date.now();
      req.deckMeta.description = req.body.description || req.deckMeta.description || '';

      if (req.body.public !== undefined) {
        req.deckMeta.public = req.body.public;
        req.deck.public = req.body.public;
      }

      req.deck.description = req.body.description || req.deck.description || '';
      req.deck.name = req.body.name || req.deck.name;
      req.deck.shortName = req.body.shortName || req.deck.shortName;
      req.deck._id = req.deckMeta._id;

      if (req.deck.ownerDiscordUser.id === req.user.discordUser.id) {
        req.deck.ownerDiscordUser = req.user.discordUser;
      }

      if (req.body.appendCards) {
        req.deck.cards = req.deck.cards.concat(req.body.cards);
      } else {
        req.deck.cards = req.body.cards || req.deck.cards;
      }

      req.deck = deckValidation.sanitizeDeckPreValidation(req.deck);
      const validationResult = deckValidation.validateDeck(req.deck);

      if (!validationResult.success) {
        return res.status(400).json({
          errorType: deckValidation.DECK_VALIDATION_ERROR_TYPE,
          ...validationResult,
        });
      }

      await Promise.all([req.deckMeta.save(), writeFullDeck(req.deck)]);
      res.status(200).send();
    } catch (err) {
      next(err);
    }
  }
);

routes.post(
  '/',
  postPatchLimiter,
  checkAuth,
  checkCanCreateDecks,
  checkShortNameUnique,
  checkHas100DecksOrFewer,
  async (req, res, next) => {
    try {
      let deckFull = {
        owner: req.user._id,
        name: req.body.name,
        shortName: req.body.shortName,
        description: req.body.description || '',
        public: req.body.public || false,
        cards: req.body.cards,
        ownerDiscordUser: req.user.discordUser,
        uniqueId: uuidv4(),
      };

      deckFull = deckValidation.sanitizeDeckPreValidation(deckFull);
      const validationResult = deckValidation.validateDeck(deckFull);

      if (!validationResult.success) {
        return res.status(400).json({
          errorType: deckValidation.DECK_VALIDATION_ERROR_TYPE,
          ...validationResult,
        });
      }

      const deckMeta = new CustomDeckModel({
        owner: req.user._id,
        name: deckFull.name,
        shortName: deckFull.shortName,
        lastModified: Date.now(),
        uniqueId: deckFull.uniqueId,
        public: deckFull.public,
        description: deckFull.description,
      });

      await deckMeta.save();

      deckFull._id = deckMeta._id;

      await writeFullDeck(deckFull);

      res.json({ _id: deckMeta._id });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = routes;
