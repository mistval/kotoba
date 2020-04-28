import React, { PureComponent } from 'react';
import { SketchPicker } from 'react-color';
import styles from './styles';
import fontList from './font_list.json';
import NumericInputBox from './../../controls/numeric_input_box';
import DefaultColors from './../default_text_colors';

function getRGBAColor({ rgb }) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
}

class FontEditor extends PureComponent {
  handleTextColorChanged = (textColor) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      textColor: getRGBAColor(textColor),
    });
  }

  handleBackgroundColorChanged = (backgroundColor) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      backgroundColor: getRGBAColor(backgroundColor),
    });
  }

  handleFontFamilyChanged = (ev) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      fontFamilyIndex: ev.target.selectedIndex,
    });
  }

  handleFontSizeChanged = (fontSize) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      fontSize,
    });
  }

  render() {
    return (
      <div className="card" style={styles.card}>
        <div className="card-block-title" style={{ backgroundColor: this.props.fontSettings.backgroundColor }}>
          <h5 className="card-title d-inline-block" style={{ color: this.props.fontSettings.textColor }}>Font Settings</h5>
        </div>
        <div className="card-body d-flex flex-row flex-wrap">
          <div className="mr-5 mb-4">
            <h6 className="text-center">Text Color</h6>
            <SketchPicker color={this.props.fontSettings.textColor} onChange={this.handleTextColorChanged} />
          </div>
          <div className="mr-5 mb-4">
            <h6 className="text-center">Background Color</h6>
            <SketchPicker color={this.props.fontSettings.backgroundColor} onChange={this.handleBackgroundColorChanged} />
          </div>
          <div className="mb-4">
            <div className="form-group">
              <label htmlFor="fontFamilySelect">Font Family</label>
              <select className="form-control" id="fontFamilySelect" onChange={this.handleFontFamilyChanged} >
                { fontList.map((f, i) => 
                  <option key={i} selected={i === this.props.fontSettings.fontFamilyIndex ? 'selected' : ''}>{f}</option>
                ) }
              </select>
            </div>
            <label>Font Size</label>
            <NumericInputBox
              value={this.props.fontSettings.fontSize}
              minValue={20}
              maxValue={200}
              onChange={this.handleFontSizeChanged}
              maxPlacesAfterDecimal={0}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default FontEditor;