module.exports = {

  // Required for running Kotoba Discord bot
  bot: {
    botToken: 'your bot token',
    botAdminIds: ['your Discord user ID'],

    // API keys for services used by the bot.
    // You can leave these blank but some features won't work right or won't work at all.
    apiKeys: {
      youtube: '',
      googleTranslate: '',
      forvo: '',
      websterCth: '',
      oxfordAppId: '',
      oxfordApiKey: '',
    },

    // Required for hispadic command
    hispadicApiUri: '',
  },

  // Required for running KotobaWeb.com API
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

  // Required for furigana bot command
  worker: {
    furiganaApiUri: '',
  },
};
