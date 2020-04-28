import React, { PureComponent } from 'react';
import { SketchPicker } from 'react-color';
import styles from './styles';
import fontList from './font_list.json';
import NumericInputBox from './../../controls/numeric_input_box';

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

  handleFontSizeChanged = (fontSize) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      fontSize,
    });
  }

  hasNonDefaultColor() {
    return this.props.fontSettings.backgroundColor !== '#ffffff' || this.props.fontSettings.textColor !== '#000000';
  }

  getCardTitleBlockStyle() {
    return this.hasNonDefaultColor()
      ? { backgroundColor: this.props.fontSettings.backgroundColor }
      : {};
  }

  getCardTitleTextStyle() {
    return this.hasNonDefaultColor()
      ? { color: this.props.fontSettings.textColor }
      : {};
  }

  render() {
    return (
      <div className="card" style={styles.card}>
        <div className="card-block-title" style={this.getCardTitleBlockStyle()}>
          <h5 className="card-title d-inline-block" style={this.getCardTitleTextStyle()}>Font settings</h5>
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