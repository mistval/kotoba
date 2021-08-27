import React, { Component } from 'react';
import axios from 'axios';

class LogList extends Component {
  constructor() {
    super();
    this.state = {
      logFiles: [],
      errorMessage: '',
    };
  }

  async componentDidMount() {
    try {
      const response = await axios.get('/api/logs');
      this.setState({
        logFiles: response.data,
      });
    } catch (err) {
      this.setState({
        errorMessage: err.message,
      });
    }
  }

  render() {
    if (this.state.errorMessage) {
      return <span>{this.state.errorMessage}</span>;
    }

    return (
      <>
        { this.state.logFiles.map((fileName, i) => (
          <div className="ml-2 mt-2">
            <a href={`/admin/logs/${i}`}>{fileName}</a>
          </div>
        )) }
        <span>{this.state.errorMessage}</span>
      </>
    );
  }
}

export default LogList;
