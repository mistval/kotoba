import React, { Component } from 'react';
import PropTypes from 'prop-types';

const avatars = require.context('./../img/user_avatars');

class RightPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      slideClass: 'slideIn',
    };
  }

  componentDidMount() {
    if (window.innerWidth < 1800) {
      this.setState({ slideClass: 'slideOut' });
    }
  }

  toggle = () => {
    this.setState((previousState) => {
      const nextSlideClass = previousState.slideClass === 'slideIn' ? 'slideOut' : 'slideIn';
      return { ...previousState, slideClass: nextSlideClass };
    });
  }

  render() {
    const {
      users,
      inviteLink,
      bottomComponent,
    } = this.props;

    const { slideClass } = this.state;

    return (
      <div>
        <div id="rightPanelCloseButtonContainer" onClick={this.toggle} role="button" tabIndex="0">
          <i className="mdi mdi-menu mdi-2x" />
        </div>
        <div className={`bg-light ${slideClass}`} id="rightPanelContainer">
          <div className="m-4">
            <h4>Invite Link</h4>
            <small>{inviteLink}</small>
          </div>
          { users.length > 0 && (
            <div className="m-4 mt-5">
              <h4 className="mb-3">Players</h4>
              { users.filter(user => !user.hide).map((user) => {
                const {
                  score, avatar, username,
                } = user;

                return (
                  <div key={username}>
                    { avatar
                      && <img width="64" height="64" src={avatars(`./${avatar}.png`)} alt="user avatar" /> }
                    <div className="inline-block ml-3">
                      <span>{username}</span>
                      <br />
                      <span>{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          { bottomComponent }
        </div>
      </div>
    );
  }
}

RightPanel.propTypes = {
  inviteLink: PropTypes.string.isRequired,
  users: PropTypes.arrayOf(PropTypes.shape({
    username: PropTypes.string.isRequired,
    avatar: PropTypes.number.isRequired,
    score: PropTypes.number.isRequired,
    active: PropTypes.bool.isRequired,
  })).isRequired,
  bottomComponent: PropTypes.node,
};

RightPanel.defaultProps = {
  bottomComponent: undefined,
};

export default RightPanel;
