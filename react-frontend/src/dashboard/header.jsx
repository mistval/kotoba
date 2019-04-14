import React, { Component } from 'react';
import axios from 'axios';
import defaultAvatar from '../img/discord_default_avatar.png';
import DiscordLoginButton from '../controls/discord_login_button';

class DashboardHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      apiErrored: false,
      apiSuccess: false,
      username: localStorage.getItem('username'),
      avatarUri: localStorage.getItem('avatarUri'),
      apiErrorMessage: '',
    };
  }

  async getUser() {
    try {
      const res = await axios.get('/api/users/me');
      const { discordUser } = res.data;

      const { username } = discordUser;
      const avatarUri = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}` : defaultAvatar;

      localStorage.setItem('username', username);
      localStorage.setItem('avatarUri', avatarUri);

      this.setState({
        apiErrored: false,
        apiErrorMessage: '',
        apiSuccess: true,
        username,
        avatarUri,
      });

      if (this.props.onLoginSuccess) {
        this.props.onLoginSuccess();
      }
    } catch (err) {
      if (err.response.status === 401) {
        return this.setState({
          username: '',
          avatarUri: '',
          apiSuccess: true,
        });
      }

      this.setState({
        apiErrored: true,
        apiErrorMessage: err.message,
      });

      this.retryTimer = setTimeout(() => this.getUser(), 10000);
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
        <header className="d-flex flex-column align-items-center mt-5">
          <p>Discord users can login via Discord to manage Kotoba bot. Support for website users is planned.</p>
          <DiscordLoginButton />
          <div className="alert alert-danger mt-3" role="alert">
            <strong>Oh snap!</strong> There was a problem communicating with the login server. Retrying. Error: {this.state.apiErrorMessage}
          </div>
        </header>
      )
    }

    if (this.state.username) {
      return (
        <header className="w-100 bg-light d-flex justify-content-center">
          <img src={this.state.avatarUri} className="my-5" />
          <div className="d-flex flex-column justify-content-center ml-4">
            <h2>{this.state.username}</h2>
            <a href="/api/logout">Logout</a>
          </div>
        </header>
      );
    }

    return (
      <header className="d-flex flex-column align-items-center mt-5">
        <p>Discord users can login via Discord to manage Kotoba bot. Support for website users is planned.</p>
        <DiscordLoginButton />
      </header>
    );
  }
}

export default DashboardHeader;
