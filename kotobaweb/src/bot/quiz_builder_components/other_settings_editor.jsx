import React from 'react';
import { quizLimits } from 'kotoba-common';
import styles from './styles';
import HelpButton from './help_button';
import NumericInputBox from '../../controls/numeric_input_box';

function OtherSettingsEditor(props) {
  function handleScoreLimitChanged(newLimit) {
    props.onOtherSettingsChanged({
      ...props.otherSettings,
      scoreLimit: newLimit,
    });
  }

  function handleMaxMissedQuestionsChanged(newSetting) {
    props.onOtherSettingsChanged({
      ...props.otherSettings,
      maxMissedQuestions: newSetting,
    });
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
        <div>
          Score limit:&nbsp;
          <NumericInputBox
            value={props.otherSettings.scoreLimit}
            minValue={quizLimits.scoreLimit[0]}
            maxValue={quizLimits.scoreLimit[1]}
            onChange={handleScoreLimitChanged}
            maxPlacesAfterDecimal={0}
            disabled={props.otherSettings.conquest}
          />
        </div>
        <div className="mt-2">
          Max missed questions (0 means infinite):&nbsp;
          <NumericInputBox
            value={props.otherSettings.maxMissedQuestions}
            minValue={quizLimits.maxMissedQuestions[0]}
            maxValue={quizLimits.maxMissedQuestions[1]}
            onChange={handleMaxMissedQuestionsChanged}
            maxPlacesAfterDecimal={0}
          />
        </div>
        <div className="checkbox mt-3">
          <label>
            <input type="checkbox" checked={props.otherSettings.conquest} onChange={handleConquestModeChanged} />
            <span style={styles.formText}>Conquest mode</span>
&nbsp;
            <HelpButton
              popoverId="conquestModePopover"
              popoverContent="<p>Conquest mode uses a spaced repetition algorithm that puts missed questions back into the deck so that you'll see them again and learn them.</p><p>You can use <b>k!quiz save</b> and <b>k!quiz load</b> to save and load progress. Conquest mode has no score limit and ends when the deck has been conquered.</p>"
              popoverTitle="Conquest Mode"
            />
          </label>
        </div>
        <div className="checkbox mt-2">
          <label>
            <input type="checkbox" checked={props.otherSettings.hardcore} onChange={handleHardcoreModeChanged} />
            <span style={styles.formText}>Hardcore mode</span>
&nbsp;
            <HelpButton
              popoverId="hardcoreModePopover"
              popoverContent="Hardcore mode only gives players one chance to answer each question correctly."
              popoverTitle="Hardcore Mode"
            />
          </label>
        </div>
        <div className="checkbox mt-2">
          <label>
            <input type="checkbox" checked={props.otherSettings.norace} onChange={handleNoRaceModeChanged} />
            <span style={styles.formText}>No race mode</span>
&nbsp;
            <HelpButton
              popoverId="noRaceModePopover"
              popoverContent="<p>In No Race Mode, I will always let the timer run out before moving onto the next question, even if someone answers it correctly. This is good for audio decks or grammar decks when you want to make sure everyone has plenty of time.</p><p>You can still say <b>skip</b> or <b>s</b> to skip to the next question early.</p>"
              popoverTitle="No Race Mode"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default OtherSettingsEditor;
