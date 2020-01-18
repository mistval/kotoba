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
  'Basic Help',
  (<p>To see available quiz decks, start a quiz, and see other basic help, just say <span className="example">k!quiz</span>.</p>),
));

manualSections.push(new ManualSection(
  'Command Builder',
  (<p>For interactive help writing a custom quiz command, try my <a href="/bot/quizbuilder">Quiz Command Builder</a>.</p>),
));

manualSections.push(new ManualSection(
  'Custom Decks',
  (<p>You can create custom decks and import/export them from CSV in <a href="/dashboard">the dashboard</a>.</p>),
));

manualSections.push(new ManualSection(
  'Score Limit',
  (<p>The score limit of a quiz can be configured by specifying a number after the quiz name. For example: <span className="example">k!quiz N1 20</span> for a JLPT N1 quiz with a score limit of 20. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Reviewing',
  (<p>You can replay the questions you got wrong. To replay the questions no one got correct during the most recent game in the current channel, say <span className="example">k!quiz review</span>. To replay the questions that <b>you</b> did not get correct in the most recent game that you scored at least one point in, say <span className="example">k!quiz reviewme</span>. Reviewme does not have to be used in the same channel that you played in. You can do it elsewhere, like in a DM. Note that if I reboot, I will forget your previous game and you will not be able to review it.</p>),
));

manualSections.push(new ManualSection(
  'Mixing Decks',
  (<p>You can mix any decks by using the + sign. For example: <span className="example">k!quiz N1+N2+N3</span>.</p>),
));

manualSections.push(new ManualSection(
  'Saving and Loading',
  (<p>While a quiz is in progress, you can use <span className="example">k!quiz save</span> to save and pause it. When you are ready to play again, you can use <span className="example">k!quiz load</span> to load your save. This is mostly used for conquest mode.</p>),
));

manualSections.push(new ManualSection(
  'Conquest Mode',
  (<p>Conquest mode tries to teach you by repeating questions that you do not correctly answer. If you answer a question correctly the first time, you will not see it again. If you get it wrong, you will see it again at least several more times. You can save and load your progress so that you do not have to do a whole deck in one sitting (that would be pretty hardcore). You can start a quiz in conquest mode by writing <span className="example">conquest</span> somewhere in your quiz command. For example: <span className="example">k!quiz N1 conquest</span>.</p>),
));

manualSections.push(new ManualSection(
  'Pacing Presets',
  (<p>You can configure the pace of the game by using the pacing presets (from fastest to slowest) <span className="example">nodelay</span>, <span className="example">faster</span>, <span className="example">fast</span>, or <span className="example">slow</span>. Just specify the preset somewhere in your quiz command. For example: <span className="example">k!quiz N1 fast</span> for an N1 quiz that's a little faster than default. For more fine-grained control over pacing, see the next four sections in this manual, or use the <span className="example">custom</span> pacing option in my <a href="/bot/quizbuilder">Quiz Command Builder</a>.</p>),
));

manualSections.push(new ManualSection(
  'Answer Time Limit',
  (<p>The answer time limit of a quiz can be configured by specifying a number in seconds as the <span className="example">atl=</span> parameter. For example: <span className="example">k!quiz N1 atl=10</span> for a JLPT N1 quiz where you only get 10 seconds to answer each question. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Additional Answer Wait Window',
  (<p>After a player answers correctly, other players have a small amount of time during which they can also answer correctly and get a point. This is the <span className="example">Additional Answer Wait Window</span>. You can configure it by specifying a number in seconds as the <span className="example">aaww=</span> parameter (d'aww &lt;3). For example: <span className="example">k!quiz N1 aaww=1</span> for a JLPT N1 quiz where other players only get one second to answer the question after someone answers correctly. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Delay After Answered Question',
  (<p>After a question is answered correctly and the Additional Answer Wait Window closes, I will show the answer and wait a few seconds before showing the next question. You can configure the length of that wait by specifying a number in seconds as the <span className="example">daaq=</span> parameter. For example: <span className="example">k!quiz N1 daaq=1</span>. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Delay After Unanswered Question',
  (<p>If time runs out and no one answers the question, I will show the answer and wait a few seconds before showing the next question. You can configure the length of that wait by specifying a number in seconds as the <span className="example">dauq=</span> parameter. For example: <span className="example">k!quiz N1 dauq=1</span>. You might want to set this much higher than Delay After Answered Question if you want some time to add questions to Anki or something. This setting can also be set with the <span className="example">k!settings</span> command.</p>),
));

manualSections.push(new ManualSection(
  'Changing fonts and colors',
  (<p>You can customize fonts and colors by using the <span className="example">k!settings</span> command and going into the fonts submenu by entering <span className="example">4</span>.</p>),
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
