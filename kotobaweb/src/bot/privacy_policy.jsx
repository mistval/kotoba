import React from 'react';
import { NavLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Analytics from '../util/analytics';
import Header from './header';

const policy = `When you use Kotoba bot certain information is collected about you. That information is as follows:

1. Game scores - Scores that you achieved in quiz, shiritori, or other games.
2. Basic user information - Username, avatar link, Discord user ID.
3. Custom quiz decks - Quiz decks that you have created on this website.
4. Custom quiz deck votes - Votes you submitted by thumbsing-up or thumbsing-down a message when prompted by the bot.
5. Quiz session reports - Statistics about questions you answered correctly/incorrectly in the quiz feature.
6. Settings - Settings that you set via the settings command.
7. Command usage logs - Your interactions with the bot, including command usage, are logged. These logs are for debugging and identifying abuse. These logs are automatically deleted after 30 days.

If you do not interact directly with the bot, then no information about you is stored in any way.

Except for user data that is publicly visible via bot features (such as the leaderboard command), your data is not shared with anyone and never will be. Only one person has access to this data.

You have control over your data:
* Use the **k!deletemydata** command to delete all your data from the database. Most data will be deleted immediately, but it may take up to 30 days for usage logs and database backups to be deleted.
* Use the **k!banme** command to ban yourself from using the bot. The bot will completely ignore you and no more data will be stored for you.

If you have any concerns about privacy or anything else, please either join our server or use the contact form on this website, both are linked below.

The bottom line is that we are not interested in profiting from or snooping around in your data and data is collected solely for enabling better experiences for users.`;

function render() {
  Analytics.setPageView('/bot/privacy');

  return (
    <div className="container-fluid">
      <Header />
      <div className="container">
        <ReactMarkdown>{policy}</ReactMarkdown>
        <p>
          <a href="https://discord.gg/S92qCjbNHt">Support Server</a>
        </p>
        <p>
          <NavLink to="/about">Contact Form</NavLink>
        </p>
      </div>
    </div>
  );
}

export default render;
