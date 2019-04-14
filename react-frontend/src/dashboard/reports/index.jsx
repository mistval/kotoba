import React, { Component } from 'react';
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
      <img src={avatarUri} className="rounded-circle mb-2" />
      {nameString}
      <span className="text-primary">{pointsString}</span>
    </div>
  );
}

function ScorerAvatar({ discordUser }) {
  return <img src={avatarUriForAvatar(discordUser.avatar, discordUser.id)} key={discordUser.id} className="rounded-circle" width="32" height="32" />;
}

function ScorersCell({ scorers, participantForId }) {
  const avatars = scorers
    .map(scorer => participantForId[scorer].discordUser)
    .map(dUser => <ScorerAvatar discordUser={dUser} key={dUser.id} />);

  return (
    <td>
      <div class="d-flex flex-wrap">
        { avatars }
      </div>
    </td>
  );
}

function CardRow({card, participantForId}) {
  console.log(card);
  return (
    <tr>
      <td>{card.question}</td>
      <td>{card.answers.join(', ')}</td>
      <td>{card.comment}</td>
      <ScorersCell scorers={card.correctAnswerers} participantForId={participantForId} />
    </tr>
  )
}

class ReportView extends Component {
  constructor() {
    super();
    this.state = {
      report: undefined,
      showStripeMessage: false,
      stripeMessage: '',
      stripeMessageIsError: false,
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
        <main class="container">
          <div class="row">
            <div className="col-12">
              <div className="d-flex flex-column mt-5">
                <h1>{this.state.report.sessionName}</h1>
                <div className="d-flex align-items-center mt-2">
                  <img src={this.state.report.discordServerIconUri || firstParticipantAvatarUri} width="32" height="32" className="rounded-circle mr-3" />
                  <strong>{this.state.report.discordServerName}</strong>
                  { this.state.report.channelName || '' }
                </div>
                <div className="d-flex flex-wrap mt-5">
                  { this.state.report.participants.map((participant, i) => <Scorer {...participant.discordUser} index={i} points={pointsForParticipantId[participant._id]} />) }
                </div>
                <table class="table">
                  <thead>
                    <tr>
                      <th scope="col">Question</th>
                      <th scope="col">Answers</th>
                      <th scope="col">Comment</th>
                      <th scope="col">Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    { this.state.report.questions.map(card => <CardRow card={card} participantForId={participantForId} /> ) }
                    { this.state.report.questions.map(card => <CardRow card={card} participantForId={participantForId} /> ) }
                    { this.state.report.questions.map(card => <CardRow card={card} participantForId={participantForId} /> ) }
                    { this.state.report.questions.map(card => <CardRow card={card} participantForId={participantForId} /> ) }
                    { this.state.report.questions.map(card => <CardRow card={card} participantForId={participantForId} /> ) }
                    { this.state.report.questions.map(card => <CardRow card={card} participantForId={participantForId} /> ) }
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
