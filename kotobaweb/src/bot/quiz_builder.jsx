import React, { Component } from 'react';
import './bot.css';
import '../main.css';
import Header from './header';
import Analytics from '../util/analytics';
import { quizDefaults, quizTimeModifierPresets, deckValidation } from 'kotoba-common';

const styles = {
  commandText: {
    fontSize: '28px',
  },
  card: {
    minHeight: '300px',
  },
};

function createDeck(name, startIndex = 0, endIndex = Number.POSITIVE_INFINITY) {
  return { name, startIndex, endIndex };
}

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
    if (deck.startIndex !== 0 || deck.endIndex !== Number.POSITIVE_INFINITY) {
      deckParts.push(`${deck.name}(${deck.startIndex}-${deck.endIndex})`);
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

function DeckRow(props) {
  const endIndexElement = Number.isFinite(props.deck.endIndex)
    ? <span>{props.deck.endIndex}</span>
    : <span>∞</span>;

  return (
    <div className="d-flex justify-content-between align-items-center">
      <strong>{props.deck.name}</strong>
      <div className="d-flex align-items-center">
        <span className="text-info">{props.deck.startIndex}-{endIndexElement}</span>
        &nbsp;&nbsp;
        <button type="button" class="btn btn-danger bmd-btn-icon" onClick={() => props.onDeleteDeck(props.index)}>
          <i class="material-icons text-danger">delete</i>
        </button>
      </div>
    </div>
  );
}

function DeckRows(props) {
  return props.decks.map((deck, index) => <DeckRow deck={deck} index={index} onDeleteDeck={props.onDeleteDeck} />);
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
      editingDeck: false,
      newDeckName: '',
    };
  }

  handleDeleteDeck = (index) => {
    this.setState(state => ({
      decks: [...state.decks.slice(0, index), ...state.decks.slice(index + 1)],
    }));
  }

  handleAddDeckClick = () => {
    this.setState({
      editingDeck: true,
      newDeckName: 'SomeDeck',
    }, () => {
      this.newDeckNameInput.select();
    });
  }

  handleNewDeckNameChanged = () => {
    this.setState({
      newDeckName: this.newDeckNameInput.value,
    });
  }

  handleNewDeckKeyUp = (ev) => {
    // 13 is Enter
    if (ev.keyCode === 13) {
      this.newDeckNameInput.blur();
    }
  }

  handleNewDeckBlur = () => {
    const deckName = this.newDeckNameInput.value
      .replace(/[^0-9a-zA-Z_]/g, ''); // Remove illegal characters
    
    if (!deckName) {
      return this.setState({ editingDeck: false });
    }

    if (this.state.decks.some(deck => deck.name.toLowerCase() === deckName.toLowerCase())) {
      return this.setState({ editingDeck: false });
    }
    
    this.setState((state) => ({
      editingDeck: false,
      decks: [...state.decks, createDeck(deckName)],
    }));
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
                <div className="col-lg-5 offset-lg-1 mb-5">
                  <div className="card" style={styles.card}>
                    <div className="card-block-title">
                      <h5 className="card-title d-inline-block">Decks</h5>
                    </div>
                    <div className="card-body">
                      <DeckRows decks={this.state.decks} onDeleteDeck={this.handleDeleteDeck} />
                      <input
                        type="text"
                        value={this.state.newDeckName}
                        ref={(input) => { this.newDeckNameInput = input; }}
                        hidden={!this.state.editingDeck}
                        onChange={this.handleNewDeckNameChanged}
                        onKeyUp={this.handleNewDeckKeyUp}
                        onBlur={this.handleNewDeckBlur}
                        maxLength={deckValidation.SHORT_NAME_MAX_LENGTH}
                      />
                    </div>
                    <div className="d-flex justify-content-end">
                      <button type="button" className="btn btn-primary bmd-btn-fab mr-3 mb-3" onClick={this.handleAddDeckClick}>
                        <i class="material-icons">add</i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-lg-5 mb-5">
                  <div className="card" style={styles.card}>
                    <div className="card-block-title">
                      <h5 className="card-title">Configuration</h5>
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
