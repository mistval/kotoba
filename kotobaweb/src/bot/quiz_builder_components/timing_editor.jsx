import React, { Component } from 'react';
import { quizTimeModifierPresets, quizLimits } from 'kotoba-common';
import { createTimeModifierParts } from './util';
import styles from './styles';
import HelpButton from './help_button';

function SpeedsList(props) {
  return (
    <div className="list-group">
      {Object.keys(quizTimeModifierPresets).map(presetName => (
        <a
          href="#"
          className={`list-group-item list-group-item-action${presetName === props.selectedPresetName ? ' active' : ''}`}
          onClick={(ev) => { ev.preventDefault(); props.onPresetSelected(presetName); }}
          key={presetName}
        >
          {presetName}
        </a>
      ))}
        <a
          href="#"
          className={`list-group-item list-group-item-action${props.selectedPresetName === 'custom' ? ' active' : ''}`}
          onClick={(ev) => { ev.preventDefault(); props.onPresetSelected('custom'); }}
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
    this.state = this.getStateFromProps();
  }

  isValid() {
    return isInRange(this.state.pendingTimeLimit, quizLimits.answerTimeLimit)
      && isInRange(this.state.pendingDelayAfterUnansweredQuestion, quizLimits.delayAfterUnansweredQuestion)
      && isInRange(this.state.pendingDelayAfterAnsweredQuestion, quizLimits.delayAfterAnsweredQuestion)
      && isInRange(this.state.pendingAdditionalAnswerWaitWindow, quizLimits.additionalAnswerWaitWindow);
  }

  getStateFromProps() {
    return {
      pendingTimeLimit: this.props.timing.answerTimeLimit,
      pendingDelayAfterUnansweredQuestion: this.props.timing.delayAfterUnansweredQuestion,
      pendingDelayAfterAnsweredQuestion: this.props.timing.delayAfterAnsweredQuestion,
      pendingAdditionalAnswerWaitWindow: this.props.timing.additionalAnswerWaitWindow,
    };
  }

  setStateFromProps() {
    this.setState(this.getStateFromProps());
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
  }

  handleDelayAfterUnansweredQuestionChanged = (ev) => {
    this.setState({
      pendingDelayAfterUnansweredQuestion: ev.target.value,
    });
  }

  handleDelayAfterAnsweredQuestionChanged = (ev) => {
    this.setState({
      pendingDelayAfterAnsweredQuestion: ev.target.value,
    });
  }

  handleAdditionalAnswerWaitWindowChanged = (ev) => {
    this.setState({
      pendingAdditionalAnswerWaitWindow: parseFloat(ev.target.value),
    });
  }

  handleCommitTiming = (ev) => {
    if (ev) {
      ev.preventDefault();
    }

    window.$(this.customTimingModal).modal('hide');
    this.props.onTimingChanged({
      answerTimeLimit: this.state.pendingTimeLimit,
      delayAfterAnsweredQuestion: this.state.pendingDelayAfterAnsweredQuestion,
      delayAfterUnansweredQuestion: this.state.pendingDelayAfterUnansweredQuestion,
      additionalAnswerWaitWindow: this.state.pendingAdditionalAnswerWaitWindow,
    });
  }

  handleEnter = () => {
    if (this.isValid()) {
      this.handleCommitTiming();
    }
  }

  componentDidUpdate() {
    window.$('#answerTimeLimitPopover').popover();
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
              <form onSubmit={this.handleCommitTiming}>
                <div className="modal-body">
                  <div className="form-group">
                    Answer time limit (seconds)&nbsp;
                    <HelpButton
                      popoverId="timeLimitPopover"
                      popoverContent="After showing a question, I will wait this many seconds for someone to say the correct answer before I say time's up and move onto the next question."
                      popoverTitle="Answer time limit"
                    />
                    <input
                      type="number"
                      className="form-control"
                      value={this.state.pendingTimeLimit}
                      min={quizLimits.answerTimeLimit[0]}
                      max={quizLimits.answerTimeLimit[1]}
                      step={.1}
                      onChange={this.handleAnswerTimeLimitChanged}
                      required
                    />
                  </div>
                  <div className="form-group">
                    Additional answer wait window (seconds):&nbsp;
                    <HelpButton
                      popoverId="additionalAnswerWaitPopover"
                      popoverContent="After one user gives the correct answer, I will wait this many seconds for other users to also give the correct answer before I award points and show the answer."
                      popoverTitle="Additional answer wait window"
                    />
                    <input
                      type="number"
                      className="form-control"
                      value={this.state.pendingAdditionalAnswerWaitWindow}
                      min={quizLimits.additionalAnswerWaitWindow[0]}
                      max={quizLimits.additionalAnswerWaitWindow[1]}
                      step={.1}
                      onChange={this.handleAdditionalAnswerWaitWindowChanged}
                      required
                    />
                  </div>
                  <div className="form-group">
                    Delay after answered question (seconds):&nbsp;
                    <HelpButton
                      popoverId="delayAfterAnsweredPopover"
                      popoverContent="After the Additional Answer Wait Window closes and I show the correct answer, I will wait this many seconds before showing the next question."
                      popoverTitle="Delay after answered question"
                    />
                    <input
                      type="number"
                      className="form-control"
                      value={this.state.pendingDelayAfterAnsweredQuestion}
                      min={quizLimits.delayAfterAnsweredQuestion[0]}
                      max={quizLimits.delayAfterAnsweredQuestion[1]}
                      step={.1}
                      onChange={this.handleDelayAfterAnsweredQuestionChanged}
                      required
                    />
                  </div>
                  <div className="form-group">
                    Delay after <b>un</b>answered question (seconds):&nbsp;
                    <HelpButton
                      popoverId="delayAfterUnansweredPopover"
                      popoverContent="After the the time limit is reached and I show the correct answer, I will wait this many seconds before showing the next question."
                      popoverTitle="Delay after unanswered question"
                    />
                    <input
                      type="number"
                      className="form-control"
                      value={this.state.pendingDelayAfterUnansweredQuestion}
                      min={quizLimits.delayAfterUnansweredQuestion[0]}
                      max={quizLimits.delayAfterUnansweredQuestion[1]}
                      step={.1}
                      onChange={this.handleDelayAfterUnansweredQuestionChanged}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">OK</button>
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