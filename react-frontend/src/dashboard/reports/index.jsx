import React, { Component, PureComponent } from 'react';
import Header from './../header';
import axios from 'axios';
import defaultAvatar from '../../img/discord_default_avatar.png';
import NotificationStripe from '../../controls/notification_stripe';

const trophies = ['🏆', '🥈', '🥉'];

function avatarUriForAvatar(avatar, userId) {
  return avatar ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}` : defaultAvatar;
}

function Scorer({ id, username, discriminator, avatar, points, index }) {
  const trophy = trophies[index] || '';
  const nameString = `${trophy} ${username}#${discriminator}`.trim();
  const pointsString = `${points} points`;
  const avatarUri = avatarUriForAvatar(avatar, id);

  return (
    <div className="d-flex flex-column align-items-center" key="id">
      <img src={avatarUri} className="rounded-circle mb-3" />
      {nameString}
      <span className="text-success">{pointsString}</span>
    </div>
  );
}

function ScorerAvatarSmall({ discordUser }) {
  const uri = avatarUriForAvatar(discordUser.avatar, discordUser.id);
  return <img src={uri} key={discordUser.id} className="rounded-circle mr-1" width="24" height="24" />;
}

function ScorersCell({ scorers, participantForId }) {
  const avatars = scorers
    .map(scorer => participantForId[scorer].discordUser)
    .map(dUser => <ScorerAvatarSmall discordUser={dUser} key={dUser.id} />);

  return (
    <td>
      <div className="d-flex flex-wrap">
        { avatars }
      </div>
    </td>
  );
}

function CardRow({ card, participantForId, onCheck, selfUserId }) {
  const rowClass = !selfUserId || card.correctAnswerers.indexOf(selfUserId) !== -1
    ? ''
    : 'alert alert-danger';

  return (
    <tr onClick={onCheck} className={rowClass}>
      <td><input type="checkbox" checked={card.checked} disabled={!card.canCopyToCustomDeck} /></td>
      <td>{card.question}</td>
      <td>{card.answers.join(', ')}</td>
      <td>{card.comment}</td>
      <ScorersCell scorers={card.correctAnswerers} participantForId={participantForId} />
    </tr>
  )
}

class Questions extends PureComponent {
  render() {
    return this.props.cards.map((card, i) => {
      return (
        <CardRow
          card={card}
          participantForId={this.props.participantForId}
          key={i}
          onCheck={(ev) => this.props.onCardChecked(i)}
          selfUserId={this.props.selfUserId}
        />
      );
    });
  }
}

const loginErrorMessage = <span>You must be logged in to do that. <a href="/api/login" className="text-info">Login</a></span>;
const noDecksErrorMessage = <span>You don't have any custom decks yet. <a href="/dashboard/decks/new" className="text-info">Create one</a></span>;

class ReportView extends Component {
  constructor() {
    super();
    this.state = {
      report: undefined,
      showStripeMessage: false,
      stripeMessage: '',
      stripeMessageIsError: false,
      checkAll: false,
      anySelected: false,
      customDecks: undefined,
      checkedLogin: false,
      adding: false,
      selectedDeckIndex: -1,
      selfUserId: '',
    };
  }

  async loadUser() {
    try {
      const user = (await axios.get('/api/users/me')).data;
      this.setState({
        selfUserId: user._id,
      });
    } catch (err) {
      // NOOP
    }
  }

  async loadReport() {
    const reportId = this.props.match.params.id;

    try {
      const report = (await axios.get(`/api/game_reports/${reportId}`)).data;
      this.setState({ report });
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
    this.loadUser();
  }

  onCardChecked = (index) => {
    this.setState((state) => {
      const card = state.report.questions[index];
      const checked = !card.checked && card.canCopyToCustomDeck;
      if (!checked) {
        state.checkAll = false;
      }
      state.report.questions[index].checked = checked;
      if (checked) {
        state.anySelected = true;
      } else {
        state.anySelected = state.report.questions.some(q => q.checked);
      }

      return state;
    });
  }

  onCheckAll = (ev) => {
    const checked = ev.target.checked;

    this.setState((state) => {
      state.checkAll = checked;
      state.anySelected = checked;
      state.report.questions.forEach((question) => {
        console.log(JSON.stringify(question));
        question.checked = checked && question.canCopyToCustomDeck;
      });

      return state;
    });
  }

  onStripeCloseClicked = () => {
    this.setState({
      showStripeMessage: false,
    });
  }

  onAddRequsted = () => {
    this.setState({
      stripeMessage: this.state.customDecks ? noDecksErrorMessage : loginErrorMessage,
      stripeMessageIsError: true,
      showStripeMessage: true,
    });
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
          cards: this.state.report.questions.filter(q => q.checked).map(q => ({
            question: q.question,
            answers: q.answers,
            comment: q.comment,
            instructions: q.instructions,
            questionCreationStrategy: q.questionCreationStrategy,
          })),
        };

        await axios.patch(`/api/decks/${deck._id}`, request);

        this.setState({
          stripeMessage: 'Questions added',
          stripeMessageIsError: false,
          showStripeMessage: true,
        });
      } catch (err) {
        console.log(JSON.stringify(err, null, 2));
        let errorMessage;
        if (err.response && err.response.data) {
          if (err.response.data.rejectedCard) {
            errorMessage = <span>That deck already has this question: <strong>{err.response.data.rejectedCard.question}</strong>. No questions were added.</span>;
          } else if (err.response.data.rejectionReason) {
            errorMessage = err.response.data.rejectionReason;
          } else {
            errorMessage = `Error, please report: ${err.message}`;
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
    console.log(ev.target.value);
    this.setState({
      selectedDeckIndex: parseInt(ev.target.value),
    });
  }

  render() {
    if (!this.state.report) {
      return <NotificationStripe show={this.state.showStripeMessage} message={this.state.stripeMessage} onClose={this.onStripeCloseClicked} isError={this.state.stripeMessageIsError} />;
    }

    const firstParticipant = this.state.report.participants[0];
    const firstDiscordUser = firstParticipant.discordUser;
    const firstParticipantAvatarUri = avatarUriForAvatar(firstDiscordUser.avatar, firstDiscordUser.id);

    const participantForId = {};
    this.state.report.participants.forEach((participant) => {
      participantForId[participant._id] = participant;
    });

    const pointsForParticipantId = {};
    this.state.report.scores.forEach(({ user, score }) => {
      pointsForParticipantId[user] = score;
    });

    return (
      <>
        <Header />
        <main className="container">
          <div className="row">
            <div className="col-12">
              <div className="d-flex flex-column mt-5 align-items-center">
                <h1>{this.state.report.sessionName}</h1>
                <div className="d-flex align-items-center mb-5">
                  <img src={this.state.report.discordServerIconUri || firstParticipantAvatarUri} width="32" height="32" className="rounded-circle mr-2" />
                  <span className="badge badge-primary">
                    <strong>{this.state.report.discordServerName}</strong>
                    { this.state.report.channelName || '' }
                  </span>
                </div>
                <div className="d-flex flex-wrap mt-5">
                  { this.state.report.participants.map((participant, i) => <Scorer {...participant.discordUser} index={i} points={pointsForParticipantId[participant._id]} key={participant._id} />) }
                </div>
                <table className="table mt-5 table-bordered table-hover">
                  <thead>
                    <tr>
                      <th width="20px"><input type="checkbox" checked={this.state.checkAll} onChange={this.onCheckAll} /></th>
                      <th scope="col">Question</th>
                      <th scope="col" width="200px">Answers</th>
                      <th scope="col">Comment</th>
                      <th scope="col">Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Questions
                      cards={this.state.report.questions}
                      participantForId={participantForId}
                      onCardChecked={this.onCardChecked}
                      selfUserId={this.state.selfUserId}
                    />
                  </tbody>
                </table>
              </div>
              <div className={`col-12 p-0${!this.state.customDecks || this.state.customDecks.length === 0 ? '' : ' d-none'}`}>
                <button className="btn btn-primary" disabled={!this.state.anySelected} onClick={this.onAddRequsted}>Add selected questions to custom deck</button>
              </div>
              <div className={this.state.customDecks && this.state.customDecks.length > 0 ? '' : 'd-none'}>
                <select className="custom-select mb-2 mt-5" defaultValue={-1} onChange={this.onSelectedDeckChanged}>
                  <option value={-1}>Choose a deck</option>
                  {
                    (this.state.customDecks || []).map((deck, i) => (
                      <option key={deck._id} value={i}>{deck.name} ({deck.shortName})</option>
                    ))
                  }
                </select>
                <button className="btn btn-primary mb-5" onClick={this.onAddToDeck} disabled={this.state.adding || this.state.selectedDeckIndex === -1 || !this.state.anySelected}>Add selected questions to deck</button>
              </div>
            </div>
          </div>
        </main>
        <NotificationStripe show={this.state.showStripeMessage} message={this.state.stripeMessage} onClose={this.onStripeCloseClicked} isError={this.state.stripeMessageIsError} />
      </>
    );
  }
}

export default ReportView;
