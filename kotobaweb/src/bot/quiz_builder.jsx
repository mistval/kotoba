import React, { Component } from 'react';
import './bot.css';
import '../main.css';
import Header from './header';
import Analytics from '../util/analytics';
import { quizDefaults, quizTimeModifierPresets } from 'kotoba-common';

const styles = {
  commandText: {
    fontSize: '28px',
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

  commandParts.push(...createTimeModifierParts(args));
  return createCommandSuccess(commandParts.join(' '));
}

class QuizBuilder extends Component {
  constructor() {
    super();
    this.state = {
      quizArguments: {
        decks: [createDeck('n5')],
        hardcore: false,
        conquest: false,
        scoreLimit: quizDefaults.scoreLimit,
        norace: false,
        answerTimeLimit: quizDefaults.answerTimeLimit,
        delayAfterAnsweredQuestion: quizDefaults.delayAfterAnsweredQuestion,
        delayAfterUnansweredQuestion: quizDefaults.delayAfterUnansweredQuestion,
        additionalAnswerWaitWindow: quizDefaults.additionalAnswerWaitWindow,
      },
    };
  }

  render() {
    const commandResult = createCommand(this.state.quizArguments);
    let commandElement;
    if (commandResult.valid) {
      commandElement = <span className="text-success">{commandResult.commandText}</span>;
    } else {
      commandElement = <span className="text-warning">{commandResult.errorText}</span>;
    }

    return (
      <>
        <div className="row justify-content-center">
          <div className="col-12 d-flex justify-content-center">
            <strong style={styles.commandText}>{commandElement}</strong>
          </div>
        </div>
        <div className="row">

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
