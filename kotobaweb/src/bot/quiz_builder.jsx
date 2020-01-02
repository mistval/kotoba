import React, { Component } from 'react';
import { quizDefaults, quizTimeModifierPresets } from 'kotoba-common';
import './bot.css';
import '../main.css';
import Header from './header';
import Analytics from '../util/analytics';
import DeckEditor from './quiz_builder_components/deck_editor';
import { convertRangeNumberToString, createDeck, createTimeModifierParts } from './quiz_builder_components/util';
import TimingEditor from './quiz_builder_components/timing_editor';
import styles from './quiz_builder_components/styles';

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

  if (args.scoreLimit !== quizDefaults.scoreLimit) {
    commandParts.push(args.scoreLimit);
  }

  if (args.conquest) {
    commandParts.push('conquest');
  }

  if (args.hardcore) {
    commandParts.push('hardcore');
  }

  if (args.norace) {
    commandParts.push('norace');
  }

  commandParts.push(...createTimeModifierParts(args.timing));
  return createCommandSuccess(commandParts.join(' '));
}

class QuizBuilder extends Component {
  constructor() {
    super();
    this.state = {
      decks: [createDeck('N5')],
      hardcore: false,
      conquest: false,
      scoreLimit: quizDefaults.scoreLimit,
      norace: false,
      timing: {
        answerTimeLimit: quizDefaults.answerTimeLimit,
        delayAfterAnsweredQuestion: quizDefaults.delayAfterAnsweredQuestion,
        delayAfterUnansweredQuestion: quizDefaults.delayAfterUnansweredQuestion,
        additionalAnswerWaitWindow: quizDefaults.additionalAnswerWaitWindow,
      },
    };
  }

  handleDecksChanged = (decks) => {
    this.setState({ decks });
  }

  handleTimingChanged = (timing) => {
    this.setState({ timing });
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
                <div className="col-lg-4 mb-5">
                  <DeckEditor decks={this.state.decks} onDecksChanged={this.handleDecksChanged} />
                </div>
                <div className="col-lg-4 mb-5">
                  <TimingEditor timing={this.state.timing} onTimingChanged={this.handleTimingChanged} />
                </div>
                <div className="col-lg-4 mb-5">
                  <div className="card" style={styles.card}>
                    <div className="card-block-title">
                      <h5 className="card-title">Other</h5>
                    </div>
                    <div className="card-body">
                    </div>
                  </div>
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
