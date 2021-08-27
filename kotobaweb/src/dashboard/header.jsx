import React, { Component } from 'react';
import axios from 'axios';
import defaultAvatar from '../img/discord_default_avatar.png';
import DiscordLoginButton from '../controls/discord_login_button';

class DashboardHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      apiErrored: false,
      username: localStorage.getItem('username'),
      avatarUri: localStorage.getItem('avatarUri'),
      apiErrorMessage: '',
    };
  }

  async getUser() {
    try {
      const res = await axios.get('/api/users/me');
      const user = res.data;
      const { discordUser } = user;

      const { username } = discordUser;
      const avatarUri = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}` : defaultAvatar;
      const { canCreateDecks } = user;

      localStorage.setItem('username', username);
      localStorage.setItem('avatarUri', avatarUri);
      localStorage.setItem('canCreateDecks', canCreateDecks);

      this.setState({
        apiErrored: false,
        apiErrorMessage: '',
        username,
        avatarUri,
      });

      if (this.props.onLoginSuccess) {
        this.props.onLoginSuccess();
      }
    } catch (err) {
      if (err.response.status === 401) {
        this.setState({
          username: '',
          avatarUri: '',
        });
      } else {
        this.setState({
          apiErrored: true,
          apiErrorMessage: err.message,
        });

        this.retryTimer = setTimeout(() => this.getUser(), 10000);
      }
    }
  }

  componentWillUnmount() {
    clearTimeout(this.retryTimer);
  }

  async componentDidMount() {
    this.getUser();
  }

  render() {
    if (this.state.apiErrored) {
      return (
        <header className="d-flex bg-light flex-column align-items-center py-5">
          <p>Discord users can login via Discord to manage Kotoba bot.</p>
          <DiscordLoginButton />
          <div className="alert alert-danger mt-3" role="alert">
            <strong>Oh snap!</strong>
            {' '}
            There was a problem communicating with the login server. Retrying. Error:
            {this.state.apiErrorMessage}
          </div>
        </header>
      );
    }

    if (this.state.username) {
      if (this.props.mini) {
        return (
          <header className="w-100 d-flex justify-content-end">
            <div className="m-3">
              <img src={this.state.avatarUri} className="rounded-circle mr-2" width="32" height="32" alt="user avatar" />
              <a href="/api/logout">Logout</a>
            </div>
          </header>
        );
      }

      return (
        <header className="w-100 bg-light d-flex justify-content-center">
          <img src={this.state.avatarUri} className="my-5 rounded-circle" alt="user avatar" />
          <div className="d-flex flex-column justify-content-center ml-4">
            <h2>{this.state.username}</h2>
            <a href="/api/logout">Logout</a>
          </div>
        </header>
      );
    }

    return (
      <header className="d-flex bg-light flex-column align-items-center py-5">
        <p>Discord users can login via Discord to manage Kotoba bot.</p>
        <DiscordLoginButton />
      </header>
    );
  }
}

export default DashboardHeader;
