import React, { PureComponent } from 'react';
import { SketchPicker } from 'react-color';
import styles from './styles';
import fontList from './font_list.json';
import NumericInputBox from './../../controls/numeric_input_box';

function getRGBAColor({ rgb }) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
}

class FontEditor extends PureComponent {
  handleTextColorChanged = (textColor) => {
    this.props.onFontSettingsChanged({
      ...this.props.fontSettings,
      color: getRGBAColor(textColor),
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

  createFontExampleStyle() {
    console.log(this.props.fontSettings);
    return {
      ...this.props.fontSettings,
      fontFamily: fontList[this.props.fontSettings.fontFamilyIndex],
    };
  }

  render() {
    return (
      <>
        <div className="card" style={styles.card}>
          <div className="card-block-title">
            <h5 className="card-title d-inline-block">Font Settings</h5>
          </div>
          <div className="card-body d-flex flex-row flex-wrap">
            <div className="mr-5 mb-4">
              <h6 className="text-center">Text Color</h6>
              <SketchPicker color={this.props.fontSettings.color} onChange={this.handleTextColorChanged} />
            </div>
            <div className="mr-5 mb-4">
              <h6 className="text-center">Background Color</h6>
              <SketchPicker color={this.props.fontSettings.backgroundColor} onChange={this.handleBackgroundColorChanged} />
            </div>
            <div className="mb-4 d-flex flex-column justify-content-between" style={{ flex: 1 }}>
              <div className="d-flex flex-row">
                <div>
                  <div className="form-group">
                    <label htmlFor="fontFamilySelect">Font Family</label>
                    <select className="form-control" id="fontFamilySelect" onChange={this.handleFontFamilyChanged} >
                      { fontList.map((f, i) =>
                        <option key={i} selected={i === this.props.fontSettings.fontFamilyIndex ? 'selected' : ''}>{f[0]}</option>
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
                <div className="d-flex justify-content-center" style={{ flex: 1 }}>
                  <span className="px-3" style={this.createFontExampleStyle()}>本</span>
                </div>
              </div>
              <div className="alert alert-info mb-0 mt-2" role="alert">
                The font family in the 本 example will only change if your computer has the font installed. Beware that Discord scales down <b>large</b> images, which can make text look blurry. The default size of 92px occurs no scaling in most fonts for up to 4 characters.
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default FontEditor;