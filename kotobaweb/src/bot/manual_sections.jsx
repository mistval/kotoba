// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */
/* eslint max-len: 0 */

import React from 'react';
import { NavLink } from 'react-router-dom';

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
  (<p>For interactive help writing a custom quiz command, try my <NavLink to="/bot/quizbuilder">Quiz Command Builder</NavLink>.</p>),
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
  (
    <>
      <p>You can mix any decks by using the + sign. For example: <span className="example">k!quiz N1+N2+N3</span>.</p>
      <p>You can also control the percentage of questions that come from each deck. For example: <span className="example">k!quiz N1(20%)+N2(30%)+N3(50%)</span>. By default, each deck has an equal chance of having the next question pulled from it.</p>
    </>
  ),
));

manualSections.push(new ManualSection(
  'Saving and Loading',
  (<p>While a quiz is in progress, you can use <span className="example">k!quiz save</span> to save and pause it. When you are ready to play again, you can use <span className="example">k!quiz load</span> to load your save. This is mostly used for conquest mode. When you save, most settings (fonts, timing settings, etc) are also saved and are restored on load. If you want to override any settings on load, you can do so by using the various parameters described more farther down, for example <span className="example">k!quiz load 1 font=5</span> will load your first save and use font #5.</p>),
));

manualSections.push(new ManualSection(
  'Conquest Mode',
  (<p>Conquest mode tries to teach you by repeating questions that you do not correctly answer. If you answer a question correctly the first time, you will not see it again. If you get it wrong, you will see it again at least several more times. You can save and load your progress so that you do not have to do a whole deck in one sitting (that would be pretty hardcore). You can start a quiz in conquest mode by writing <span className="example">conquest</span> somewhere in your quiz command. For example: <span className="example">k!quiz N1 conquest</span>.</p>),
));

manualSections.push(new ManualSection(
  'Pacing Presets',
  (<p>You can configure the pace of the game by using the pacing presets (from fastest to slowest) <span className="example">nodelay</span>, <span className="example">faster</span>, <span className="example">fast</span>, or <span className="example">slow</span>. Just specify the preset somewhere in your quiz command. For example: <span className="example">k!quiz N1 fast</span> for an N1 quiz that's a little faster than default. For more fine-grained control over pacing, see the next four sections in this manual, or use the <span className="example">custom</span> pacing option in my <NavLink to="/bot/quizbuilder">Quiz Command Builder</NavLink>.</p>),
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
  'Max Missed Questions',
  (<p>You can use this setting to limit how many questions are allowed to be missed total (not necessarily in a row). If that many questions go unanswered, I will end the quiz. You can set this by using the <span className="example">mmq=</span> parameter. For example: <span className="example">k!quiz N1 mmq=3</span>. This setting can also be set with the <span className="example">k!settings</span> command. Note that there is also a separate setting that controls the maximum number of questions that can be missed <strong>in a row</strong>. That one can only be set by server admins, in <span className="example">k!settings</span>.</p>),
));

manualSections.push(new ManualSection(
  'Changing Fonts and Colors',
  (<p>You can customize fonts and colors by using the <span className="example">k!settings</span> command and going into the fonts submenu by entering <span className="example">4</span>. Alternatively, you can use the <span className="example">font=</span>, <span className="example">color=</span>, and/or <span className="example">bgcolor=</span> inline options. For help doing that, and to more easily experiment with different settings, try the online <NavLink to="/bot/quizbuilder">Quiz Command Builder</NavLink> or use the <span className="example">k!draw</span> command in Discord and read the instructions it shows.</p>),
));

manualSections.push(new ManualSection(
  'Question Range',
  (<p>If you want to draw questions from a part of a deck instead of the whole thing, you can do that by specifying a range in parentheses. For example: <span className="example">k!quiz N1(1-100)</span> to draw questions only from the first 100 questions in the N1 deck.</p>),
));

manualSections.push(new ManualSection(
  'Disabling Randomization',
  (<p>If you want to disable randomization of question order, you can use the <span className="example">noshuffle</span> option. For example <span className="example">k!quiz n1 noshuffle</span>.</p>),
));

manualSections.push(new ManualSection(
  'Multiple Choice',
  (<p>Some decks are multiple choice by default, and you can make most other decks multiple choice by adding <span className="example">-mc</span> to the deck name. For example: <span className="example">k!quiz N1-mc</span> for a multiple choice N1 quiz. Some decks cannot be made multiple choice. For those, the -mc modifier will simply be ignored. Note that the <span className="example">-mc</span> modifier is per-deck. So if you want to mix two decks and use multiple choice for both, you should do it like <span className="example">k!quiz N1-mc+N2-mc</span>.</p>),
));

manualSections.push(new ManualSection(
  'Hardcore Mode',
  (<p>In hardcore mode each player only gets one chance to answer the question. Hardcore mode is always enabled for multiple choices quizzes (because I got tired of people typing in <b>1 2 3 4 hahahahahah</b>). Hardcore mode can be enabled for any quiz by saying <span className="example">hardcore</span> anywhere in your quiz start command. For example: <span className="example">k!quiz N1 hardcore</span>.</p>),
));

manualSections.push(new ManualSection(
  'No Race Mode',
  (<p>By default, after a player gets a question correct, the timeout ends (almost) immediately and the bot moves on to the next question. If you would like to disable this, you can use the <span className="example">norace</span> option. For example: <span className="example">k!quiz LN1 norace</span>. This is especially nice if you want to play listening quizzes with multiple people, so that everyone gets a chance to hear the whole audio track and answer.</p>),
));

manualSections.push(new ManualSection(
  'Answering in Spoilers',
  (<p>I accept answers inside of spoiler tags. So you can type your answer surrounded by <span className="example">||</span> to hide your answer from other Discord users. For example <span className="example">||にほんご||</span>. This can be good if you want to compete with friends without having to type quickly. You can use a high value for the <span className="example">aaww=</span> parameter and give your answers in spoilers.</p>),
));

manualSections.push(new ManualSection(
  'Custom Decks',
  (
    <>
      <p>You can create custom decks and import/export them from files in <NavLink to="/dashboard">the dashboard</NavLink>.</p>
      <p>To import a deck from Anki, click the deck settings button in Anki (the cog icon to the right of the "Due" column on the deck list), click "Export", select "Cards in Plain Text (txt)" as the export format, uncheck "Include HTML and media references", then click export and save the file.</p>
      <p>To import from a CSV file, create a spreadsheet with at least two columns with headings (Question and Answer) and optionally up to three more columns (Comment, Instructions, Render As). Save it as a CSV file. Note that there's a lot of variation in how different software exports spreadsheets to CSV, and not all of them will work (at least with default export settings). You should have good luck using Google Sheets.</p>
    </>
  ),
));

manualSections.push(new ManualSection(
  'Searchable Custom Deck Rules',
  (
    <>
      <p>If you mark your deck as searchable, then other users can search for it using the <span className="example">k!quiz search</span> command. Therefore searchable decks must follow some rules:</p>
      <ol>
        <li>No explicit or mature content.</li>
        <li>No troll decks.</li>
        <li>No advertising (I don't mind if you put one server invite link in your deck description, but this may change if people complain).</li>
      </ol>
      <p>Violating these rules may lead to your deck being deleted or your being banned from using Kotoba. If you have questions or need to report a deck, visit <a href="https://discord.gg/S92qCjbNHt">my server</a> or use the <NavLink to="/about">contact form</NavLink>.</p>
    </>
  ),
));

manualSections.push(new ManualSection(
  'Developers',
  (
    <>
      <p>
        Kotoba has a REST API which was built for use by this website. Some developers have also used the API to build things like role-granting bots
        (i.e. you pass a certain quiz, you get a certain role). I neither encourage nor discourage this. The API has little to no documentation, may change at any time,
        and support is limited. If that is acceptable to you, you may use the API.
      </p>
      <p>
        When a quiz ends, Kotoba sends a link to a session report, which looks something like <span className="example">https://kotobaweb.com/dashboard/game_reports/631cd23b848792b5c3a1a6c1</span>.
        You may replace the <span className="example">dashboard</span> part of the URL with <span className="example">api</span> to fetch machine-readable JSON which contains
        scores, settings used, and other relevant information.
      </p>
    </>
  ),
));

export default manualSections;
