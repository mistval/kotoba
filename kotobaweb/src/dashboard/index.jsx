import React, { Component } from 'react';
import Header from './header';
import Main from './main';
import Analytics from '../util/analytics';

class Dashboard extends Component {
  constructor() {
    super();

    this.state = {
      loggedIn: false,
    };
  }

  onLoginSuccess = () => {
    this.setState({
      loggedIn: true,
    });
  }

  componentDidMount() {
    Analytics.setPageView('/dashboard');
  }

  render() {
    const header = <Header onLoginSuccess={this.onLoginSuccess} />;

    if (!this.state.loggedIn) {
      return header;
    }

    return (
      <>
        {header}
        <Main />
      </>
    );
  }
}

export default Dashboard;
