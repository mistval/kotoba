import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import usernames from '../util/usernames';

const defaultUsername = usernames[Math.floor(Math.random() * usernames.length)];

class ChooseUsernameModal extends PureComponent {
  onSubmit = (ev) => {
    const { usernameChosen } = this.props;
    usernameChosen(this.usernameField.value);
    ev.preventDefault();
  }

  render() {
    return (
      <div>
        <div className="modal" id="chooseUsernameModal" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <form onSubmit={this.onSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Joining Game</h5>
                  <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="usernameField" className="bmd-label-floating">Username</label>
                    <input className="form-control" id="usernameField" defaultValue={defaultUsername} minLength="1" maxLength="20" ref={(el) => { this.usernameField = el; }} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">Join</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ChooseUsernameModal.propTypes = {
  usernameChosen: PropTypes.func.isRequired,
};

export default ChooseUsernameModal;
