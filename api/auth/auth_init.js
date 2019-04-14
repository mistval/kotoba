const passport = require('passport');
const authConfig = require('./../config.js').auth;
const DiscordPassportStrategy = require('passport-discord').Strategy;
const mongoConnection = require('kotoba-node-common').database.connection;
const UserModel = require('kotoba-node-common').models.createUserModel(mongoConnection);

function initialize(app) {
  passport.serializeUser(async (discordUser, done) => {
    let user = await UserModel.findOne({ 'discordUser.id': discordUser.id });

    if (!user) {
      // Register new user
      user = new UserModel({
        discordUser,
        gameReports: [],
        customDecks: [],
      });
    } else {
      // Update user Discord info
      user.discordUser = discordUser;
    }

    user.admin = authConfig.adminDiscordIds.some(adminId => adminId === discordUser.id);

    await user.save();
    done(null, user._id);
  });

  passport.deserializeUser(async (userId, done) => {
    const user = await UserModel.findById(userId);
    done(null, user);
  });
  
  const scopes = ['identify', 'guilds'];
  const strategy = new DiscordPassportStrategy({
    clientID: authConfig.discord.clientId,
    clientSecret: authConfig.discord.clientSecret,
    callbackURL: authConfig.discord.callbackUrl,
    scope: scopes,
  },
  (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
  });
  
  passport.use(strategy);

  app.use(passport.initialize());
  app.use(passport.session());

  app.get(
    '/api/login',
    passport.authenticate('discord', { scope: scopes }),
    () => {},
  );

  app.get(
    authConfig.discord.callbackRoute,
    passport.authenticate('discord'),
    async (req, res) => {
      res.redirect('/dashboard');
    },
  );

  app.get(
    '/api/logout',
    (req, res) => {
      req.logout();
      res.redirect('/dashboard');
    },
  );
}

module.exports = initialize;
