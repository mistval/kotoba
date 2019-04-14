import React, { Component } from 'react';
import axios from 'axios';

class LogViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      logText: '',
      errorMessage: '',
    };
  }

  async componentDidMount() {
    try {
      const response = await axios.get(`/api/logs/${this.props.match.params.logIndex}`);
      this.setState({
        logText: response.data.content,
      });
    } catch (err) {
      this.setState({
        errorMessage: err.message,
      });
    }
  }

  render() {
    const logLines = this.state.logText.split('\n').filter(x => x);

    return (
      <main>
        { logLines.map((line, i) => <div key={i} className="mb-4 mt-4">
          {line}
        </div>) }
        <span>{this.state.errorMessage}</span>
      </main>
    );
  }
}

export default LogViewer;
