import React, { Component } from 'react';
import PropTypes from 'prop-types';

class AnswerArea extends Component {
  handleSubmit = (ev) => {
    ev.preventDefault();
    ev.target.blur();

    const { onSkip, onSubmit } = this.props;

    const input = this.answerInput.value;
    if (!input) {
      if (onSkip) {
        onSkip();
      }
    } else {
      onSubmit(input);
      this.answerInput.value = '';
    }
  }

  handleSkip = (ev) => {
    ev.preventDefault();
    ev.target.blur();

    const { onSkip } = this.props;

    this.answerInput.value = '';
    onSkip();
  }

  render() {
    const {
      instructions, imageDataUri, onSkip, canHideInstructions,
    } = this.props;

    return (
      <div className="container fixed-bottom">
        <div className="row">
          <div className="col-sm-12">
            <div className="card mb-3" id="answerArea">
              <div className="card-body">
                { instructions && (
                  <h3 className={`card-title${canHideInstructions ? ' d-none d-md-block' : ''}`}>{instructions}</h3>
                ) }
                { imageDataUri && (
                  <div>
                    <img src={imageDataUri} id="questionImage" alt="the question" />
                  </div>
                )}
                <form className="mb-0" onSubmit={this.handleSubmit} autoComplete="off">
                  <div className="container-fluid">
                    <div className="row">
                      <div className="col-lg-9 col-md-8 col-sm-6 col-12 pl-0">
                        <div className="form-group mb-0 mt-0">
                          <label htmlFor="answerInput" className="bmd-label-placeholder">Answer</label>
                          <input className="form-control" id="answerInput" ref={(el) => { this.answerInput = el; }} />
                        </div>
                      </div>
                      <div className="col-lg-3 col-md-4 col-sm-6 col-12 pt-4">
                        <button type="button" className="btn btn-primary active mr-2" onClick={this.handleSubmit}>Send</button>
                        { onSkip && (
                          <button type="button" className="btn btn-primary active" onClick={this.handleSkip}>Skip</button>
                        ) }
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

AnswerArea.propTypes = {
  imageDataUri: PropTypes.string,
  instructions: PropTypes.node,
  onSkip: PropTypes.func,
  onSubmit: PropTypes.func.isRequired,
  canHideInstructions: PropTypes.bool.isRequired,
};

AnswerArea.defaultProps = {
  imageDataUri: '',
  instructions: undefined,
  onSkip: undefined,
};

export default AnswerArea;
