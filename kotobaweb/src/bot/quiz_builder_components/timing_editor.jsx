import React, { Component } from 'react';
import { quizTimeModifierPresets, quizLimits } from 'kotoba-common';
import { createTimeModifierParts } from './util';
import styles from './styles';

function SpeedsList(props) {
  return (
    <div className="list-group">
      {Object.keys(quizTimeModifierPresets).map(presetName => (
        <a
          href="#"
          className={`list-group-item list-group-item-action${presetName === props.selectedPresetName ? ' active' : ''}`}
          onClick={() => props.onPresetSelected(presetName)}
          key={presetName}
        >
          {presetName}
        </a>
      ))}
        <a
          href="#"
          className={`list-group-item list-group-item-action${props.selectedPresetName === 'custom' ? ' active' : ''}`}
          onClick={() => props.onPresetSelected('custom')}
        >
          custom
        </a>
    </div>
  );
}

function isInRange(value, [min, max]) {
  return value >= min && value <= max;
}

class TimingEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.setStateFromProps();
  }

  isValid() {
    return isInRange(this.state.pendingTimeLimit, quizLimits.answerTimeLimit)
      && isInRange(this.state.pendingDelayAfterUnansweredQuestion, quizLimits.delayAfterUnansweredQuestion)
      && isInRange(this.state.pendingDelayAfterAnsweredQuestion, quizLimits.delayAfterAnsweredQuestion)
      && isInRange(this.state.pendingAdditionalAnswerWaitWindow, quizLimits.additionalAnswerWaitWindow);
  }

  setStateFromProps() {
    this.setState({
      pendingTimeLimit: this.props.timing.answerTimeLimit,
      pendingDelayAfterUnansweredQuestion: this.props.timing.delayAfterUnansweredQuestion,
      pendingDelayAfterAnsweredQuestion: this.props.timing.delayAfterAnsweredQuestion,
      pendingAdditionalAnswerWaitWindow: this.props.timing.additionalAnswerWaitWindow,
    });
  }

  handleTimePresetSelected = (presetName) => {
    if (presetName === 'custom') {
      this.setStateFromProps();
      window.$(this.customTimingModal).modal('show');
    } else {
      this.props.onTimingChanged(quizTimeModifierPresets[presetName]);
    }
  }

  handleAnswerTimeLimitChanged = (ev) => {
    this.setState({
      pendingTimeLimit: parseFloat(ev.target.value),
    });

    ev.target.focus();
  }

  handleDelayAfterUnansweredQuestionChanged = (ev) => {
    this.setState({
      pendingDelayAfterUnansweredQuestion: parseFloat(ev.target.value),
    });

    ev.target.focus();
  }

  handleDelayAfterAnsweredQuestionChanged = (ev) => {
    this.setState({
      pendingDelayAfterAnsweredQuestion: parseFloat(ev.target.value),
    });

    ev.target.focus();
  }

  handleAdditionalAnswerWaitWindowChanged = (ev) => {
    this.setState({
      pendingAdditionalAnswerWaitWindow: parseFloat(ev.target.value),
    });

    ev.target.focus();
  }

  handleCommitTiming = () => {
    window.$(this.customTimingModal).modal('hide');
    this.props.onTimingChanged({
      answerTimeLimit: this.state.pendingTimeLimit,
      delayAfterAnsweredQuestion: this.state.pendingDelayAfterAnsweredQuestion,
      delayAfterUnansweredQuestion: this.state.pendingDelayAfterUnansweredQuestion,
      additionalAnswerWaitWindow: this.state.pendingAdditionalAnswerWaitWindow,
    });
  }

  handleInputKeyUp = (ev) => {
    // 13 is Enter
    if (ev.keyCode === 13 && this.isValid()) {
      this.handleCommitTiming();
    }
  }

  render() {
    const timeModifierParts = createTimeModifierParts(this.props.timing);
    const timeModifierPresetName = timeModifierParts[0];

    let selectedTimeModifierPresetName = 'custom';
    if (!timeModifierPresetName) {
      selectedTimeModifierPresetName = 'normal';
    } else if (quizTimeModifierPresets[timeModifierPresetName]) {
      selectedTimeModifierPresetName = timeModifierPresetName;
    }

    return (
      <>
        <div className="modal" tabIndex="-1" role="dialog" id="customTimingModal" ref={(customTimingModal) => { this.customTimingModal = customTimingModal; }}>
          <div className="modal-dialog" style={styles.timingModal} role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Custom Timing</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form>
                <div className="modal-body">
                  <p className="mb-4">Configure custom timing settings.</p>
                  <div class="form-group">
                    Answer time limit (seconds):&nbsp;
                    <input
                      id="answerTimeLimitInput"
                      className="form-control"
                      type="number"
                      step={.1}
                      value={this.state.pendingTimeLimit}
                      onChange={this.handleAnswerTimeLimitChanged}
                      onKeyUp={this.handleInputKeyUp}
                      min={quizLimits.answerTimeLimit[0]}
                      max={quizLimits.answerTimeLimit[1]}
                    />
                  </div>
                  <div class="form-group">
                    Delay after answered question (seconds):&nbsp;
                    <input
                      className="form-control"
                      type="number"
                      step={.1}
                      value={this.state.pendingDelayAfterAnsweredQuestion}
                      onChange={this.handleDelayAfterAnsweredQuestionChanged}
                      onKeyUp={this.handleInputKeyUp}
                      min={quizLimits.delayAfterAnsweredQuestion[0]}
                      max={quizLimits.delayAfterAnsweredQuestion[1]}
                    />
                  </div>
                  <div class="form-group">
                    Delay after <b>un</b>answered question (seconds):&nbsp;
                    <input
                      className="form-control"
                      type="number"
                      step={.1}
                      value={this.state.pendingDelayAfterUnansweredQuestion}
                      onChange={this.handleDelayAfterUnansweredQuestionChanged}
                      onKeyUp={this.handleInputKeyUp}
                      min={quizLimits.delayAfterUnansweredQuestion[0]}
                      max={quizLimits.delayAfterUnansweredQuestion[1]}
                    />
                  </div>
                  <div class="form-group">
                    Additional answer wait window (seconds):&nbsp;
                    <input
                      className="form-control"
                      type="number"
                      step={.1}
                      value={this.state.pendingAdditionalAnswerWaitWindow}
                      onChange={this.handleAdditionalAnswerWaitWindowChanged}
                      onKeyUp={this.handleInputKeyUp}
                      min={quizLimits.additionalAnswerWaitWindow[0]}
                      max={quizLimits.additionalAnswerWaitWindow[1]}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" data-dismiss="modal" onClick={this.handleCommitTiming} disabled={!this.isValid()}>OK</button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="card" style={styles.card}>
          <div className="card-block-title">
            <h5 className="card-title">Pace</h5>
          </div>
          <div className="card-body">
            <SpeedsList
              selectedPresetName={selectedTimeModifierPresetName}
              onPresetSelected={this.handleTimePresetSelected}
            />
          </div>
        </div>
      </>
    )
  }
}

export default TimingEditor;