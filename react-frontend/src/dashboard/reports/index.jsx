import React, { Component } from 'react';
import axios from 'axios';

class ReportView extends Component {
  constructor() {
    super();
    this.state = {
      report: undefined,
      showStripeMessage: false,
      stripeMessage: '',
      stripeMessageIsError: false,
    };
  }

  async loadReport() {
    const reportId = this.props.match.params.id;

    try {
      const report = (await axios.get(`/api/game_reports/${reportId}`)).data;
      this.setState({ report });
    } catch (err) {
      let errorMessage;
      if (err.response.status === 404) {
        errorMessage = 'Report not found. Check that your link is valid.';
      } else {
        errorMessage = err.message;
      }

      this.setState({
        showStripeMessage: true,
        stripeMessage: errorMessage,
        stripeMessageIsError: true,
      });
    }
  }

  componentDidMount() {
    this.loadReport();
  }

  render() {
    if (!this.state.report) {
      return null;
    }

    return (
      <main>
        <div className="d-flex justify-content-center">
          <h1>{this.state.report.sessionName}</h1>
        </div>
      </main>
    );
  }
}

export default ReportView;
