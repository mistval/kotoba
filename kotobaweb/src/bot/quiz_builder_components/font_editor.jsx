import React, { PureComponent } from 'react';
import { SketchPicker } from 'react-color';
import styles from './styles';

class FontEditor extends PureComponent {
  handleTextColorChanged = (textColor) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      textColor: textColor.hex,
    });
  }

  handleBackgroundColorChanged = (backgroundColor) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      backgroundColor: backgroundColor.hex,
    });
  }

  render() {
    return (
      <div className="card" style={styles.card}>
        <div className="card-block-title">
          <h5 className="card-title d-inline-block">Font settings</h5>
        </div>
        <div className="card-body d-flex flex-row">
          <div className="mr-5">
            <h6 class="text-center">Text Color</h6>
            <SketchPicker color={this.props.fontSettings.textColor} onChange={this.handleTextColorChanged} />
          </div>
          <div>
            <h6 class="text-center">Background Color</h6>
            <SketchPicker color={this.props.fontSettings.backgroundColor} onChange={this.handleBackgroundColorChanged} />
          </div>
        </div>
      </div>
    );
  }
}

export default FontEditor;