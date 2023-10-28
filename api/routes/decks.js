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
const { v4: uuidv4 } = require('uuid');
const { crypto } = require('kotoba-node-common');

const {
  DeckPermissions,
  RESPONSE_PERMISSIONS_HEADER,
  REQUEST_SECRET_HEADER,
  RESPONSE_READWRITE_SECRET_HEADER,
} = require('kotoba-common').deckPermissions;

const MAX_DECKS_PER_USER = 100;
const COERCED_CUSTOM_DECK_DIR = CUSTOM_DECK_DIR.replace('\\api\\node_modules', '');

function filePathForShortName(shortName) {
  assert(deckValidation.SHORT_NAME_ALLOWED_CHARACTERS_REGEX.test(shortName));
  return path.join(COERCED_CUSTOM_DECK_DIR, `${shortName}.json`);
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

async function ensureSecrets(deckMeta) {
  if (!deckMeta.readWriteSecret) {
    const secrets = {
      readWriteSecret: await crypto.generateDeckSecret(),
    };

    await CustomDeckModel.findByIdAndUpdate(deckMeta._id, secrets);
    Object.assign(deckMeta, secrets);
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

      if (!deck) {
        return res.status(404).json({ message: 'Deck not found. It was deleted at some point. If you did not delete it, please report this.' });
      }

      await ensureSecrets(deck);
      req.deckMeta = deck;

      next();
    } catch (err) {
      next(err);
    }
  };
}

function attachPermissions(req, res, next) {
  assert(req.deckMeta, 'Deck meta not attached');
  assert(req.user, 'User not attached');

  const providedSecret = req.header(REQUEST_SECRET_HEADER);

  if (req.deckMeta.owner.equals(req.user._id) || req.user.admin) {
    req.deckPermissions = DeckPermissions.OWNER;
    res.header(RESPONSE_READWRITE_SECRET_HEADER, req.deckMeta.readWriteSecret);
  } else if (providedSecret === req.deckMeta.readWriteSecret) {
    req.deckPermissions = DeckPermissions.READWRITE;
  } else if (!req.deckMeta.hidden) {
    req.deckPermissions = DeckPermissions.READONLY;
  } else {
    req.deckPermissions = DeckPermissions.NONE;
  }

  res.header(RESPONSE_PERMISSIONS_HEADER, req.deckPermissions);

  next();
}

function checkCanViewSecrets(req, res, next) {
  assert(req.deckPermissions, 'Permissions not attached');

  if (req.deckPermissions !== DeckPermissions.OWNER) {
    return res.status(403).send({ message: 'You do not have permission to view this deck\'s secrets.' });
  }

  next();
}

function checkCanViewDeck(req, res, next) {
  assert(req.deckPermissions, 'Permissions not attached');

  if (req.deckPermissions === DeckPermissions.NONE) {
    return res.status(403).send({ message: 'You do not have permission to view this deck.' });
  }

  next();
}

function checkCanDeleteDeck(req, res, next) {
  assert(req.deckPermissions, 'Permissions not attached');

  if (req.deckPermissions !== DeckPermissions.OWNER) {
    return res.status(403).send({ message: 'You do not have permission to delete this deck.' });
  }

  next();
}

function checkCanEditDeck(req, res, next) {
  assert(req.deckPermissions, 'Permissions not attached');
  assert(req.deckMeta, 'Meta not attached');

  if (req.deckPermissions !== DeckPermissions.OWNER && req.deckPermissions !== DeckPermissions.READWRITE) {
    return res.status(403).send({ message: 'You do not have permission to edit this deck.' });
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
  attachPermissions,
  checkCanViewDeck,
  async (req, res, next) => {
    const filePath = filePathForShortName(req.deckMeta.shortName);
    return res.sendFile(filePath, {}, (err) => {
      if (err) {
        next(err);
      }
    });
  },
);

routes.delete(
  '/:id',
  checkAuth,
  createAttachDeckMeta(false),
  attachPermissions,
  checkCanDeleteDeck,
  async (req, res, next) => {
    try {
      await req.deckMeta.deleteOne();
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
  return fs.promises.writeFile(
    filePathForShortName(deck.shortName),
    JSON.stringify(deck),
  );
}

routes.patch(
  '/:id',
  postPatchLimiter,
  checkAuth,
  checkCanCreateDecks,
  createAttachDeckMeta(false),
  attachPermissions,
  checkCanEditDeck,
  checkShortNameUnique,
  attachDeckFull,
  async (req, res, next) => {
    try {
      const oldShortName = req.deckMeta.shortName;

      req.deckMeta.name = req.body.name || req.deckMeta.name;
      req.deckMeta.shortName = req.body.shortName || req.deckMeta.shortName;
      req.deckMeta.lastModified = Date.now();
      req.deckMeta.description = req.body.description || req.deckMeta.description || '';
      req.deckMeta.restrictToServers = req.body.restrictToServers || req.deckMeta.restrictToServers || [];
      req.deckMeta.public = req.body.public ?? req.deckMeta.public ?? false;
      req.deckMeta.hidden = req.body.hidden ?? req.deckMeta.hidden ?? false;

      req.deck.description = req.body.description || req.deck.description || '';
      req.deck.name = req.body.name || req.deck.name;
      req.deck.shortName = req.body.shortName || req.deck.shortName;
      req.deck._id = req.deckMeta._id;
      req.deck.restrictToServers = req.deckMeta.restrictToServers;
      req.deck.public = req.body.public ?? req.deck.public;
      req.deck.hidden = req.body.hidden ?? req.deck.hidden;

      if (req.deck.ownerDiscordUser.id === req.user.discordUser.id) {
        req.deck.ownerDiscordUser = req.user.discordUser;
      }

      if (req.body.appendCards) {
        req.deck.cards = req.deck.cards.concat(req.body.cards);
      } else {
        req.deck.cards = req.body.cards || req.deck.cards;
      }

      req.deck = deckValidation.sanitizeDeckPreValidation(req.deck);
      const validationResult = deckValidation.validateDeck(req.deck, req.user.privileges);

      if (!validationResult.success) {
        return res.status(400).json({
          errorType: deckValidation.DECK_VALIDATION_ERROR_TYPE,
          ...validationResult,
        });
      }

      const promises = [req.deckMeta.save(), writeFullDeck(req.deck)];
      if (oldShortName !== req.deckMeta.shortName) {
        promises.push(fs.promises.unlink(filePathForShortName(oldShortName)));
      }

      await Promise.all(promises);
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
        restrictToServers: req.body.restrictToServers,
        hidden: req.body.hidden || false,
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
      const validationResult = deckValidation.validateDeck(deckFull, req.user.privileges);

      if (!validationResult.success) {
        return res.status(400).json({
          errorType: deckValidation.DECK_VALIDATION_ERROR_TYPE,
          ...validationResult,
        });
      }

      const deckMeta = new CustomDeckModel({
        restrictToServers: deckFull.restrictToServers,
        hidden: deckFull.hidden,
        owner: req.user._id,
        name: deckFull.name,
        shortName: deckFull.shortName,
        lastModified: Date.now(),
        uniqueId: deckFull.uniqueId,
        public: deckFull.public,
        description: deckFull.description,
      });

      await deckMeta.save();
      await ensureSecrets(deckMeta);

      deckFull._id = deckMeta._id;

      await writeFullDeck(deckFull);

      res
        .header(RESPONSE_READWRITE_SECRET_HEADER, deckMeta.readWriteSecret)
        .json({ _id: deckMeta._id });
    } catch (err) {
      next(err);
    }
  },
);

routes.post(
  '/:id/reset_write_secret',
  checkAuth,
  createAttachDeckMeta(false),
  attachPermissions,
  checkCanViewSecrets,
  async (req, res, next) => {
    try {
      req.deckMeta.readWriteSecret = await crypto.generateDeckSecret();
      await req.deckMeta.save();
      res.status(200).send(req.deckMeta.readWriteSecret);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = routes;
