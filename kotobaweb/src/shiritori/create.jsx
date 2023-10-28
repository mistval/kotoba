import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';
import './create.css';
import usernames from '../util/usernames';
import socketEvents from '../common/shiritori/socket_events';
import Slider from '../controls/slider';
import '../main.css';
import TabBar from '../controls/tabbar';
import Analytics from '../util/analytics';
import tabs from './tabs';
import Header from './header';
import SocketNamespaces from '../common/socket_namespaces';
import createSocket from '../util/create_socket';

const DEFAULT_USERNAME = usernames[Math.floor(Math.random() * usernames.length)];
const DEFAULT_TIMEOUT_S = 60;
const DEFAULT_BOT_PLAYER_SCORE_MULTIPLIER_DISCRETE = 50;
const DEFAULT_NUM_BOT_PLAYERS = 1;

function formatSeconds(unformatted) {
  return `${unformatted} seconds`;
}

function formatWithDecimal(unformatted) {
  if (unformatted === 100) {
    return unformatted;
  }

  return `.${unformatted}`;
}

class Create extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      timeoutMs: DEFAULT_TIMEOUT_S * 1000,
      botPlayers: 1,
      botScoreMultiplier: DEFAULT_BOT_PLAYER_SCORE_MULTIPLIER_DISCRETE / 100,
      private: false,
      username: DEFAULT_USERNAME,
      laxLongVowels: false,
      smallLetters: true,
      laxDakuten: false,
    };
  }

  componentDidMount() {
    this.socket = createSocket(SocketNamespaces.SHIRITORI);
    Analytics.setPageView('/shiritori/create');
  }

  componentWillUnmount() {
    this.socket.close();
  }

  onSubmit = (ev) => {
    ev.preventDefault();
    const { history } = this.props;
    const { username } = this.state;

    this.socket.on(socketEvents.Server.CREATED_GAME, (response) => {
      history.push(`/shiritori/game?username=${encodeURIComponent(username)}&gameID=${response}`);
    });

    this.socket.emit(socketEvents.Client.CREATE_GAME, this.state);
  }

  onCheckboxUpdate = (fieldName, ev) => {
    this.setState({
      [fieldName]: ev.target.checked,
    });
  }

  onUpdateField = (fieldName, value) => {
    this.setState({ [fieldName]: value });
  }

  render() {
    return (
      <div>
        <div className="container-fluid">
          <Header />
        </div>
        <div className="container-fluid pt-4" id="createShiritoriGameContainer">
          <TabBar tabs={tabs} />
          <form onSubmit={this.onSubmit}>
            <div className="row mt-5">
              <div className="col-lg-6 mb-5">
                <div className="card">
                  <div className="card-block-title">
                    <h5 className="card-title">Configuration</h5>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <Slider
                        name="answerTimeLimit"
                        title="Answer time limit"
                        min="5"
                        max="300"
                        defaultValue={`${DEFAULT_TIMEOUT_S}`}
                        format={formatSeconds}
                        onChange={(newValue) => this.onUpdateField('timeoutMs', newValue * 1000)}
                      />
                    </div>
                    <div className="form-group mt-5">
                      <Slider
                        name="botPlayers"
                        title="Bot players"
                        min="0"
                        max="3"
                        defaultValue={`${DEFAULT_NUM_BOT_PLAYERS}`}
                        onChange={(newValue) => this.onUpdateField('botPlayers', newValue)}
                      />
                    </div>
                    <div className="form-group mt-5">
                      <Slider
                        name="botPlayerScoreMultiplier"
                        title="Bot player score multiplier"
                        min="0"
                        max="100"
                        defaultValue={`${DEFAULT_BOT_PLAYER_SCORE_MULTIPLIER_DISCRETE}`}
                        format={formatWithDecimal}
                        onChange={(newValue) => this.onUpdateField('botScoreMultiplier', newValue / 100)}
                      />
                    </div>
                    <div
                      className="checkbox mt-5"
                      title="If true, after words ending with long vowels, the next word can start with the letter before the long vowel."
                    >
                      <label>
                        <input
                          type="checkbox"
                          name="laxLongVowels"
                          checked={this.state.laxLongVowels}
                          onChange={(ev) => this.onCheckboxUpdate('laxLongVowels', ev)}
                        />
                        {' '}
                        <span className="label-darker">Lax long vowels</span>
                      </label>
                    </div>
                    <div
                      className="checkbox"
                      title="If true, after words ending with small letters, the next word can start with the small letter or the last two letters."
                    >
                      <label>
                        <input
                          type="checkbox"
                          name="smallLetters"
                          checked={this.state.smallLetters}
                          onChange={(ev) => this.onCheckboxUpdate('smallLetters', ev)}
                        />
                        {' '}
                        <span className="label-darker">Small letters</span>
                      </label>
                    </div>
                    <div
                      className="checkbox"
                      title="If true, if the word ends with a character that can be dakuten'd or that can have dakuten removed, the next word can start with any of the variants."
                    >
                      <label>
                        <input
                          type="checkbox"
                          name="laxDakuten"
                          checked={this.state.laxDakuten}
                          onChange={(ev) => this.onCheckboxUpdate('laxDakuten', ev)}
                        />
                        {' '}
                        <span className="label-darker">Lax Dakuten</span>
                      </label>
                    </div>
                    <div className="checkbox">
                      <label>
                        <input
                          type="checkbox"
                          name="privateGame"
                          checked={this.state.private}
                          onChange={(ev) => this.onCheckboxUpdate('private', ev)}
                        />
                        {' '}
                        <span className="label-darker">Private game</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-block-title">
                    <h5 className="card-title">User</h5>
                  </div>
                  <div className="card-body">
                    <label className="label-darker"><b>Username</b></label>
                    <input
                      className="form-control mt-2"
                      name="username"
                      defaultValue={DEFAULT_USERNAME}
                      onChange={(newValue) => this.onUpdateField('username', newValue)}
                      minLength="1"
                      maxLength="20"
                      required
                    />
                    <button type="submit" className="btn btn-raised btn-primary mt-3">
                      Start game
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default withRouter(Create);
