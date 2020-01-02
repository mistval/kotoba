import React, { Component } from 'react';
import { quizDefaults, quizTimeModifierPresets } from 'kotoba-common';
import './bot.css';
import '../main.css';
import Header from './header';
import Analytics from '../util/analytics';
import DeckEditor from './quiz_builder_components/deck_editor';
import { convertRangeNumberToString, createDeck } from './quiz_builder_components/util';

const styles = {
  commandText: {
    fontSize: '28px',
  },
  card: {
    minHeight: '400px',
  },
  timingModal: {
    maxWidth: '575px',
  },
};

function createCommandSuccess(commandText) {
  return { valid: true, commandText };
}

function createCommandError(errorText) {
  return { valid: false, errorText };
}

function createTimeModifierParts(args) {
  const presetEntries = Object.entries(quizTimeModifierPresets);
  for (let i = 0; i < presetEntries.length; i += 1) {
    const presetEntry = presetEntries[i];
    const [presetName, presetValues] = presetEntry;

    if (
      presetValues.answerTimeLimit === args.answerTimeLimit
      && presetValues.delayAfterUnansweredQuestion === args.delayAfterUnansweredQuestion
      && presetValues.delayAfterAnsweredQuestion === args.delayAfterAnsweredQuestion
      && presetValues.additionalAnswerWaitWindow === args.additionalAnswerWaitWindow) {
        if (presetName === 'normal') {
          return [];
        }
        return [presetName];
      }
  }

  const parts = [];

  if (quizDefaults.answerTimeLimit !== args.answerTimeLimit) {
    parts.push(`answerTimeLimit=${args.answerTimeLimit}`);
  }
  if (quizDefaults.delayAfterUnansweredQuestion !== args.delayAfterUnansweredQuestion) {
    parts.push(`delayAfterUnansweredQuestion=${args.delayAfterUnansweredQuestion}`);
  }
  if (quizDefaults.delayAfterAnsweredQuestion !== args.delayAfterAnsweredQuestion) {
    parts.push(`delayAfterAnsweredQuestion=${args.delayAfterAnsweredQuestion}`);
  }
  if (quizDefaults.additionalAnswerWaitWindow !== args.additionalAnswerWaitWindow) {
    parts.push(`additionalAnswerWaitWindow=${args.additionalAnswerWaitWindow}`);
  }

  return parts;
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

  commandParts.push(deckParts.join(' + '));

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

  commandParts.push(...createTimeModifierParts(args));
  return createCommandSuccess(commandParts.join(' '));
}

function SpeedsList(props) {
  return (
    <div className="list-group">
      {Object.keys(quizTimeModifierPresets).map(presetName => (
        <a
          href="#"
          className={`list-group-item list-group-item-action${presetName === props.selectedPresetName ? ' active' : ''}`}
          onClick={(ev) => props.onPresetSelected(presetName)}
          key={presetName}
        >
          {presetName}
        </a>
      ))}
        <a
          href="#"
          className={`list-group-item list-group-item-action${props.selectedPresetName === 'custom' ? ' active' : ''}`}
          onClick={(ev) => props.onPresetSelected('custom')}
        >
          custom
        </a>
    </div>
  );
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
      answerTimeLimit: quizDefaults.answerTimeLimit,
      delayAfterAnsweredQuestion: quizDefaults.delayAfterAnsweredQuestion,
      delayAfterUnansweredQuestion: quizDefaults.delayAfterUnansweredQuestion,
      additionalAnswerWaitWindow: quizDefaults.additionalAnswerWaitWindow,
    };
  }

  handleTimePresetSelected = (presetName) => {
    if (presetName === 'custom') {
      window.$(this.customTimingModal).modal('show');
    } else {
      this.setState(quizTimeModifierPresets[presetName]);
    }
  }

  handleAnswerTimeLimitChanged = (ev) => {

  }

  handleDelayAfterUnansweredQuestionChanged = (ev) => {

  }

  handleDelayAfterAnsweredQuestionChanged = (ev) => {

  }

  handleAdditionalAnswerWaitWindowChanged = (ev) => {

  }

  handleDecksChanged = (decks) => {
    this.setState({ decks });
  }

  render() {
    const commandResult = createCommand(this.state);
    let commandElement;
    if (commandResult.valid) {
      commandElement = <span className="text-success text-center">{commandResult.commandText}</span>;
    } else {
      commandElement = <span className="text-warning">{commandResult.errorText}</span>;
    }
    
    const timeModifierParts = createTimeModifierParts(this.state);
    const timeModifierPresetName = timeModifierParts[0];

    let selectedTimeModifierPresetName = 'custom';
    if (!timeModifierPresetName) {
      selectedTimeModifierPresetName = 'normal';
    } else if (quizTimeModifierPresets[timeModifierPresetName]) {
      selectedTimeModifierPresetName = timeModifierPresetName;
    }

    return (
      <>
        <div className="modal" tabIndex="-1" role="dialog" id="customTimingModal" ref={(customTimingModal) => { this.customTimingModal = customTimingModal; }}>
          <div className="modal-dialog" style={styles.timingModal} role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Custom Timing</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p className="mb-4">Configure custom timing settings.</p>
                <p>
                  Answer time limit:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.state.answerTimeLimit}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
                <p>
                  Delay after <b>un</b>answered question:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.state.delayAfterUnansweredQuestion}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
                <p>
                  Delay after answered question:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.state.delayAfterAnsweredQuestion}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
                <p>
                  Additional answer wait window:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.state.additionalAnswerWaitWindow}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" data-dismiss="modal" disabled={false}>OK</button>
              </div>
            </div>
          </div>
        </div>
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
                  <div className="card" style={styles.card}>
                    <div className="card-block-title">
                      <h5 className="card-title">Speed</h5>
                    </div>
                    <div className="card-body">
                      <SpeedsList
                        selectedPresetName={selectedTimeModifierPresetName}
                        onPresetSelected={this.handleTimePresetSelected}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 mb-5">
                  <div className="card" style={styles.card}>
                    <div className="card-block-title">
                      <h5 className="card-title">Modes</h5>
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
