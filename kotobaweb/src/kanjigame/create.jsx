import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';
import './create.css';
import {
  Formik, Form, Field, ErrorMessage,
} from 'formik';
import * as Yup from 'yup';
import decks from './decks';
import usernames from '../util/usernames';
import ListPicker from '../controls/list_picker';
import socketEvents from '../common/kanji_game/socket_events';
import Slider from '../controls/slider';
import '../main.css';
import TabBar from '../controls/tabbar';
import Analytics from '../util/analytics';
import tabs from './tabs';
import Header from './header';
import SocketNamespaces from '../common/socket_namespaces';
import createSocket from '../util/create_socket';

const listPickerItems = decks.map((deckInformation) => ({
  key: deckInformation.shortName,
  value: deckInformation.longName,
}));

const defaultUsername = usernames[Math.floor(Math.random() * usernames.length)];

const formSchema = Yup.object().shape({
  answerTimeLimit: Yup.number()
    .min(5, 'Answer time limit must be between 5 and 120 seconds')
    .max(120, 'Answer time limit must be between 5 and 120 seconds')
    .required('Answer time limit is required'),
  answerLeeway: Yup.number()
    .min(0, 'Answer leeway must be between 0 and 1000 ms')
    .max(10000, 'Answer leeway must be between 0 and 10000 ms')
    .required('Answer leeway is required'),
  username: Yup.string()
    .min(1, 'Username must be between 1 and 20 characters long')
    .max(20, 'Username must be between 1 and 20 characters long')
    .required('Username is required'),
  decks: Yup.array()
    .min(1, 'You must choose at least one category'),
});

function formatSeconds(unformatted) {
  return `${unformatted} seconds`;
}

function formatMilliseconds(unformatted) {
  return `${unformatted} milliseconds`;
}

function RenderForm({ formikArgs }) {
  return (
    <Form>
      <div className="row mt-5">
        <div className="col-lg-4 mb-5">
          <div className="card">
            <div className="card-block-title">
              <h5 className="card-title">Select Categories</h5>
            </div>
            <div className="card-body">
              <ListPicker
                name="decks"
                maxHeight="350px"
                items={listPickerItems}
                selectedItems={formikArgs.values.decks}
                selectionUpdated={(newValue) => { formikArgs.setFieldValue('decks', newValue); }}
              />
            </div>
          </div>
          { formikArgs.errors.decks
            && (
            <div className="alert alert-warning mt-3" role="alert">
              {formikArgs.errors.decks}
            </div>
            )}
        </div>
        <div className="col-lg-4 mb-5">
          <div className="card">
            <div className="card-block-title">
              <h5 className="card-title">Configuration</h5>
            </div>
            <div className="card-body">
              <div className="form-group">
                <Slider
                  name="answerTimeLimit"
                  title="Answer time limit"
                  min="5"
                  max="100"
                  defaultValue="30"
                  format={formatSeconds}
                  onChange={(newValue) => formikArgs.setFieldValue('answerTimeLimit', newValue)}
                />
              </div>
              <div className="form-group mt-5">
                <Slider
                  name="answerLeeway"
                  title="Answer leeway"
                  min="0"
                  max="10000"
                  defaultValue="0"
                  format={formatMilliseconds}
                  onChange={(newValue) => formikArgs.setFieldValue('answerLeeway', newValue)}
                />
              </div>
              <div className="checkbox mt-5">
                <label>
                  <Field type="checkbox" name="privateGame" />
                  {' '}
                  <span className="label-darker">Private game</span>
                </label>
              </div>
            </div>
          </div>
          <ErrorMessage className="alert alert-warning mt-3" name="answerTimeLimit" component="div" />
          <ErrorMessage className="alert alert-warning mt-3" name="answerLeeway" component="div" />
        </div>
        <div className="col-lg-4">
          <div className="card">
            <div className="card-block-title">
              <h5 className="card-title">User</h5>
            </div>
            <div className="card-body">
              <label className="label-darker"><b>Username</b></label>
              <Field className="form-control mt-2" name="username" />
              <button
                type="submit"
                className="btn btn-raised btn-primary mt-3"
                disabled={formikArgs.isSubmitting || Object.keys(formikArgs.errors)[0]}
              >
                Start game
              </button>
            </div>
          </div>
          <ErrorMessage className="alert alert-warning mt-3" name="username" component="div" />
        </div>
      </div>
    </Form>
  );
}

class Create extends PureComponent {
  componentWillUnmount() {
    this.socket.close();
  }

  componentDidMount() {
    this.socket = createSocket(SocketNamespaces.KANJI_GAME);
    Analytics.setPageView('/kanjigame/create');
  }

  submitCreate = (values) => {
    const gameConfig = {
      decks: values.decks.map((deck) => deck.key),
      answerTimeLimitInMs: values.answerTimeLimit * 1000,
      answerForgivenessWindow: values.answerLeeway,
      private: values.privateGame,
    };

    const { history } = this.props;

    this.socket.on(socketEvents.Server.CREATED_GAME, (response) => {
      history.push(`/kanjigame/game?username=${encodeURIComponent(values.username)}&gameID=${response}`);
    });

    this.socket.emit(socketEvents.Client.CREATE_GAME, gameConfig);
  }

  render() {
    return (
      <div>
        <div className="container-fluid">
          <Header />
        </div>
        <div className="container-fluid mt-4" id="createKanjiGameContainer">
          <TabBar tabs={tabs} />
          <Formik
            initialValues={{
              answerTimeLimit: 30,
              answerLeeway: 0,
              username: defaultUsername,
              decks: [],
              privateGame: false,
            }}
            validationSchema={formSchema}
            onSubmit={this.submitCreate}
          >
            {(formikArgs) => (
              <RenderForm formikArgs={formikArgs} />
            )}
          </Formik>
        </div>
      </div>
    );
  }
}

export default withRouter(Create);
