// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import queryString from 'query-string';
import SocketNamespaces from '../common/socket_namespaces';
import socketEvents from '../common/kanji_game/socket_events';
import 'bootstrap-material-design-icons/css/material-icons.css';
import './game.css';
import '../main.css';
import RightPanel from '../game_common/right_panel';
import AnswerArea from '../game_common/answer_area';
import EventBox from '../game_common/event_box';
import ChooseUsernameModal from '../game_common/choose_username_modal';
import Analytics from '../util/analytics';
import NoSuchGameModal from '../game_common/no_such_game_modal';
import createAnchorIfUriPresent from '../util/create_anchor_if_uri_present';
import createSocket from '../util/create_socket';

const ANALYTICS_CATEGORY = 'kanji game';

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function UnansweredQuestions(props) {
  const { unansweredQuestions } = props;

  if (unansweredQuestions.length === 0) {
    return (<div />);
  }

  return (
    <div className="m-4 mt-5">
      <h4 className="mb-3">Unanswered questions</h4>
      { unansweredQuestions.map(questionInfo => (
        <span key={questionInfo.question}>
          {createAnchorIfUriPresent(questionInfo.question, questionInfo.dictionaryLink)}
          &nbsp;&nbsp;
        </span>
      ))}
    </div>
  );
}

UnansweredQuestions.propTypes = {
  unansweredQuestions: PropTypes.arrayOf(PropTypes.shape({
    question: PropTypes.string.isRequired,
    dictionaryLink: PropTypes.string,
  }).isRequired),
};

UnansweredQuestions.defaultProps = {
  unansweredQuestions: [],
};

class Game extends Component {
  constructor(props) {
    super(props);

    this.state = {
      events: [],
      currentQuestionData: {
        instructions: 'Next Question',
        imageDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Transparent placeholder
      },
      scoresData: {
        scoreForUsername: {},
        avatarForUsername: {},
      },
      roomClosed: false,
      unansweredQuestions: [],
    };

    this.nextEventID = 0;
  }

  componentDidMount() {
    Analytics.setPageView('/kanjigame/game');

    this.socket = createSocket(SocketNamespaces.KANJI_GAME);

    const { location } = this.props;
    const query = queryString.parse(location.search);

    if (!query.username) {
      window.$('#chooseUsernameModal').modal();
      return;
    }

    this.socket.on(socketEvents.Server.NO_SUCH_GAME, () => {
      window.$('#noSuchGameModal').modal();
    });

    this.socket.on(
      socketEvents.Server.CHAT,
      data => this.handleEventBoxEvent(EventBox.EventType.CHAT, data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_LEFT,
      data => this.handleEventBoxEvent(EventBox.EventType.PLAYER_LEFT, data),
    );

    this.socket.on(
      socketEvents.Server.UNANSWERED,
      data => this.handleEventBoxEvent(EventBox.EventType.NO_ANSWER, data),
    );

    this.socket.on(
      socketEvents.Server.ANSWERED,
      data => this.handleEventBoxEvent(EventBox.EventType.CORRECT_ANSWER_KANJI, data),
    );

    this.socket.on(
      socketEvents.Server.GAME_ENDED,
      data => this.handleEventBoxEvent(EventBox.EventType.GAME_ENDED, data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_JOINED,
      data => this.handleEventBoxEvent(EventBox.EventType.PLAYER_JOINED, data),
    );

    this.socket.on(
      socketEvents.Server.ROOM_CLOSED,
      data => this.handleRoomClosed(data),
    );

    this.socket.on(
      socketEvents.Server.SCORE_UPDATE,
      data => this.handleScoreUpdate(data),
    );

    this.socket.on(
      socketEvents.Server.NEW_QUESTION,
      data => this.handleNewQuestion(data),
    );

    this.socket.on(
      socketEvents.Server.AVATAR_ASSIGNED,
      data => this.handleAvatarAssigned(data),
    );

    this.socket.on(
      socketEvents.Server.UNANSWERED_QUESTIONS_LIST,
      data => this.handleUnansweredQuestionsListUpdate(data),
    );

    Analytics.event(ANALYTICS_CATEGORY, 'Joining');

    this.socket.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.warn(err);
    });

    this.socket.on('connect_error', (err) => {
      // eslint-disable-next-line no-console
      console.warn(err);
    });

    this.socket.on('reconnect_error', (err) => {
      // eslint-disable-next-line no-console
      console.warn(err);
    });

    this.socket.on('connect', () => {
      this.socket.emit(socketEvents.Client.JOIN_GAME, query);
    });

    window.$('.navbar-collapse').collapse('hide');
  }

  componentWillUnmount() {
    Analytics.event(ANALYTICS_CATEGORY, 'Leaving');
    this.socket.close();
  }

  getGameID() {
    const { location } = this.props;
    const { gameID } = queryString.parse(location.search);
    return gameID;
  }

  handleNewQuestion = (questionData) => {
    Analytics.event(ANALYTICS_CATEGORY, 'Question received');
    this.setState({
      currentQuestionData: {
        instructions: questionData.instructions,
        imageDataUri: `data:image/png;base64,${arrayBufferToBase64(questionData.bodyAsPngBuffer)}`,
      },
    });
  };

  getNextEventId = () => {
    this.nextEventID += 1;
    return this.nextEventID - 1;
  }

  handleEventBoxEvent = (eventType, eventData) => {
    this.setState((previousState) => {
      previousState.events.push({ eventType, eventData, eventID: this.getNextEventId() });
      while (previousState.events.length > 100) {
        previousState.events.shift();
      }
      return previousState;
    });
  }

  handleAvatarAssigned = (avatar) => {
    this.setState({ avatar });
  }

  handleScoreUpdate = (scoresData) => {
    this.setState({ scoresData });
  }

  handleRoomClosed = () => {
    this.setState({ roomClosed: true });
    this.handleEventBoxEvent(EventBox.EventType.ROOM_CLOSED);
    this.socket.close();
  }

  handleUnansweredQuestionsListUpdate = (unansweredQuestions) => {
    this.setState({ unansweredQuestions });
  }

  onSubmit = (answer) => {
    const { roomClosed, avatar } = this.state;
    const { location } = this.props;

    if (roomClosed) {
      return;
    }

    Analytics.event(ANALYTICS_CATEGORY, 'Chat or answer', answer);

    this.socket.emit(socketEvents.Client.CHAT, answer);
    this.handleEventBoxEvent(EventBox.EventType.CHAT, {
      username: queryString.parse(location.search).username,
      text: answer,
      avatar,
    });
  }

  onSkip = () => {
    Analytics.event(ANALYTICS_CATEGORY, 'Skipped');
    this.socket.emit(socketEvents.Client.SKIP);
  }

  onUsernameSelected = (username) => {
    Analytics.event(ANALYTICS_CATEGORY, 'Selected username', username);
    const gameID = this.getGameID();
    window.location = `/kanjigame/game?gameID=${gameID}&username=${username}`;
  }

  render() {
    const gameID = this.getGameID();
    const joinLink = `https://${window.location.host}${window.location.pathname}?gameID=${gameID}`;
    const {
      currentQuestionData, events, scoresData, unansweredQuestions,
    } = this.state;

    const usernames = Object.keys(scoresData.scoreForUsername);
    const users = usernames.map(username => ({
      username,
      score: scoresData.scoreForUsername[username],
      avatar: scoresData.avatarForUsername[username],
      active: true,
    }));

    const rightPanelBottomComponent = (
      <UnansweredQuestions unansweredQuestions={unansweredQuestions} />
    );

    return (
      <div>
        <NoSuchGameModal createGameURI="/kanjigame/create" />
        <ChooseUsernameModal usernameChosen={this.onUsernameSelected} />
        <RightPanel
          inviteLink={joinLink}
          users={users}
          bottomComponent={rightPanelBottomComponent}
        />
        <EventBox events={events} startNewGameLink="/kanjigame/create" subclass="kanjiEventBox" />
        <AnswerArea
          {...currentQuestionData}
          onSubmit={this.onSubmit}
          onSkip={this.onSkip}
          canHideInstructions
        />
      </div>
    );
  }
}

export default withRouter(Game);
