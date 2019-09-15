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
import Analytics from '../../util/analytics';
import assert from 'assert';

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
  { key: 'index', name: '#', width: 62 },
  { key: 'question', name: 'Question', editable: true },
  { key: 'answers', name: 'Answers', editable: true },
  { key: 'comment', name: 'Comment', editable: true },
  { key: 'instructions', name: 'Instructions', editable: true },
  { key: 'questionCreationStrategy', name: 'Render as', editor: RenderAsEditor, editable: true, width: 110 },
];

const sampleGridCard = {
  index: 0,
  question: '明日',
  answers: 'あした,あす',
  comment: 'Tomorrow',
  instructions: 'Type the reading of the word in hiragana!',
  questionCreationStrategy: upperCaseFirstCharOnly(deckValidation.allowedQuestionCreationStrategies[0]),
};

const emptyGridCard = {
  question: '',
  answers: '',
  comment: '',
  instructions: '',
  questionCreationStrategy: '',
};

function createEmptyGridCard(index) {
  return { ...emptyGridCard, index };
}

function gridCardsToApiCards(gridCards) {
  const cards = gridCards.map((gridCard) => {
    if (isEmptyGridCard(gridCard)) {
      return null;
    }
    const apiCard = {
      question: gridCard.question,
      answers: gridCard.answers.replace(/、/g, ',').split(','),
      comment: gridCard.comment,
      instructions: gridCard.instructions,
      questionCreationStrategy: gridCard.questionCreationStrategy.toUpperCase(),
    };

    return apiCard;
  });

  // Remove null cards from the end.
  while (cards.length > 0 && !cards[cards.length - 1]) {
    cards.pop();
  }

  return cards;
}

function apiCardsToGridCards(apiCards) {
  return apiCards.map((apiCard, index) => {
    if (apiCard === null) {
      return createEmptyGridCard(index);
    }

    const gridCard = {
      index,
      question: apiCard.question,
      answers: apiCard.answers.join(','),
      comment: apiCard.comment,
      instructions: apiCard.instructions,
      questionCreationStrategy: upperCaseFirstCharOnly(apiCard.questionCreationStrategy),
    };

    return gridCard;
  });
}

function isEmptyGridCard(row) {
  assert(Object.keys(row).length === 6, 'Unexpected number of row properties'); // All the below properties plus index and questionCreationStrategy
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
          name: `${localStorage.getItem('username')}'s New Quiz`,
          shortName: 'new_quiz',
          cards: [{ ...sampleGridCard }],
        }
      });
    }

    try {
      const apiDeck = (await axios.get(`/api/decks/${deckId}`)).data;
      const gridDeck = {
        _id: apiDeck._id,
        name: apiDeck.name,
        shortName: apiDeck.shortName,
        cards: apiCardsToGridCards(apiDeck.cards),
      };

      this.setState({ gridDeck });
    } catch (err) {
      return this.handleError(err);
    }
  }

  componentDidMount() {
    this.loadDeck();
    Analytics.setPageView('/dashboard/decks');
  }

  onGridRowsUpdated = ({ fromRow: gridCardIndex, toRow, updated }) => {
    this.setState((state) => {
      // Push empty cards to fill the space up to this one
      while (state.gridDeck.cards.length < gridCardIndex + 1) {
        const row = createEmptyGridCard(state.gridDeck.cards.length);
        state.gridDeck.cards.push(row);
      }

      const gridCard = state.gridDeck.cards[gridCardIndex];
      const isNewGridCard = isEmptyGridCard(gridCard);

      if (updated.instructions !== undefined) {
        state.defaultInstructions = updated.instructions;
      }

      const updatedGridCard = { ...gridCard, ...updated };
      if (isNewGridCard && !isEmptyGridCard(updatedGridCard)) {
        if (!updatedGridCard.instructions) {
          updatedGridCard.instructions = state.defaultInstructions.trim();
        }
        if (!updatedGridCard.questionCreationStrategy) {
          updatedGridCard.questionCreationStrategy = upperCaseFirstCharOnly(deckValidation.allowedQuestionCreationStrategies[0]);
        }
      }

      if (isEmptyGridCard(updatedGridCard)) {
        updatedGridCard.questionCreationStrategy = '';
      }

      Object.keys(updatedGridCard).forEach(key => {
        if (typeof updatedGridCard[key] === typeof '') {
          updatedGridCard[key] = updatedGridCard[key].trim();
        }
      });

      state.gridDeck.cards[gridCardIndex] = updatedGridCard;

      return state;
    });
  };

  onMetadataChange = () => {
    this.setState((state) => {
      state.gridDeck.name = this.fullNameField.value;
      state.gridDeck.shortName = this.shortNameField.value.toLowerCase();

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

  handleError(err) {
    let stripeMessage = '';

    if (err.response) {
      const { response } = err;
      if (response.status === 401) {
        window.location = '/dashboard';
        return;
      }

      const responseBody = response.data;
      if (response.status === 404) {
        stripeMessage = 'Deck not found. Check that your link is valid and that the deck has not been deleted by its owner.';
      } else if (response.status === 413) {
        stripeMessage = 'Your deck is too big. There is a limit of 20,000 questions and also an overall combined size limit in megabytes. Make sure your CSV size is smaller than approx 2 MB.';
      } else if (responseBody.errorType === deckValidation.DECK_VALIDATION_ERROR_TYPE) {
        return this.handleValidationError(responseBody);
      } else if (responseBody.message) {
        stripeMessage = responseBody.message;
      } else {
        stripeMessage = err.message;
      }
    } else {
      stripeMessage = err.message;
    }

    this.setState({
      showStripe: true,
      stripeIsError: true,
      stripeMessage,
    });
  }

  onSave = async () => {
    const saveDeck = deckValidation.sanitizeDeckPreValidation({
      name: this.state.gridDeck.name,
      shortName: this.state.gridDeck.shortName,
      cards: gridCardsToApiCards(this.state.gridDeck.cards),
    });

    const validationResult = deckValidation.validateDeck(saveDeck);

    if (!validationResult.success) {
      return this.handleValidationError(validationResult);
    }

    this.setState({
      saving: true,
      showStripe: false,
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
      });
    } catch (err) {
      this.handleError(err);
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
        this.handleError(err);
      }
    }
  }

  onExport = () => {
    const exportCardRows = this.state.gridDeck.cards.map(q =>
      [q.question, q.answers, q.comment, q.instructions, q.questionCreationStrategy]);

    const exportHeaderRow = ['Question', 'Answers', 'Comment', 'Instructions', 'Render as'];
    const exportRows = [exportHeaderRow].concat(exportCardRows);

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
          state.gridDeck.cards = rows.slice(1).map((row, index) => {
            const newRow = {
              index,
              question: row[0] ? row[0].trim() : '',
              answers: row[1] ? row[1].trim() : '',
              comment: row[2] ? row[2].trim() : '',
              instructions: row[3] ? row[3].trim() : '',
              questionCreationStrategy: row[4] ? row[4].trim() : '',
            };

            if (!isEmptyGridCard(newRow)) {
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
                rowGetter={i => this.state.gridDeck.cards[i] || createEmptyGridCard(i) }
                rowsCount={Math.min(this.state.gridDeck.cards.length + 30, 20000)}
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
                  You can get my built-in decks in CSV format <a href="https://storage.googleapis.com/kotoba_public_quiz_data/index.html">here</a> and import them into this editor.
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
