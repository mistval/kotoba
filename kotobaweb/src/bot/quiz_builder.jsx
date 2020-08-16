import React, { Component } from 'react';
import { quizDefaults } from 'kotoba-common';
import './bot.css';
import '../main.css';
import Header from './header';
import Analytics from '../util/analytics';
import DeckEditor from './quiz_builder_components/deck_editor';
import { convertRangeNumberToString, createDeck, createTimeModifierParts } from './quiz_builder_components/util';
import TimingEditor from './quiz_builder_components/timing_editor';
import styles from './quiz_builder_components/styles';
import OtherSettingsEditor from './quiz_builder_components/other_settings_editor';
import FontEditor from './quiz_builder_components/font_editor';
import DefaultColors from './default_text_colors';

const DEFAULT_FONT_SIZE = 92;

function createCommandSuccess(commandText) {
  return { valid: true, commandText };
}

function createCommandError(errorText) {
  return { valid: false, errorText };
}

function createCommand(args) {
  if (!args.decks || args.decks.length === 0) {
    return createCommandError('Please add at least one deck.');
  }

  const commandParts = ['k!quiz'];
  const deckParts = [];

  for (let i = 0; i < args.decks.length; i += 1) {
    const deck = args.decks[i];
    if (deck.startIndex !== 1 || deck.endIndex !== Number.POSITIVE_INFINITY) {
      deckParts.push(`${deck.name}(${convertRangeNumberToString(deck.startIndex)}-${convertRangeNumberToString(deck.endIndex)})`);
    } else {
      deckParts.push(deck.name);
    }
  }

  commandParts.push(deckParts.join('+'));

  if (args.otherSettings.scoreLimit !== quizDefaults.scoreLimit && !args.otherSettings.conquest) {
    commandParts.push(args.otherSettings.scoreLimit);
  }

  if (args.otherSettings.conquest) {
    commandParts.push('conquest');
  }

  if (args.otherSettings.hardcore) {
    commandParts.push('hardcore');
  }

  if (args.otherSettings.norace) {
    commandParts.push('norace');
  }

  if (args.otherSettings.maxMissedQuestions) {
    commandParts.push(`mmq=${args.otherSettings.maxMissedQuestions}`);
  }

  commandParts.push(...createTimeModifierParts(args.timing));

  if (args.fontSettings.fontFamilyIndex !== 0) {
    commandParts.push(`font=${args.fontSettings.fontFamilyIndex + 1}`);
  }

  if (args.fontSettings.color !== DefaultColors.TEXT) {
    commandParts.push(`color=${args.fontSettings.color}`);
  }

  if (args.fontSettings.backgroundColor !== DefaultColors.BACKGROUND) {
    commandParts.push(`bgcolor=${args.fontSettings.backgroundColor}`);
  }

  if (args.fontSettings.fontSize !== DEFAULT_FONT_SIZE) {
    commandParts.push(`size=${args.fontSettings.fontSize}`);
  }

  return createCommandSuccess(commandParts.join(' '));
}

class QuizBuilder extends Component {
  constructor() {
    super();
    this.state = {
      decks: [createDeck('N5')],
      timing: {
        answerTimeLimit: quizDefaults.answerTimeLimit,
        delayAfterAnsweredQuestion: quizDefaults.delayAfterAnsweredQuestion,
        delayAfterUnansweredQuestion: quizDefaults.delayAfterUnansweredQuestion,
        additionalAnswerWaitWindow: quizDefaults.additionalAnswerWaitWindow,
      },
      otherSettings: {
        hardcore: false,
        conquest: false,
        scoreLimit: quizDefaults.scoreLimit,
        norace: false,
        maxMissedQuestions: 0,
      },
      fontSettings: {
        color: DefaultColors.TEXT,
        backgroundColor: DefaultColors.BACKGROUND,
        fontFamilyIndex: 0,
        fontSize: DEFAULT_FONT_SIZE,
      },
    };
  }

  handleDecksChanged = (decks) => {
    this.setState({ decks });
  }

  handleTimingChanged = (timing) => {
    this.setState({ timing });
  }

  handleOtherSettingsChanged = (otherSettings) => {
    this.setState({ otherSettings });
  }

  handleFontSettingsChanged = (fontSettings) => {
    this.setState({ fontSettings });
  }

  render() {
    const commandResult = createCommand(this.state);
    let commandElement;
    if (commandResult.valid) {
      commandElement = <span className="text-success text-center">{commandResult.commandText}</span>;
    } else {
      commandElement = <span className="text-warning">{commandResult.errorText}</span>;
    }

    return (
      <>
        <div className="row">
          <div className="col-12">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-12 d-flex justify-content-center">
                  <strong style={styles.commandText}>{commandElement}</strong>
                </div>
              </div>
              <div className="row mt-5">
                <div className="col-lg-4 mb-4">
                  <DeckEditor decks={this.state.decks} onDecksChanged={this.handleDecksChanged} />
                </div>
                <div className="col-lg-4 mb-4">
                  <TimingEditor timing={this.state.timing} onTimingChanged={this.handleTimingChanged} />
                </div>
                <div className="col-lg-4 mb-4">
                  <OtherSettingsEditor otherSettings={this.state.otherSettings} onOtherSettingsChanged={this.handleOtherSettingsChanged} />
                </div>
              </div>
              <div className="row">
                <div className="col mb-5">
                  <FontEditor fontSettings={this.state.fontSettings} onFontSettingsChanged={this.handleFontSettingsChanged} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

function render() {
  Analytics.setPageView('/bot/quizbuilder');

  return (
    <div className="container-fluid">
      <Header />
      <QuizBuilder />
    </div>
  );
}

export default render;
