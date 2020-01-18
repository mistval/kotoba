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

  handleBlur = (ev) => {
    let numericValue = parseFloat(ev.target.value);
    let newPendingValue;

    if (numericValue < this.props.minValue) {
      this.props.onChange(this.props.minValue);
      newPendingValue = this.props.minValue.toString();
    } else if (numericValue > this.props.maxValue) {
      this.props.onChange(this.props.maxValue);
      newPendingValue = this.props.maxValue.toString();
    } else {
      newPendingValue = this.props.value.toString();
    }

    this.setState(
      { pendingValue: newPendingValue },
      () => { this.input.value = newPendingValue; }
    );
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
        ref={(input) => { this.input = input; }}
        disabled={this.props.disabled}
      />
    );
  }
}

export default NumericInputBox;