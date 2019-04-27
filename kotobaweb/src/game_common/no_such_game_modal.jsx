import React from 'react';
import PropTypes from 'prop-types';

function NoSuchGameModal(props) {
  const { createGameURI } = props;

  return (
    <div>
      <div className="modal" id="noSuchGameModal" tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">No game found</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>
                There is no game in progress here.
                {' '}
                Please check the join link, and confirm with the inviter
                {' '}
                whether the game is still in progress.
              </p>
            </div>
            <div className="modal-footer">
              <a href={createGameURI} className="btn btn-primary">Create a game</a>
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

NoSuchGameModal.propTypes = {
  createGameURI: PropTypes.string.isRequired,
};

export default NoSuchGameModal;
