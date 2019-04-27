// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */
/* eslint max-len: 0 */

import React from 'react';

class ManualSection {
  constructor(title, content) {
    this.title = title;
    this.content = () => content;
  }
}

const manualSections = [];

manualSections.push(new ManualSection(
  'Basic help',
  (<p>To see available quiz decks, start a quiz, and see other basic help, just say <span className="example">k!quiz</span>.</p>),
));

manualSections.push(new ManualSection(
  'Custom Decks',
  (
    <p>You can create custom decks and import/export them from CSV in the <a href="/dashboard">the dashboard</a>.</p>
  ),
));

manualSections.push(new ManualSection(
  'Score Limit',
  (<p>The score limit of a quiz can be configured by specifying a number after the quiz name. For example: <span className="example">k!quiz N1 20</span> for a JLPT N1 quiz with a score limit of 20. Note that this does not apply to conquest or inferno mode quizzes (because they do not have a score limit). For those, the first number after the deck name is the question delay. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Question Delay',
  (<p>The delay between questions can be configured by specifying a number in seconds after the score limit. For example: <span className="example">k!quiz N1 20 1</span> for a JLPT N1 quiz with a score limit of 20 and a delay of 1 second in between questions. For conquest and inferno mode, omit the score limit, for example: <span className="example">k!quiz-conquest N1 1</span>. You can also use the <b>nodelay</b> keyword to set the delay to zero. For example: <span className="example">k!quiz N1 nodelay</span>. That is the same as <span className="example">k!quiz N1 10 0</span>. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Time Limit',
  (<p>The amount of time that you have to answer each question can be configured by specifying a number in seconds after the question delay. For example: <span className="example">k!quiz N1 20 1 10</span> for a JLPT N1 quiz with a score limit of 20, a delay of 1 second in between questions, and a time limit of 10 seconds to answer each question. For conquest and inferno mode, omit the score limit, for example: <span className="example">k!quiz-conquest N1 1 10</span>. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Reviewing',
  (<p>You can replay the questions you got wrong. To replay the questions no one got correct during the most recent game in the current channel, say <span className="example">k!quiz review</span>. To replay the questions that <b>you</b> did not get correct in the most recent game that you scored at least one point in, say <span className="example">k!quiz reviewme</span>. Reviewme does not have to be used in the same channel that you played in. You can do it elsewhere, like in a DM. Note that if I reboot, I will forget your previous game and you will not be able to review it.</p>),
));

manualSections.push(new ManualSection(
  'Saving and Loading',
  (<p>While a quiz is in progress, you can use <span className="example">k!quiz save</span> to save and pause it. When you are ready to play again, you can use <span className="example">k!quiz load</span> to load your save. This is mostly used for conquest mode.</p>),
));

manualSections.push(new ManualSection(
  'Conquest Mode',
  (<p>Conquest mode tries to teach you by repeating questions that you do not correctly answer. If you answer a question correctly the first time, you will not see it again. If you get it wrong, you will see it again at least several more times. You can save and load your progress so that you do not have to do a whole deck in one sitting (that would be pretty hardcore). You can start a quiz in conquest mode like this: <span className="example">k!quiz-conquest N1</span>.</p>),
));

manualSections.push(new ManualSection(
  'Changing fonts and colors',
  (<p>You can customize fonts and colors by using the <span className="example">k!settings</span> command and going into the fonts submenu by entering <span className="example">4</span>.</p>),
));

manualSections.push(new ManualSection(
  'Mixing Decks',
  (<p>You can mix any decks by using the + sign. For example: <span className="example">k!quiz N1+N2+N3</span>.</p>),
));

manualSections.push(new ManualSection(
  'Question Range',
  (<p>If you want to draw questions from a part of a deck instead of the whole thing, you can do that by specifying a range in parentheses. For example: <span className="example">k!quiz N1(1-100)</span> to draw questions only from the first 100 questions in the N1 deck.</p>),
));

manualSections.push(new ManualSection(
  'Multiple Choice',
  (<p>Some decks are multiple choice by default, and you can make most other decks multiple choice by adding <b>-mc</b> to the deck name. For example: <span className="example">k!quiz N1-mc</span> for a multiple choice N1 quiz. Some decks cannot be made multiple choice. For those, the -mc modifier will simply be ignored.</p>),
));

manualSections.push(new ManualSection(
  'Hardcore Mode',
  (<p>In hardcore mode each player only gets one chance to answer the question. Hardcore mode is always enabled for multiple choices quizzes (because I got tired of people typing in <b>1 2 3 4 hahahahahah</b>). Hardcore mode can be enabled for any quiz by saying <b>hardcore</b> anywhere in your quiz start command. For example: <span className="example">k!quiz N1 hardcore</span>.</p>),
));

manualSections.push(new ManualSection(
  'No Race Mode',
  (<p>By default, after a player gets a question correct, the timeout ends (almost) immediately and the bot moves on to the next question. If you would like to disable this, you can use the <b>norace</b> option. For example: <span className="example">k!quiz LN1 norace</span>. This is especially nice if you want to play listening quizzes with multiple people, so that everyone gets a chance to hear the whole audio track and answer.</p>),
));

export default manualSections;
