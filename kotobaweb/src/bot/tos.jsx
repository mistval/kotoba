import React from 'react';
import { NavLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Analytics from '../util/analytics';
import Header from './header';

const policy = `We'll keep it short and sweet.

I reserve the right to restrict your usage of the bot at any time for any reason.

That being said I'm not going to do that unless you're being a jerk. I can and do ban people from using the bot, but it's a rare occurrence. Here are some things that may get you banned:

- Using bot features to harrass anyone or any server
- Creating public custom quiz decks that are offensive (if you do want to make quiz decks with graphic language, they must be private and have an unguessable name)
- Attempting to attack the bot itself in any way
- Being extremely disruptive in the support server

Use the bot in good faith and you will be fine.

If you do for whatever reason get banned from using the bot, I will normally accept an apology if I believe it is sincere.`;

function render() {
  Analytics.setPageView('/bot/tos');

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
