import React, { Component } from 'react';

class NumericInputBox extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pendingValue: props.value.toString(),
    };
  }

  getStep() {
    return 1 / Math.pow(10, this.props.maxPlacesAfterDecimal);
  }

  isValid(value) {
    const indexOfDecimal = value.indexOf('.');
    if (indexOfDecimal === value.length - 1) {
      return false;
    }
  
    const number = parseFloat(value);
    if (Number.isNaN(number)) {
      return false;
    }

    if (number < this.props.minValue || number > this.props.maxValue) {
      return false;
    }

    let placesAfterDecimal;
    if (indexOfDecimal === -1) {
      placesAfterDecimal = 0;
    } else {
      placesAfterDecimal = value.length - indexOfDecimal - 1;
    }
  
    if (placesAfterDecimal > this.props.maxPlacesAfterDecimal) {
      return false;
    }

    return true;
  }

  handleChanged = (ev) => {
    ev.target.focus();

    if (this.isValid(ev.target.value)) {
      this.props.onChange(parseFloat(ev.target.value))
    }

    this.setState({
      pendingValue: ev.target.value,
    });
  }

  handleBlur = () => {
    if (!this.isValid(this.state.pendingValue)) {
      this.setState({ pendingValue: this.props.value.toString() });
    }
  }

  handleInputKeyUp = (ev) => {
    // 13 is Enter
    if (this.props.onEnter && ev.keyCode === 13) {
      this.props.onEnter();
    }
  }

  render() {
    return (
      <input
        type="number"
        className="form-control"
        value={this.state.pendingValue}
        onChange={this.handleChanged}
        onBlur={this.handleBlur}
        min={this.props.minValue}
        max={this.props.maxValue}
        step={this.getStep()}
        onKeyUp={this.handleInputKeyUp}
      />
    );
  }
}

export default NumericInputBox;