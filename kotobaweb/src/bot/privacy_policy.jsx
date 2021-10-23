import React from 'react';
import { NavLink } from 'react-router-dom';
import Analytics from '../util/analytics';
import Header from './header';

const policy = `When you use Kotoba bot certain information is collected about you. That information has main two forms:

1. Usage logs. Your interactions with the bot, including command usage, are logged. These logs are for debugging and identifying abuse. These logs are automatically deleted after 30 days.

2. User data. This includes things like settings you set, quiz decks you created, scores you achieved, and your username and avatar. This data is kept exclusively for purposes of providing bot features for you as a user.

If you do not interact directly with the bot, then no information about you is stored in any way.

Except for user data that is visible via bot commands (such as the leaderboard command), your data is not shared with anyone and never will be. Only one person has access to this data.

If you want your data deleted you can message me on Discord (K33#5261) or use the contact form linked below.

You may also completely opt out of all future data collection by requesting to be blacklisted from using the bot. The bot will then comprehensively ignore you.

The bottom line is that I'm not interested in profiting from or snooping around in your data and data is collected solely for enabling better experiences for users.`;

function PrivacyPolicy() {
  const policyLines = policy.split(/\n\n/g).map(l => l.trim()).filter(l => l);
  return policyLines.map(text => (
    <p key={text}>{text}</p>
  ));
}

function render() {
  Analytics.setPageView('/bot/privacy');

  return (
    <div className="container-fluid">
      <Header />
      <div className="container">
        <PrivacyPolicy />
        <p>
          <NavLink to="/about">Contact Form</NavLink>
        </p>
      </div>
    </div>
  );
}

export default render;
