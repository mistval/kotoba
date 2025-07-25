import React, { Component, PureComponent } from 'react';
import axios from 'axios';
import defaultAvatar from '../../img/discord_default_avatar.png';
import NotificationStripe from '../../controls/notification_stripe';
import Analytics from '../../util/analytics';

const ShowMode = {
  all: 'all',
  wrong: 'wrong',
};

const trophies = ['🏆', '🥈', '🥉'];

const styles = {
  scorer: {
    minWidth: '180px',
  },
};

function avatarUriForAvatar(avatar, userId) {
  return avatar ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}` : defaultAvatar;
}

function Scorer({
  id, username, avatar, points, index,
}) {
  const trophy = trophies[index] || '';
  const nameString = `${trophy} ${username}`.trim();
  const pointsString = `${points} points`;
  const avatarUri = avatarUriForAvatar(avatar, id);

  return (
    <div className="d-flex flex-column align-items-center mx-2 mb-3" style={styles.scorer} key="id">
      <img src={avatarUri} alt="user avatar" className="rounded-circle mb-3" height="128" width="128" />
      {nameString}
      <span className="text-success">{pointsString}</span>
    </div>
  );
}

function ScorerAvatarSmall({ discordUser }) {
  const uri = avatarUriForAvatar(discordUser.avatar, discordUser.id);
  return <img alt="user avatar" src={uri} key={discordUser.id} className="rounded-circle mr-1 mb-1" width="24" height="24" />;
}

function ScorersCell({ scorers, participantForId }) {
  const avatars = scorers
    .map((scorer) => participantForId[scorer].discordUser)
    .map((dUser) => <ScorerAvatarSmall discordUser={dUser} key={dUser.id} />);

  return (
    <td>
      <div className="d-flex flex-wrap">
        { avatars }
      </div>
    </td>
  );
}

function didAnswerCard(card, participantForId, selfUserId) {
  const selfWasInGame = Boolean(participantForId[selfUserId]);
  const selfDidAnswer = card.correctAnswerers.includes(selfUserId);
  const anyoneDidAnswer = card.correctAnswerers.length > 0;

  return (selfWasInGame && selfDidAnswer) || (!selfWasInGame && anyoneDidAnswer);
}

function CardRow({
  card, participantForId, onCheck, selfUserId,
}) {
  const rowClass = didAnswerCard(card, participantForId, selfUserId)
    ? ''
    : 'alert alert-danger';

  return (
    <tr onClick={onCheck} className={rowClass}>
      <td><input type="checkbox" checked={card.checked} disabled={!card.canCopyToCustomDeck} aria-label="selection checkbox" /></td>
      <td>{card.question}</td>
      <td>{card.answers.join(', ')}</td>
      <td>{card.comment}</td>
      <ScorersCell scorers={card.correctAnswerers} participantForId={participantForId} />
    </tr>
  );
}

class Questions extends PureComponent {
  render() {
    return this.props.cards.map((card, i) => {
      const key = `${this.props.reportId}/${i}`;

      return (
        <CardRow
          card={card}
          participantForId={this.props.participantForId}
          key={key}
          onCheck={() => this.props.onCardChecked(i)}
          selfUserId={this.props.selfUserId}
        />
      );
    });
  }
}

const noDecksErrorMessage = (
  <span>
    You don't have any custom decks yet.
    <a href="/dashboard/decks/new" className="text-info">Create one</a>
  </span>
);

function getParticipantsAsScorerElements(participants, pointsForParticipantId) {
  return participants.sort((p2, p1) => pointsForParticipantId[p1._id] - pointsForParticipantId[p2._id]).map((p, i) => (
    <Scorer
      {...p.discordUser}
      index={i}
      points={pointsForParticipantId[p._id]}
      key={p._id}
    />
  ));
}

function getUniqueCards(cards) {
  const questionsSeen = {};
  const uniqueCards = [];

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];

    if (!questionsSeen[card.question]) {
      uniqueCards.push(card);
      questionsSeen[card.question] = true;
    }
  }

  return uniqueCards;
}

class ReportView extends Component {
  constructor() {
    super();
    this.state = {
      report: undefined,
      showStripeMessage: false,
      stripeMessage: '',
      stripeMessageIsError: false,
      customDecks: undefined,
      adding: false,
      selectedDeckIndex: -1,
    };
  }

  allSelectableSelected() {
    return this.state.questionsToShow.every((c) => c.checked || !c.canCopyToCustomDeck);
  }

  anySelected() {
    return this.state.questionsToShow.some((c) => c.checked);
  }

  async loadReport() {
    const reportId = this.props.match.params.id;

    try {
      const report = (await axios.get(`/api/game_reports/${reportId}`)).data;
      this.setState({ report, questionsToShow: report.questions });
    } catch (err) {
      let errorMessage;
      if (err.response && err.response.status === 404) {
        errorMessage = 'Report not found. Check that your link is valid.';
      } else {
        errorMessage = err.message;
      }

      this.setState({
        showStripeMessage: true,
        stripeMessage: errorMessage,
        stripeMessageIsError: true,
      });
    }
  }

  async loadCustomDecks() {
    try {
      const decks = (await axios.get('/api/users/me/decks')).data;
      this.setState({
        customDecks: decks,
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Not logged in, NOOP
      } else {
        this.setState({
          showStripeMessage: true,
          stripeMessage: err.message,
          stripeMessageIsError: true,
        });
      }
    }
  }

  componentDidMount() {
    this.loadReport();
    this.loadCustomDecks();
    Analytics.setPageView('/dashboard/reports');
  }

  onShowModeChanged = (ev) => {
    if (ev.target.value === ShowMode.all) {
      this.setState((prev) => ({
        ...prev,
        questionsToShow: prev.report.questions,
      }));
    } else {
      this.setState((prev) => ({
        ...prev,
        questionsToShow: prev.report.questions.filter((q) => !didAnswerCard(q, this.getParticipantForId(), this.props.user?._id)),
      }));
    }
  }

  onCardChecked = (index) => {
    this.setState((state) => {
      const newQuestionsToShow = state.questionsToShow.map((q, i) => {
        if (i === index) {
          return {
            ...q,
            checked: !q.checked && q.canCopyToCustomDeck,
          };
        }

        return q;
      });

      return { ...state, questionsToShow: newQuestionsToShow };
    });
  }

  onCheckAllSelectable = (ev) => {
    const { checked } = ev.target;

    this.setState((state) => {
      const newState = { ...state };

      newState.questionsToShow = state.questionsToShow.map((question) => ({
        ...question,
        checked: checked && question.canCopyToCustomDeck,
      }));

      return newState;
    });
  }

  onStripeCloseClicked = () => {
    this.setState({
      showStripeMessage: false,
    });
  }

  onAddRequested = () => {
    this.setState(() => ({
      stripeMessage: noDecksErrorMessage,
      stripeMessageIsError: true,
      showStripeMessage: true,
    }));
  }

  onAddToDeck = () => {
    this.setState({
      adding: true,
      showStripeMessage: false,
    }, async () => {
      try {
        const deck = this.state.customDecks[this.state.selectedDeckIndex];
        const request = {
          appendCards: true,
          cards: getUniqueCards(this.state.questionsToShow.filter((q) => q.checked).map((q) => ({
            question: q.question,
            answers: q.answers,
            comment: q.comment,
            instructions: q.instructions,
            questionCreationStrategy: q.questionCreationStrategy,
          }))),
        };

        await axios.patch(`/api/decks/${deck._id}`, request);

        this.setState({
          stripeMessage: 'Questions added',
          stripeMessageIsError: false,
          showStripeMessage: true,
        });
      } catch (err) {
        let errorMessage;
        if (err.response && err.response.data) {
          if (err.response.data.rejectedCard) {
            errorMessage = (
              <span>
                That deck already has this question:&nbsp;
                <strong>{err.response.data.rejectedCard.question}</strong>
                . No questions were added.
              </span>
            );
          } else if (err.response.data.rejectionReason) {
            errorMessage = err.response.data.rejectionReason;
          } else {
            errorMessage = err.message;
          }
        } else {
          errorMessage = err.message;
        }

        this.setState({
          stripeMessage: errorMessage,
          stripeMessageIsError: true,
          showStripeMessage: true,
        });
      }

      this.setState({
        adding: false,
      });
    });
  }

  onSelectedDeckChanged = (ev) => {
    this.setState({
      selectedDeckIndex: parseInt(ev.target.value, 10),
    });
  }

  getParticipantForId = () => {
    const participantForId = {};
    this.state.report.participants.forEach((participant) => {
      participantForId[participant._id] = participant;
    });

    return participantForId;
  }

  render() {
    if (!this.state.report) {
      return <NotificationStripe show={this.state.showStripeMessage} message={this.state.stripeMessage} onClose={this.onStripeCloseClicked} isError={this.state.stripeMessageIsError} />;
    }

    const pointsForParticipantId = {};
    this.state.report.scores.forEach(({ user, score }) => {
      pointsForParticipantId[user] = score;
    });

    const participantForId = this.getParticipantForId();

    return (
      <>
        <main className="container">
          <div className="row">
            <div className="col-12">
              <div className="d-flex flex-column mt-5 align-items-center">
                <h1>{this.state.report.sessionName}</h1>
                <div className="d-flex align-items-center mb-5">
                  <span className="badge badge-primary text-light">
                    { this.state.report.discordServerName || 'DM' }
                  </span>
                </div>
                <div className="d-flex flex-wrap mt-5 justify-content-center">
                  { getParticipantsAsScorerElements(this.state.report.participants, pointsForParticipantId) }
                </div>
                <span className="align-self-start mt-2">
                  <select className="browser-default custom-select" onChange={this.onShowModeChanged}>
                    <option value={ShowMode.all}>Show all</option>
                    <option value={ShowMode.wrong}>Show wrong</option>
                  </select>
                </span>
                <table className="table mt-3 table-bordered table-hover">
                  <thead>
                    <tr>
                      <th width="2%">
                        <input
                          type="checkbox"
                          disabled={!this.state.questionsToShow.some((q) => q.canCopyToCustomDeck)}
                          checked={this.allSelectableSelected()}
                          onChange={this.onCheckAllSelectable}
                        />
                      </th>
                      <th scope="col" width="30%">Question</th>
                      <th scope="col" width="28%">Answers</th>
                      <th scope="col" width="25%">Comment</th>
                      <th scope="col" width="15%">Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Questions
                      cards={this.state.questionsToShow}
                      participantForId={participantForId}
                      onCardChecked={this.onCardChecked}
                      selfUserId={this.props.user?._id}
                      reportId={this.state.report._id}
                    />
                  </tbody>
                </table>
              </div>
              <div className={`col-12 p-0${this.state.customDecks?.length === 0 ? '' : ' d-none'}`}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!this.anySelected()}
                  onClick={this.onAddRequested}
                >
                  Add selected questions to custom deck
                </button>
              </div>
              <div className={this.state.customDecks && this.state.customDecks.length > 0 ? '' : 'd-none'}>
                <select className="custom-select mb-2 mt-5" defaultValue={-1} onChange={this.onSelectedDeckChanged}>
                  <option value={-1}>Choose a deck</option>
                  {
                    (this.state.customDecks || []).map((deck, i) => (
                      <option key={deck._id} value={i}>
                        {deck.name}
                        {' '}
                        (
                        {deck.shortName}
                        )
                      </option>
                    ))
                  }
                </select>
                <button
                  type="submit"
                  className="btn btn-primary mb-5"
                  onClick={this.onAddToDeck}
                  disabled={this.state.adding || this.state.selectedDeckIndex === -1 || !this.anySelected()}
                >
                  Add selected questions to deck
                </button>
              </div>
            </div>
          </div>
        </main>
        <aside className="container mb-5 mt-5">
          <div className="row">
            <div className="col-12">
              <h2>Pro tips</h2>
              <ul>
                <li>If a question cannot be checked off and added to a deck, that means its question type is not yet supported for custom decks.</li>
                <li>
                  If you need help, need to report a bug, or make a suggestion, visit me in&nbsp;
                  <a href="https://discord.gg/S92qCjbNHt">my lair</a>
                  .
                </li>
              </ul>
            </div>
          </div>
        </aside>
        <NotificationStripe
          show={this.state.showStripeMessage}
          message={this.state.stripeMessage}
          onClose={this.onStripeCloseClicked}
          isError={this.state.stripeMessageIsError}
        />
      </>
    );
  }
}

export default ReportView;
