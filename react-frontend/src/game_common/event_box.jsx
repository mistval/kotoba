// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import createAnchorIfUriPresent from '../util/create_anchor_if_uri_present';
import { GameEndReason } from '../common/kanji_game/socket_event_enums';
import './game_common.css';

const avatars = require.context('./../img/user_avatars');

const DescriptionForGameEndReason = {
  [GameEndReason.TOO_MANY_UNANSWERED_QUESTIONS]: 'Too many questions went unanswered in a row.',
  [GameEndReason.ERROR]: 'There was an unexpected internal error. It has been logged.',
  [GameEndReason.NO_QUESTIONS_LEFT]: 'No questions left. Impressive!',
};

const EventType = {
  CORRECT_ANSWER_KANJI: 'correct answer kanji',
  CORRECT_ANSWER_SHIRITORI: 'correct answer shiritori',
  NO_ANSWER: 'incorrect answer',
  CHAT: 'chat',
  PLAYER_JOINED: 'player joined',
  PLAYER_LEFT: 'player left',
  GAME_ENDED: 'game ended',
  ROOM_CLOSED: 'room closed',
  PLAYER_SKIPPED: 'player skipped',
  PLAYER_SET_INACTIVE: 'player set inactive',
};

class EventBox extends Component {
  componentDidUpdate() {
    this.eventBoxContainer.scrollTop = this.eventBoxContainer.scrollHeight;
  }

  getEventSpecificJsx(ev) {
    const { eventType, eventData } = ev;

    if (eventType === EventType.CORRECT_ANSWER_KANJI) {
      return (
        <div>
          <i className="material-icons correct-icon">check_circle</i>
          {' '}
          {createAnchorIfUriPresent(eventData.question, eventData.dictionaryLink)}
          {' '}
          (<b>{eventData.answers.join(', ')}</b>)
          <br />
          <span>
            Answerers: <b>{eventData.answerers.join(', ')}</b>
          </span>
          { eventData.meaning && (
            <div>
              <span>
                Meaning: {eventData.meaning}
              </span>
            </div>
          )}
        </div>
      );
    } if (eventType === EventType.NO_ANSWER) {
      return (
        <div>
          <i className="material-icons incorrect-icon">close</i>
          {' '}
          {createAnchorIfUriPresent(eventData.question, eventData.dictionaryLink)}
          {' '}
          (<b>{eventData.answers.join(', ')}</b>)
          { eventData.meaning && (
          <div>
            <span>
              Meaning: {eventData.meaning}
            </span>
          </div>
          )}
        </div>
      );
    } if (eventType === EventType.CHAT) {
      return (
        <div>
          { eventData.avatar
            && <img width="64" height="64" src={avatars(`./${eventData.avatar}.png`)} alt="user avatar" className="align-top" /> }
          <div className="inline-block ml-3">
            <span>{eventData.username}</span>
            <br />
            <span>{eventData.text}</span>
            { eventData.error && (
              <div>
                <span className="text-danger">{eventData.error}</span>
              </div>
            ) }
          </div>
        </div>
      );
    } if (eventType === EventType.PLAYER_JOINED) {
      return (
        <div>
          <span>
            <b>Player Joined</b> {eventData.username}
          </span>
        </div>
      );
    } if (eventType === EventType.PLAYER_SET_INACTIVE) {
      return (
        <div>
          <span>
            <b>Skipping and Setting Player Inactive</b> {eventData}
          </span>
        </div>
      );
    } if (eventType === EventType.PLAYER_REACTIVED) {
      return (
        <div>
          <span>
            <b>Player Reactivated</b> {eventData}
          </span>
        </div>
      );
    } if (eventType === EventType.PLAYER_LEFT) {
      return (
        <div>
          <span>
            <b>Player Left</b> {eventData.username}
          </span>
        </div>
      );
    } if (eventType === EventType.PLAYER_SKIPPED) {
      return (
        <div>
          <span>
            <b>Player Skipped</b> {eventData}
          </span>
        </div>
      );
    } if (eventType === EventType.GAME_ENDED) {
      return (
        <div>
          <span>
            <b>Game Ended</b> {DescriptionForGameEndReason[eventData.reason]}
          </span>
          { eventData.roomCloseDelayMs > 0 && (
            <span>
              {' '}
              You can continue to chat for
              {' '}
              {eventData.roomCloseDelayMs / 60000}
              {' '}
              minutes before the game room closes.
            </span>
          )}
        </div>
      );
    } if (eventType === EventType.ROOM_CLOSED) {
      const { startNewGameLink } = this.props;
      return (
        <div>
          <span>
            <b>Room Closed</b>
            {' '}
            Thanks for playing.
            {' '}
            <NavLink exact activeClassName="active" to={startNewGameLink}>Start a new game</NavLink>
            .
          </span>
        </div>
      );
    } if (eventType === EventType.CORRECT_ANSWER_SHIRITORI) {
      return (
        <div>
          <i className="material-icons correct-icon">check_circle</i>
          {' '}
          {createAnchorIfUriPresent(eventData.word, eventData.uri)}
          {' '}
          (<b>{eventData.reading}</b>)
          <br />
          <div>
            <span>
              Meaning: {eventData.meaning}
              <br />
              Next word starts with: <b>{eventData.nextWordMustStartWith.join(', ')}</b>
            </span>
          </div>
        </div>
      );
    }
    return <div />;
  }

  render() {
    const { events, subclass } = this.props;
    return (
      <div id="eventBox" className={subclass}>
        <div className="container" id="eventBoxContainer" ref={(el) => { this.eventBoxContainer = el; }}>
          { events.map(ev => (
            <div className="row" key={ev.eventID}>
              <div className="col-sm-12">
                {this.getEventSpecificJsx(ev)}
                <hr />
              </div>
            </div>
          )) }
        </div>
      </div>
    );
  }
}

EventBox.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape(
      { eventType: PropTypes.string.isRequired },
    ),
  ).isRequired,
  startNewGameLink: PropTypes.string.isRequired,
  subclass: PropTypes.string.isRequired,
};

EventBox.EventType = EventType;

export default EventBox;
