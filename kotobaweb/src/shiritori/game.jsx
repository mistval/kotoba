// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */

import React, { Component } from 'react';
import assert from 'assert';
import { withRouter } from 'react-router-dom';
import queryString from 'query-string';
import socketEvents from '../common/shiritori/socket_events';
import 'bootstrap-material-design-icons/css/material-icons.css';
import './game.css';
import '../main.css';
import RightPanel from '../game_common/right_panel';
import AnswerArea from '../game_common/answer_area';
import EventBox from '../game_common/event_box';
import ChooseUsernameModal from '../game_common/choose_username_modal';
import Analytics from '../util/analytics';
import NoSuchGameModal from '../game_common/no_such_game_modal';
import createSocket from '../util/create_socket';
import SocketNamespaces from '../common/socket_namespaces';

const ANALYTICS_CATEGORY = 'shiritori';

function getErrorTextForRejection(rejectionInformation) {
  const { reason, extraData } = rejectionInformation;
  if (reason === 'Unknown word') {
    return 'Unknown word';
  } if (reason === 'Reading already used') {
    return `Reading already used (${extraData.join(', ')})`;
  } if (reason === 'Reading ends with N') {
    return `Ends with ん sound (${extraData.join(', ')})`;
  } if (reason === 'Does not start with the right characters') {
    return `Answer must start with ${extraData.expected.join(', ')}. These readings of that word do not: ${extraData.actual.join(', ')}`;
  } if (reason === 'Not a noun') {
    return 'Not a noun';
  }

  assert(false, 'Unknown rejection reason');
  return '';
}

class Game extends Component {
  constructor(props) {
    super(props);

    this.state = {
      events: [],
      roomClosed: false,
      players: [],
    };

    this.nextEventID = 0;
  }

  componentDidMount() {
    Analytics.setPageView('/shiritori/game');

    this.socket = createSocket(SocketNamespaces.SHIRITORI);

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
      socketEvents.Server.ANSWERED,
      data => this.handleEventBoxEvent(EventBox.EventType.CORRECT_ANSWER_SHIRITORI, data),
    );

    this.socket.on(
      socketEvents.Server.GAME_ENDED,
      data => this.handleGameEnded(data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_JOINED,
      data => this.handleEventBoxEvent(EventBox.EventType.PLAYER_JOINED, data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_ANSWERED,
      data => this.handleEventBoxEvent(EventBox.EventType.CORRECT_ANSWER_SHIRITORI, data),
    );

    this.socket.on(
      socketEvents.Server.ROOM_CLOSED,
      data => this.handleRoomClosed(data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_LIST,
      data => this.handlePlayerListUpdate(data),
    );

    this.socket.on(
      socketEvents.Server.USERNAME_ASSIGNED,
      data => this.handleUsernameAssigned(data),
    );

    this.socket.on(
      socketEvents.Server.WAITING_FOR_ANSWER_FROM_USER,
      data => this.handleWaitingForAnswerFromUser(data),
    );

    this.socket.on(
      socketEvents.Server.ANSWER_REJECTED,
      data => this.handleAnswerRejected(data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_SKIPPED,
      data => this.handleEventBoxEvent(EventBox.EventType.PLAYER_SKIPPED, data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_SET_INACTIVE,
      data => this.handlePlayerSetInactive(data),
    );

    this.socket.on(
      socketEvents.Server.PLAYER_REACTIVATED,
      data => this.handlePlayerReactivated(data),
    );

    Analytics.event(ANALYTICS_CATEGORY, 'Joining');
    this.socket.emit(socketEvents.Client.JOIN_GAME, query);

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

  handleGameEnded = (data) => {
    this.handleEventBoxEvent(EventBox.EventType.GAME_ENDED, data);
    this.setState({ instructions: undefined });
  }

  getNextEventId = () => {
    this.nextEventID += 1;
    return this.nextEventID - 1;
  }

  handlePlayerSetInactive = (username) => {
    this.handleEventBoxEvent(EventBox.EventType.PLAYER_SET_INACTIVE, username);

    const { self } = this.state;
    const isSelf = self && self.username === username;
    if (isSelf) {
      this.setState({
        instructions: (
          <span>
            Currently <span className="text-danger">inactive</span>. Say anything to rejoin the game.
          </span>
        ),
      });
    }
  }

  handlePlayerReactivated = (username) => {
    this.handleEventBoxEvent(EventBox.EventType.PLAYER_REACTIVED, username);

    const { self } = this.state;
    const isSelf = self && self.username === username;
    if (isSelf) {
      this.setState({ instructions: undefined });
    }
  }

  handleWaitingForAnswerFromUser = (data) => {
    const { username, self } = this.state;
    const selfIsCurrentPlayer = data.username === username;

    const startsWith = data.startsWith ? data.startsWith.join(', ') : 'anything';

    if (selfIsCurrentPlayer) {
      this.setState({
        instructions: (
          <span>
            Enter a Japanese word starting with <span className="text-primary">{startsWith}</span>
          </span>
        ),
      });
    } else if (self && self.active) {
      this.setState({ instructions: undefined });
    }
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

  handleAnswerRejected = (rejectionInformation) => {
    this.setState((previousState) => {
      for (let i = previousState.events.length - 1; i >= 0; i -= 1) {
        const event = previousState.events[i];
        const usernameMatches = event.eventData.username === rejectionInformation.username;
        const textMatches = event.eventData.text === rejectionInformation.answer;
        const eventMatches = usernameMatches && textMatches;
        if (eventMatches) {
          event.eventData.error = getErrorTextForRejection(rejectionInformation);
          break;
        }
      }

      return previousState;
    });
  }

  handlePlayerListUpdate = (playersServer) => {
    const players = playersServer.map(player => ({ ...player, hide: !player.present }));
    const { username } = this.state;
    const self = players.find(player => player.username === username);
    this.setState({ players, self });
  }

  handleRoomClosed = () => {
    this.setState({ roomClosed: true });
    this.handleEventBoxEvent(EventBox.EventType.ROOM_CLOSED);
    this.socket.close();
  }

  getUsername = () => queryString.parse(window.location.search).username;

  onSubmit = (answer) => {
    const { roomClosed, self } = this.state;

    if (roomClosed || !self) {
      return;
    }

    Analytics.event(ANALYTICS_CATEGORY, 'Chat or answer', answer);

    this.socket.emit(socketEvents.Client.CHAT, answer);
    this.handleEventBoxEvent(EventBox.EventType.CHAT, {
      username: this.getUsername(),
      text: answer,
      avatar: self.avatar,
    });
  }

  onUsernameSelected = (username) => {
    Analytics.event(ANALYTICS_CATEGORY, 'Selected username', username);
    const gameID = this.getGameID();
    window.location = `/shiritori/game?gameID=${gameID}&username=${username}`;
  }

  handleUsernameAssigned(username) {
    this.setState({ username });
  }

  render() {
    const gameID = this.getGameID();
    const joinLink = `https://${window.location.host}${window.location.pathname}?gameID=${gameID}`;
    const {
      currentQuestionData, events, unansweredQuestions, instructions, players,
    } = this.state;

    return (
      <div>
        <NoSuchGameModal createGameURI="/shiritori/create" />
        <ChooseUsernameModal usernameChosen={this.onUsernameSelected} />
        <RightPanel
          inviteLink={joinLink}
          unansweredQuestions={unansweredQuestions}
          users={players}
        />
        <EventBox events={events} startNewGameLink="/shiritori/create" subclass="shiritoriEventBox" />
        <AnswerArea
          {...currentQuestionData}
          onSubmit={this.onSubmit}
          instructions={instructions}
          canHideInstructions={false}
        />
      </div>
    );
  }
}

export default withRouter(Game);
