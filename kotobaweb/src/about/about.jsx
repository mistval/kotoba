// These rules, if followed, hurt readability.
/* eslint react/jsx-one-expression-per-line: 0 */

import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import Analytics from '../util/analytics';

class About extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      message: '',
      sending: false,
    };
  }

  componentDidMount() {
    Analytics.setPageView('/about');
  }

  onFormValueChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  onSubmitForm = async (e) => {
    e.preventDefault();
    this.setState({ sending: true });

    try {
      const response = await axios.post('/api/contact', this.state);
      const { success, email } = response.data;
      if (!success) {
        this.setState({
          errorMessage: `There was an error sending your message. You can contact me by email at ${email}`,
          successMessage: '',
        });
      } else {
        this.setState({
          successMessage: 'I have received your message and will read it soon.',
          errorMessage: '',
        });

        this.messageField.value = '';
        this.emailField.value = '';
      }
    } catch (err) {
      this.setState({
        errorMessage: 'An unknown error occurred while sending your message.',
        successMessage: '',
      });
    }

    this.setState({ sending: false });
  }

  render() {
    const { sending, successMessage, errorMessage } = this.state;

    return (
      <div className="container pt-5">
        <div className="row">
          <div className="col-lg-7 mb-5">
            <p>
              KotobaWeb is an extension of work I&#39;ve done for&nbsp;
              <NavLink exact activeClassName="active" to="/bot">my Discord Bot</NavLink>
              . In addition to the features here on the website, the bot has SRS,
              saving/loading, leaderboards, more question categories, plus other
              Japanese-related functions including dictionary searching, kanji
              searching, furigana rendering, and more.
            </p>
            <p>
              If you have feedback or ideas, please let me know using the contact form.
              The code for the website is&nbsp;
              <a href="https://github.com/mistval/kotobaweb">
                open source
              </a>
              &nbsp;and contributions are welcome.
            </p>
            <p>
              This site is built using <a href="https://reactjs.org/">React.js</a>,&nbsp;
              <a href="https://fezvrasta.github.io/bootstrap-material-design/">Bootstrap Material Design</a>,
              and <a href="http://expressjs.com/">Express.js</a>.
            </p>
            <p>
              The game data comes from various sources including <a href="https://jisho.org/">Jisho</a>,&nbsp;
              <a href="http://www.edrdg.org/wiki/index.php/KANJIDIC_Project">KANJIDIC</a>, and Patrick Roos&#39;s&nbsp;
              <a href="https://github.com/darkgray1981/kanjiquizbot">kanjiquizbot</a>.
            </p>
            <p>
              The kanji stroke order graphics were generated using <a href="https://github.com/maurimo/kanimaji">Kanimaji</a>&nbsp;
              and <a href="https://kanjivg.tagaini.net/">KanjiVG</a>.
            </p>
            <p>The favicon comes from <a href="https://icons8.com/">Icons8</a>.</p>
          </div>
          <div className="col-lg-5">
            <div className="card mb-3">
              <div className="card-body">
                <form onSubmit={this.onSubmitForm}>
                  <h1 className="card-title mt-3">Contact</h1>
                  { errorMessage && (
                    <div className="alert alert-danger">
                      { errorMessage }
                    </div>
                  )}
                  { successMessage && (
                    <div className="alert alert-success">
                      { successMessage }
                    </div>
                  )}
                  <div className="form-group">
                    <label className="bmd-label-floating" id="emailLabel" htmlFor="emailaddress">Email address</label>
                    <input onChange={this.onFormValueChange} name="email" type="email" className="form-control" id="emailaddress" ref={(el) => { this.emailField = el; }} required />
                  </div>
                  <div className="form-group">
                    <label className="bmd-label-floating" htmlFor="message" id="messageLabel">Message</label>
                    <textarea onChange={this.onFormValueChange} name="message" minLength="10" className="form-control" id="message" rows="5" ref={(el) => { this.messageField = el; }} required />
                  </div>
                  <button type="submit" className="btn btn-primary active" disabled={sending}>Submit</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
