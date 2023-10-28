// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */

import React, { Component } from 'react';
import Slider from '@mistval/react-rangeslider';
import PropTypes from 'prop-types';
import '@mistval/react-rangeslider/lib/index.css';
import './slider.css';

class VolumeSlider extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      value: props.defaultValue,
    };
  }

  handleOnChange = (value) => {
    this.setState({
      value,
    });
  }

  handleOnChangeComplete = () => {
    const { onChange } = this.props;
    const { value } = this.state;
    onChange(value);
  }

  render() {
    const {
      name, min, max, format, title,
    } = this.props;

    const { value } = this.state;

    return (
      <div className="form-group">
        <label className="bmd-label-floating label-darker bold" htmlFor={name}>
          <b>{title}</b> - {format(value)}
        </label>
        <Slider
          name={name}
          value={parseInt(value, 10)}
          min={parseInt(min, 10)}
          max={parseInt(max, 10)}
          onChange={this.handleOnChange}
          onChangeComplete={this.handleOnChangeComplete}
          format={format}
          tooltip={false}
        />
      </div>
    );
  }
}

VolumeSlider.propTypes = {
  title: PropTypes.string.isRequired,
  format: PropTypes.func,
  max: PropTypes.string.isRequired,
  min: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  defaultValue: PropTypes.string.isRequired,
};

VolumeSlider.defaultProps = {
  format: (value) => `${value}`,
};

export default VolumeSlider;
