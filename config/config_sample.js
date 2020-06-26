module.exports = {

  // Required for running Kotoba Discord bot
  bot: {
    botToken: 'your bot token', // REQUIRED
    botAdminIds: ['your Discord user ID'], // OPTIONAL

    // API keys for services used by the bot.
    // You can leave these blank but some features won't work right or won't work at all.
    apiKeys: {
      youtube: '', // OPTIONAL but jukebox command won't work without it
      googleTranslate: '', // OPTIONAL but translate command won't work without it
      forvo: '', // OPTIONAL but pronounce command won't return forvo tracks without it
      websterCth: '', // OPTIONAL but certain quiz decks won't work right without it
      oxfordAppId: '', // OPTIONAL but certain quiz decks won't work right without it
      oxfordApiKey: '', // OPTIONAL but certain quiz decks won't work right without it
    },

    hispadicApiUri: '', // OPTIONAL but hispadic command won't work without it
  },

  // Required if running KotobaWeb.com API
  api: {
    domain: 'http://localhost', // the domain that you're running the API on.
    contactWebhookAddress: 'https://discordapp.com/api/webhooks/xxxxx/yyyyy', // The address of a Discord webhook to send contact form mail to
    auth: {
      discord: {
        clientId: 'your Discord application client ID for OAuth2',
        clientSecret: 'your Discord application client secret for OAuth2',
      },
      adminDiscordIds: ['your discord ID'],
    },
    session: {
      secret: 'a secret for sessions. you can enter anything here, just make it long and unguessable and then never change it',
    },
  },

  worker: {
    furiganaApiUri: '', // OPTIONAL but furigana command won't work without it
  },
};
