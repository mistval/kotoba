import React from 'react';
import { quizLimits } from 'kotoba-common';
import styles from './styles';

function OtherSettingsEditor(props) {
  function handleScoreLimitChanged(ev) {
    let newLimit = parseInt(ev.target.value);
    newLimit = Math.max(newLimit, quizLimits.scoreLimit[0]);
    newLimit = Math.min(newLimit, quizLimits.scoreLimit[1]);

    props.onOtherSettingsChanged({
      ...props.otherSettings,
      scoreLimit: newLimit,
    });

    ev.target.focus();
  }

  function handleConquestModeChanged(ev) {
    props.onOtherSettingsChanged({
      ...props.otherSettings,
      conquest: ev.target.checked,
    });
  }

  function handleHardcoreModeChanged(ev) {
    props.onOtherSettingsChanged({
      ...props.otherSettings,
      hardcore: ev.target.checked,
    });
  }

  function handleNoRaceModeChanged(ev) {
    props.onOtherSettingsChanged({
      ...props.otherSettings,
      norace: ev.target.checked,
    });
  }

  return (
    <div className="card" style={styles.card}>
      <div className="card-block-title">
        <h5 className="card-title d-inline-block">Other</h5>
      </div>
      <div className="card-body">
        Score limit:&nbsp;
        <input
          type="number"
          className="form-control"
          value={props.otherSettings.scoreLimit}
          onChange={handleScoreLimitChanged}
          min={quizLimits.scoreLimit[0]}
          max={quizLimits.scoreLimit[1]}
        />
        <div className="checkbox mt-3">
          <label>
            <input type="checkbox" checked={props.otherSettings.conquest} onChange={handleConquestModeChanged} />&nbsp;<span style={styles.formText}>Conquest mode</span>
          </label>
        </div>
        <div className="checkbox mt-2">
          <label>
            <input type="checkbox" checked={props.otherSettings.hardcore} onChange={handleHardcoreModeChanged} />&nbsp;<span style={styles.formText}>Hardcore mode</span>
          </label>
        </div>
        <div className="checkbox mt-2">
          <label>
            <input type="checkbox" checked={props.otherSettings.norace} onChange={handleNoRaceModeChanged} />&nbsp;<span style={styles.formText}>No race mode</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default OtherSettingsEditor;