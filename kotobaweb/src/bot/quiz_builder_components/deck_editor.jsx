import React, { Component } from 'react';
import { deckValidation } from 'kotoba-common';
import styles from './styles';
import { convertRangeNumberToString, convertRangeStringToNumber, createDeck } from './util';

function validateRange(rangeString) {
  return rangeString.match(/^end$|^[0-9]*$/);
}

function getRangeValidationErrorMessage(value, otherValue, mustBeLower) {
  if (!validateRange(value)) {
    return 'Please enter a whole number 1 or greater, or \'end\' for the last card in the deck.';
  }

  const inputValue = convertRangeStringToNumber(value);
  const otherInputValue = convertRangeStringToNumber(otherValue);

  if (mustBeLower && inputValue > otherInputValue) {
    return 'The start index must be less than or equal to the end index.';
  }

  return '';
}

function DeckRow(props) {
  return (
    <div className="d-flex justify-content-between align-items-center">
      <strong>{props.deck.name}</strong>
      <div className="d-flex align-items-center">
        <a
          href="#"
          className="text-info"
          onClick={(e) => { props.onChangeRange(props.index); e.preventDefault(); }}
        >
          {convertRangeNumberToString(props.deck.startIndex)}
          {' '}
          -
          {convertRangeNumberToString(props.deck.endIndex)}
        </a>
        &nbsp;&nbsp;
        <button type="button" className="btn btn-danger bmd-btn-icon" onClick={() => props.onDeleteDeck(props.index)}>
          <i className="material-icons text-danger">delete</i>
        </button>
      </div>
    </div>
  );
}

function DeckRows(props) {
  return props.decks.map((deck, index) => (
    <DeckRow
      deck={deck}
      index={index}
      onDeleteDeck={props.onDeleteDeck}
      onChangeRange={props.onChangeRange}
      key={deck.name}
    />
  ));
}

class DeckEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newDeckName: 'SomeDeck',
      editingDeck: false,
      changeRangeDeckIndex: -1,
      changeRangeStartIndex: '1',
      changeRangeEndIndex: 'end',
    };
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
      this.setState({ editingDeck: false });
    } else if (this.props.decks.some(deck => deck.name.toLowerCase() === deckName.toLowerCase())) {
      this.setState({ editingDeck: false });
    } else {
      this.setState({
        editingDeck: false,
      }, () => {
        this.props.onDecksChanged([...this.props.decks, createDeck(deckName)]);
      });
    }
  }

  handleDeleteDeck = (index) => {
    this.props.onDecksChanged([...this.props.decks.slice(0, index), ...this.props.decks.slice(index + 1)]);
  }

  handleChangeRange = (index) => {
    const deck = this.props.decks[index];
    this.setState({
      changeRangeDeckIndex: index,
      changeRangeStartIndex: convertRangeNumberToString(deck.startIndex),
      changeRangeEndIndex: convertRangeNumberToString(deck.endIndex),
    }, () => {
      this.rangeStartInput.setCustomValidity('');
      this.rangeEndInput.setCustomValidity('');
      window.$(this.changeRangeModal).modal('show');
    });
  }

  handleRangeInputChanged = () => {
    this.rangeStartInput.setCustomValidity(getRangeValidationErrorMessage(this.state.changeRangeStartIndex, this.state.changeRangeEndIndex, true));
    this.rangeEndInput.setCustomValidity(getRangeValidationErrorMessage(this.state.changeRangeEndIndex, this.state.changeRangeStartIndex, false));

    this.setState({
      changeRangeStartIndex: this.rangeStartInput.value,
      changeRangeEndIndex: this.rangeEndInput.value,
    });
  }

  handleRangeChangeCommit = () => {
    window.$(this.changeRangeModal).modal('hide');

    const startIndex = convertRangeStringToNumber(this.state.changeRangeStartIndex) || 1;
    const endIndex = convertRangeStringToNumber(this.state.changeRangeEndIndex) || Number.POSITIVE_INFINITY;

    const decks = this.props.decks.slice();
    const deckToChange = decks[this.state.changeRangeDeckIndex];
    decks[this.state.changeRangeDeckIndex] = createDeck(deckToChange.name, startIndex, endIndex);

    this.props.onDecksChanged(decks);
  }

  handleRangeChangeInputKeyUp = (ev) => {
    // 13 is Enter
    if (ev.keyCode === 13 && this.changeRangeInputIsValid()) {
      this.handleRangeChangeCommit();
    }
  }

  changeRangeInputIsValid = () => !this.rangeStartInput
      || (
        !getRangeValidationErrorMessage(this.state.changeRangeStartIndex, this.state.changeRangeEndIndex, true)
        && !getRangeValidationErrorMessage(this.state.changeRangeEndIndex, this.state.changeRangeStartIndex, false)
      )

  render() {
    return (
      <>
        <div className="modal" tabIndex="-1" role="dialog" id="changeRangeModal" ref={(changeRangeModal) => { this.changeRangeModal = changeRangeModal; }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Card Range</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Set the range of cards to pull from this deck. For example if you only want to pull cards from the first 100 cards in the deck, set the range to 1-100.</p>
                Start:&nbsp;
                <input
                  type="text"
                  value={this.state.changeRangeStartIndex}
                  onChange={this.handleRangeInputChanged}
                  onKeyUp={this.handleRangeChangeInputKeyUp}
                  ref={(input) => { this.rangeStartInput = input; }}
                  maxLength={7}
                />
                &nbsp;
                End:&nbsp;
                <input
                  type="text"
                  value={this.state.changeRangeEndIndex}
                  onChange={this.handleRangeInputChanged}
                  onKeyUp={this.handleRangeChangeInputKeyUp}
                  ref={(input) => { this.rangeEndInput = input; }}
                  maxLength={7}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" data-dismiss="modal" disabled={!this.changeRangeInputIsValid()} onClick={this.handleRangeChangeCommit}>OK</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={styles.card}>
          <div className="card-block-title">
            <h5 className="card-title d-inline-block">Decks</h5>
          </div>
          <div className="card-body">
            <DeckRows decks={this.props.decks} onDeleteDeck={this.handleDeleteDeck} onChangeRange={this.handleChangeRange} />
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
              <i className="material-icons">add</i>
            </button>
          </div>
        </div>
      </>
    );
  }
}

export default DeckEditor;
