import React, { Component } from 'react';
import { quizTimeModifierPresets } from 'kotoba-common';
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

class TimingEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleTimePresetSelected = (presetName) => {
    if (presetName === 'custom') {
      window.$(this.customTimingModal).modal('show');
    } else {
      this.props.onTimingChanged(quizTimeModifierPresets[presetName]);
    }
  }

  handleAnswerTimeLimitChanged = (ev) => {

  }

  handleDelayAfterUnansweredQuestionChanged = (ev) => {

  }

  handleDelayAfterAnsweredQuestionChanged = (ev) => {

  }

  handleAdditionalAnswerWaitWindowChanged = (ev) => {

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
              <div className="modal-body">
                <p className="mb-4">Configure custom timing settings.</p>
                <p>
                  Answer time limit:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.props.timing.answerTimeLimit}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
                <p>
                  Delay after <b>un</b>answered question:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.props.timing.delayAfterUnansweredQuestion}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
                <p>
                  Delay after answered question:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.props.timing.delayAfterAnsweredQuestion}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
                <p>
                  Additional answer wait window:&nbsp;
                  <input
                    type="number"
                    step={.1}
                    value={this.props.timing.additionalAnswerWaitWindow}
                    onChange={this.handleRangeInputChanged}
                    onKeyUp={this.handleRangeChangeInputKeyUp}
                  />
                  &nbsp;Seconds
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" data-dismiss="modal" disabled={false}>OK</button>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={styles.card}>
          <div className="card-block-title">
            <h5 className="card-title">Speed</h5>
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