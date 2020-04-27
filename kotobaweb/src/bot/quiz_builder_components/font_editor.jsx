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

  handleFontFamilyChanged = (ev) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      fontFamilyIndex: ev.target.selectedIndex,
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
            <h6 className="text-center">Text Color</h6>
            <SketchPicker color={this.props.fontSettings.textColor} onChange={this.handleTextColorChanged} />
          </div>
          <div className="mr-5">
            <h6 className="text-center">Background Color</h6>
            <SketchPicker color={this.props.fontSettings.backgroundColor} onChange={this.handleBackgroundColorChanged} />
          </div>
          <div>
            <div className="form-group">
              <label htmlFor="exampleFormControlSelect1">Font Family</label>
              <select className="form-control" id="exampleFormControlSelect1" onChange={this.handleFontFamilyChanged} >
                <option>1ggggggggggggggggggggggggggggggggggggggggggggg</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default FontEditor;