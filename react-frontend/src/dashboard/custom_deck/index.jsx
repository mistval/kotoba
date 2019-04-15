import React, { Component } from 'react';
import axios from 'axios';
import ReactDataGrid from 'react-data-grid';
import Header from '../header';
import csvStringify from 'csv-stringify';
import csvParse from 'csv-parse';
import download from 'js-file-download';
import NotificationStripe from '../../controls/notification_stripe';
import { deckValidation } from 'kotoba-common';
import { Editors } from 'react-data-grid-addons';

function upperCaseFirstCharOnly(str) {
  const lowerChars = str.toLowerCase().split('');
  return [lowerChars[0].toUpperCase(), ...lowerChars.slice(1)].join('');
}

const renderAsDropdownOptions = deckValidation.allowedQuestionCreationStrategies.map((strat) => {
  return {
    id: strat,
    value: upperCaseFirstCharOnly(strat),
  };
});

const RenderAsEditor = <Editors.DropDownEditor options={renderAsDropdownOptions} />;

const styles = {
  icon: {
    fontSize: '5rem',
  },
  actionButton: {
    width: '120px',
    whiteSpace: 'normal',
  },
  hiddenFileInput: {
    display: 'none',
  },
};

const columns = [
  { key: 'index', name: '#', width: 60 },
  { key: 'question', name: 'Question', editable: true },
  { key: 'answers', name: 'Answers', editable: true },
  { key: 'comment', name: 'Comment', editable: true },
  { key: 'instructions', name: 'Instructions', editable: true },
  { key: 'questionCreationStrategy', name: 'Render as', editor: RenderAsEditor, editable: true, width: 110 },
];

const sampleRow = {
  index: 0,
  question: '明日',
  answers: 'あした,あす',
  comment: 'Tomorrow',
  instructions: 'Type the reading of the word in hiragana!',
  questionCreationStrategy: upperCaseFirstCharOnly(deckValidation.allowedQuestionCreationStrategies[0]),
};

const emptyRow = {
  question: '',
  answers: '',
  comment: '',
  instructions: '',
  questionCreationStrategy: '',
};

function createEmptyRow(index) {
  return { ...emptyRow, index };
}

function gridCardsToApiCards(gridCards) {
  const cards = gridCards.map((gridCard) => {
    const copy = { ...gridCard };
    delete copy.index;

    if (Object.values(copy).every(v => !v)) {
      return null;
    }

    copy.answers = copy.answers.replace(/、/g, ',').split(',');
    copy.questionCreationStrategy = copy.questionCreationStrategy.toUpperCase();
    return copy;
  });

  while (cards.length > 0 && !cards[cards.length - 1]) {
    cards.pop();
  }

  return cards;
}

function apiCardsToGridCards(apiCards) {
  return apiCards.map((apiCard, index) => {
    if (apiCard === null) {
      return createEmptyRow(index);
    }

    const copy = { ...apiCard, index };
    copy.answers = copy.answers.join(',');
    copy.questionCreationStrategy = upperCaseFirstCharOnly(copy.questionCreationStrategy);
    return copy;
  });
}

function isEmptyRow(row) {
  return !row.question && !row.answers && !row.comment && !row.instructions;
}

class EditDeck extends Component {
  constructor() {
    super();
    this.state = {
      gridDeck: undefined,
      showStripe: false,
      stripeIsError: false,
      stripeMessage: '',
      saving: false,
      defaultInstructions: 'Type the reading of the word in hiragana!',
    };
  }

  async loadDeck() {
    const deckId = this.props.match.params.id;

    if (deckId === 'new') {
      return this.setState({
        gridDeck: {
          name: `${localStorage.getItem('username')}'s New Deck`,
          shortName: 'new_deck',
          cards: [sampleRow],
        }
      });
    }

    try {
      const apiDeck = (await axios.get(`/api/decks/${deckId}`)).data;
      const gridDeck = { ...apiDeck, cards: apiCardsToGridCards(apiDeck.cards) };

      this.setState({ gridDeck });
    } catch (err) {
      let stripeMessage;
      if (err.response.status === 404) {
        stripeMessage = 'Deck not found. Check that your link is valid and that the deck has not been deleted by its owner.';
      } else {
        return this.handleApiError(err);
      }

      this.setState({
        showStripe: true,
        stripeMessage,
        stripeIsError: true,
      });
    }
  }

  componentDidMount() {
    this.loadDeck();
  }

  onGridRowsUpdated = ({ fromRow, toRow, updated }) => {
    this.setState((state) => {
      const isNewRow = state.gridDeck.cards.length <= fromRow || isEmptyRow(state.gridDeck.cards[fromRow]);
      while (state.gridDeck.cards.length < fromRow + 1) {
        const row = createEmptyRow(state.gridDeck.cards.length);
        state.gridDeck.cards.push(row);
      }

      const updatedRow = { ...state.gridDeck.cards[fromRow], ...updated };
      if (isNewRow && !isEmptyRow(updatedRow)) {
        if (!updatedRow.instructions) {
          updatedRow.instructions = state.defaultInstructions.trim();
        }
        if (!updatedRow.questionCreationStrategy) {
          updatedRow.questionCreationStrategy = upperCaseFirstCharOnly(deckValidation.allowedQuestionCreationStrategies[0]);
        }
      }

      if (isEmptyRow(updatedRow)) {
        updatedRow.questionCreationStrategy = '';
      }

      Object.keys(updatedRow).forEach(key => {
        if (typeof updatedRow[key] === typeof '') {
          updatedRow[key] = updatedRow[key].trim();
        }
      });

      state.gridDeck.cards[fromRow] = updatedRow;

      return state;
    });
  };

  onMetadataChange = () => {
    this.setState((state) => {
      state.gridDeck.name = this.fullNameField.value;
      state.gridDeck.shortName = this.shortNameField.value.toLowerCase();
      state.defaultInstructions = this.defaultInstructionsField.value;

      return state;
    });
  }

  handleValidationError(validationErrorInfo) {
    const { rejectedLine, rejectionReason } = validationErrorInfo;

    let stripeMessage = '';
    if (rejectedLine !== deckValidation.NON_LINE_ERROR_LINE) {
      stripeMessage += `Question #${rejectedLine} -- `;
    }

    stripeMessage += rejectionReason;

    this.setState({
      stripeIsError: true,
      showStripe: true,
      stripeMessage,
    });
  }

  handleApiError(err) {
    let stripeMessage = '';

    if (err.response) {
      const { response } = err;
      if (response.status === 401) {
        window.location = '/dashboard';
        return;
      }

      const responseBody = response.data;
      if (response.status === 413) {
        stripeMessage = 'Your deck is too big. There is a limit of 5,000 questions and also an overall combined size limit in megabytes. Make sure your CSV size is smaller than approx 2 MB.';
      } else if (responseBody.errorType === deckValidation.DECK_VALIDATION_ERROR_TYPE) {
        return this.handleValidationError(responseBody);
      } else if (responseBody.message) {
        stripeMessage = responseBody.message;
      } else {
        stripeMessage = `Error. Please report this. Error: ${err.message}`;
      }
    } else {
      stripeMessage = `Error. Please report this. Error: ${err.message}`;
    }

    this.setState({
      showStripe: true,
      stripeIsError: true,
      stripeMessage,
    });
  }

  onSave = async () => {
    const saveDeck = deckValidation.sanitizeDeckPreValidation({
      ...this.state.gridDeck,
      cards: gridCardsToApiCards(this.state.gridDeck.cards),
    });

    const validationResult = deckValidation.validateDeck(saveDeck);

    if (!validationResult.success) {
      return this.handleValidationError(validationResult);
    }

    this.setState({
      saving: true,
      showStripe: false,
      stripeIsError: true,
    });

    try {
      if (!this.state.gridDeck._id) {
        const res = await axios.post('/api/decks', saveDeck);
        this.setState((state) => {
          state.gridDeck._id = res.data._id;
          return state;
        });
      } else {
        await axios.patch(`/api/decks/${this.state.gridDeck._id}`, saveDeck);
      }

      this.setState({
        showStripe: true,
        stripeIsError: false,
        stripeMessage: <span>Saved. You can load this deck on Discord with <strong>k!quiz {this.state.gridDeck.shortName}</strong>.</span>,
      })
    } catch (err) {
      this.handleApiError(err);
    }

    this.setState({
      saving: false,
    });
  }

  onDelete = async () => {
    try {
      // There is only something to delete if the deck has been saved.
      if (this.state.gridDeck._id) {
        await axios.delete(`/api/decks/${this.state.gridDeck._id}`);
      }

      window.location = '/dashboard';
    } catch (err) {
      if (err.response && err.response.status === 404) {
        window.location = '/dashboard';
      } else {
        this.handleApiError(err);
      }
    }
  }

  onExport = () => {
    const exportRows = [['Question', 'Answers', 'Comment', 'Instructions', 'Render as']].concat(this.state.gridDeck.cards.map(q => {
      const row = [q.question, q.answers, q.comment, q.instructions, q.questionCreationStrategy];
      return row;
    }));

    csvStringify(exportRows, (err, output) => {
      if (err) {
        this.setState({
          showStripe: true,
          stripeIsError: true,
          stripeMessage: `There was an error exporting your deck. Please report this: ${err.message}`,
        });

        return;
      }

      download(output, `${this.state.gridDeck.shortName || 'deck'}.csv`);
    });
  }

  onImport = () => {
    this.fileInputField.click();
  }

  onFileSelected = () => {
    const file = this.fileInputField.files[0];
    this.fileInputField.value = null;
    const fileReader = new FileReader();
    fileReader.readAsText(file);

    fileReader.onloadend = () => {
      const str = fileReader.result;
      csvParse(str, (err, rows) => {
        if (err) {
          this.setState({
            showStripe: true,
            stripeIsError: true,
            stripeMessage: `There was an error importing your deck: ${err.message}`,
          });

          return;
        }

        this.setState((state) => {
          state.gridDeck.cards = rows.slice(1).map((row, i) => {
            const newRow = {
              index: i,
              question: row[0] ? row[0].trim() : '',
              answers: row[1] ? row[1].trim() : '',
              comment: row[2] ? row[2].trim() : '',
              instructions: row[3] ? row[3].trim() : '',
              questionCreationStrategy: row[4] ? row[4].trim() : '',
            };

            if (!isEmptyRow(newRow)) {
              newRow.questionCreationStrategy = newRow.questionCreationStrategy || 'Image';
              newRow.instructions = newRow.instructions || state.defaultInstructions;
            }

            return newRow;
          });

          return state;
        });
      });
    }
  }

  onErrorCloseClicked = () => {
    this.setState({
      showStripe: false,
    });
  }

  render() {
    if (!this.state.gridDeck) {
      return (
        <NotificationStripe show={this.state.showStripe} message={this.state.stripeMessage} onClose={this.onErrorCloseClicked} isError={this.state.stripeIsError} />
      );
    }

    return (
      <>
        <Header />
        <input type="file" accept=".csv" style={styles.hiddenFileInput} onChange={this.onFileSelected} ref={(el) => { this.fileInputField = el; }} />
        <div className="modal" tabIndex="-1" role="dialog" id="deleteConfirmationModal">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">DELETE</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>This deck will be permanently deleted.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" data-dismiss="modal" onClick={this.onDelete}>DELETE</button>
                <button type="button" className="btn btn-primary" data-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <main className="container-fluid p-5">
          <div className="row">
            <div className="col-md-3 offset-md-1">
              <div className="form-group">
                <label className="bmd-label-floating" htmlFor="fullDeckName">Full deck name</label>
                <input
                  autoComplete="off"
                  onChange={this.onMetadataChange}
                  name="fullDeckName"
                  className="form-control"
                  value={this.state.gridDeck.name}
                  ref={(el) => { this.fullNameField = el; }}
                  maxLength={deckValidation.FULL_NAME_MAX_LENGTH}
                  required
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="bmd-label-floating" htmlFor="shortDeckName">Short deck name</label>
                <input
                  autoComplete="off"
                  onChange={this.onMetadataChange}
                  name="shortDeckName"
                  className="form-control"
                  value={this.state.gridDeck.shortName}
                  ref={(el) => { this.shortNameField = el; }}
                  maxLength={deckValidation.SHORT_NAME_MAX_LENGTH}
                  pattern={deckValidation.SHORT_NAME_ALLOWED_CHARACTERS_REGEX_HTML}
                  required
                />
                <span className="bmd-help">Load on Discord with <strong>k!quiz {this.state.gridDeck.shortName}</strong></span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="bmd-label-floating" htmlFor="defaultInstructions">Default instructions</label>
                <input
                  autoComplete="off"
                  onChange={this.onMetadataChange}
                  name="defaultInstructions"
                  className="form-control"
                  value={this.state.defaultInstructions}
                  ref={(el) => { this.defaultInstructionsField = el; }}
                  maxLength={deckValidation.INSTRUCTIONS_MAX_LENGTH}
                />
                <span className="bmd-help">New questions you add will automatically be given these instructions.</span>
              </div>
            </div>
          </div>
          <div className="row mt-4">
            <div className="col-xl-1 col-md-2 d-flex flex-column align-items-center">
              <button className="btn btn-primary btn-outline d-flex flex-column align-items-center" style={styles.actionButton} disabled={this.state.saving} onClick={this.onSave}>
                <i className="material-icons" style={styles.icon}>save</i>Save to bot
              </button>
              <button className="btn btn-primary btn-outline d-flex flex-column align-items-center mt-4" style={styles.actionButton} onClick={this.onExport}>
                <i className="material-icons" style={styles.icon}>vertical_align_bottom</i>Export as CSV
              </button>
              <button className="btn btn-primary btn-outline d-flex flex-column align-items-center mt-4" style={styles.actionButton} onClick={this.onImport}>
                <i className="material-icons" style={styles.icon}>vertical_align_top</i>Import from CSV
              </button>
              <button className="btn btn-danger btn-outline d-flex flex-column align-items-center mt-4" style={styles.actionButton} data-toggle="modal" data-target="#deleteConfirmationModal">
                <i className="material-icons" style={styles.icon}>delete</i>Delete
              </button>
            </div>
            <div className="col-xl-11 col-md-10">
              <ReactDataGrid
                columns={columns}
                rowGetter={i => this.state.gridDeck.cards[i] || createEmptyRow(i) }
                rowsCount={Math.min(this.state.gridDeck.cards.length + 30, 5000)}
                minHeight={900}
                enableCellSelect={true}
                onGridRowsUpdated={this.onGridRowsUpdated}
              />
            </div>
          </div>
          <div className="row mt-5">
            <div className="col-12">
              <h2>Pro Tips</h2>
              <ol>
                <li>
                  You can move between cells with your arrow keys and edit by pressing enter.
                </li>
                <li>
                  If you need to do more advanced operations such as mass selection or copy and pasting, you can export as CSV, make changes in Excel, Google Sheets, etc, and import the CSV back.
                </li>
                <li>
                  Refrain from moving a question to a different row. Save data depends on the question #, so moving a question can mess up people's save data. It is okay to have empty rows, they will be skipped by the bot.
                </li>
                <li>
                  Consider exporting your deck as CSV and keeping a copy safe on your computer, just in case.
                </li>
                <li>
                  If you have any problems or need help, <a href="https://discord.gg/zkAKbyJ">visit me in my lair</a>.
                </li>
                <li>
                  If you think your deck is good enough to be included on Kotoba's main deck list, <a href="https://discord.gg/zkAKbyJ">visit me in my lair</a> and tell me. Consider the following guidelines first.
                  <ul>
                    <li>Deck should be unique, or a better version of an existing deck.</li>
                    <li>Deck should have 300+ questions.</li>
                    <li>Deck should be safe-for-work.</li>
                    <li>Deck should contain few or no mistakes.</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          <NotificationStripe show={this.state.showStripe} message={this.state.stripeMessage} onClose={this.onErrorCloseClicked} isError={this.state.stripeIsError} />
        </main>
      </>
    )
  }
}

export default EditDeck;
