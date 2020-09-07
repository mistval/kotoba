import React, { PureComponent } from 'react';

class HelpButton extends PureComponent {
  componentDidMount() {
    window.$(`#${this.props.popoverId}`).popover({ html: true });
  }

  handleHelpButtonBlur = () => {
    window.$(`#${this.props.popoverId}`).popover('hide');
  }

  handleClick = (e) => {
    e.preventDefault();
  }

  render() {
    return (
      <a
        href="#"
        id={this.props.popoverId}
        data-title={this.props.popoverTitle}
        data-container="body"
        data-toggle="popover"
        data-placement="top"
        data-content={this.props.popoverContent}
        onBlur={this.handleHelpButtonBlur}
        onClick={this.handleClick}
      >
        <i className="material-icons">help</i>
      </a>
    );
  }
}

export default HelpButton;