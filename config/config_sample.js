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
    dynamicDecksUrl: '', // OPTIONAL if specified then deck_list.json will be (lazily) fetched from this URL instead of using the default deck_list.json
    botWebClientBaseUri: 'https://kotobaweb.com', // If you're going to run kotobaweb, put the base URI here
  },

  // Required for running KotobaWeb.com API (can be ignored if you're only running the bot)
  api: {
    domain: 'http://localhost', // REQUIRED the domain that you're running the API on. The default value here is correct for running the API on your own machine.
    contactWebhookAddress: 'https://discordapp.com/api/webhooks/xxxxx/yyyyy', // OPTIONAL but the contact form won't work without it.
    auth: {
      discord: {
        clientId: 'your Discord application client ID for OAuth2', // OPTIONAL but login won't work without it
        clientSecret: 'your Discord application client secret for OAuth2', // OPTIONAL but login won't work without it
      },
      adminDiscordIds: ['your discord ID'], // OPTIONAL (allows you to edit/delete anyone's custom deck if you're in this array)
    },
    session: {
      secret: 'a secret for sessions. you can enter anything here, just make it long and unguessable and then never change it', // OPTIONAL but login will be insecure without it
    },
  },

  // Required for running the worker process (it's necessary only for certain bot features like furigana and quiz stats)
  worker: {
    furiganaApiUri: '', // OPTIONAL but furigana command won't work without it
  },
};
