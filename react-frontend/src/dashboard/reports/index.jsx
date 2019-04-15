import React, { Component, PureComponent } from 'react';
import Header from './../header';
import axios from 'axios';
import defaultAvatar from '../../img/discord_default_avatar.png';

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
      <span className="text-primary">{pointsString}</span>
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

function CardRow({card, participantForId, onCheck}) {
  return (
    <tr onClick={onCheck}>
      <td><input type="checkbox" checked={card.checked} /></td>
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
        />
      );
    });
  }
}

class ReportView extends Component {
  constructor() {
    super();
    this.state = {
      report: undefined,
      showStripeMessage: false,
      stripeMessage: '',
      stripeMessageIsError: false,
      checkAll: false,
    };
  }

  async loadReport() {
    const reportId = this.props.match.params.id;

    try {
      const report = (await axios.get(`/api/game_reports/${reportId}`)).data;
      this.setState({ report });
    } catch (err) {
      let errorMessage;
      if (err.response.status === 404) {
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

  componentDidMount() {
    console.log('x');
    this.loadReport();
  }

  componentWillUnmount() {
    console.log('y');
  }

  onCardChecked = (index) => {
    this.setState((state) => {
      const checked = !state.report.questions[index].checked;
      if (!checked) {
        state.checkAll = false;
      }
      state.report.questions[index].checked = checked;
      return state;
    });
  }

  onCheckAll = (ev) => {
    const checked = ev.target.checked;

    this.setState((state) => {
      state.checkAll = checked;
      state.report.questions.forEach((question) => {
        question.checked = checked;
      });

      return state;
    });
  }

  render() {
    if (!this.state.report) {
      return null;
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
                  <span class="badge badge-primary">
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
                      <th width="20px"><input type="checkbox" checked={this.state.checkAll} onClick={this.onCheckAll} /></th>
                      <th scope="col">Question</th>
                      <th scope="col">Answers</th>
                      <th scope="col">Comment</th>
                      <th scope="col">Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Questions
                      cards={this.state.report.questions}
                      participantForId={participantForId}
                      onCardChecked={this.onCardChecked}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }
}

export default ReportView;
