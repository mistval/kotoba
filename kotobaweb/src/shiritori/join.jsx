import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import socketEvents from '../common/shiritori/socket_events';
import TabBar from '../controls/tabbar';
import 'bootstrap-material-design-icons/css/material-icons.css';
import Analytics from '../util/analytics';
import tabs from './tabs';
import Header from './header';
import SocketNamespaces from '../common/socket_namespaces';
import createSocket from '../util/create_socket';

const cardBodyStyles = {
  height: '400px',
};

const refreshIconStyles = {
  position: 'absolute',
  top: '8px',
  right: '8px',
};

const containerStyles = {
  maxWidth: '1500px',
};

class Create extends Component {
  constructor(props) {
    super(props);

    this.state = {
      gameInfos: [],
    };
  }

  componentDidMount() {
    this.socket = createSocket(SocketNamespaces.SHIRITORI);

    this.socket.on(socketEvents.Server.GAMES_LIST, (gameInfos) => {
      this.setState({ gameInfos });
    });

    Analytics.setPageView('/shiritori/join');
  }

  componentWillUnmount() {
    this.socket.close();
  }

  render() {
    const { gameInfos } = this.state;

    return (
      <div>
        <div>
          <div className="container-fluid">
            <Header />
          </div>
        </div>
        <div className="container-fluid pt-4" style={containerStyles}>
          <TabBar tabs={tabs} />
          <div className="row">
            <div className="col-sm-12 col-md-8 col-xl-4 center-block">
              <div className="card mt-5">
                <div className="card-block-title">
                  <h5 className="card-title">Public Games</h5>
                  <i className="mdi mdi-refresh mdi-spin mdi-3x" style={refreshIconStyles} />
                </div>
                <div className="card-body" style={cardBodyStyles}>
                  { gameInfos.length < 1
                    && <p>There are currently no public games available to join.</p>}
                  { gameInfos.map((gameInfo) => (
                    <div className="mb-2" key={gameInfo.ID}>
                      <NavLink exact to={`/shiritori/game?gameID=${gameInfo.ID}`}>{`${gameInfo.ownerUsername}'s game `}</NavLink>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Create;
