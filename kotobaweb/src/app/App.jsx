import React from 'react';
import {
  BrowserRouter, Route, Switch, Redirect,
} from 'react-router-dom';
import Nav from '../nav/nav';
import About from '../about/about';
import BotMain from '../bot/bot';
import StrokeOrder from '../strokeorder/strokeorder';
import KanjiGameCreate from '../kanjigame/create';
import KanjiGameRoom from '../kanjigame/game';
import BotQuizManual from '../bot/quiz_manual';
import BotQuizBuilder from '../bot/quiz_builder';
import BotPrivacyPolicy from '../bot/privacy_policy';
import BotTermsOfService from '../bot/tos';
import KanjiGameJoin from '../kanjigame/join';
import Analytics from '../util/analytics';
import ShiritoriGameCreate from '../shiritori/create';
import ShiritoriGameRoom from '../shiritori/game';
import ShiritoriGameJoin from '../shiritori/join';
import { Dashboard } from '../dashboard';
import { ThemeProvider } from '../common/theme_context';

Analytics.init();

function renderNotFound() {
  return <p className="mt-2 ml-2">That page was not found</p>;
}

function render() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div>
          <Nav />
          <Switch>
            <Route exact path="/about" component={About} />
            <Route exact path="/bot" component={BotMain} />
            <Route exact path="/bot/quiz" component={BotQuizManual} />
            <Route exact path="/bot/quizbuilder" component={BotQuizBuilder} />
            <Route exact path="/bot/privacy" component={BotPrivacyPolicy} />
            <Route exact path="/bot/tos" component={BotTermsOfService} />
            <Route exact path="/strokeorder" component={StrokeOrder} />
            <Route exact path="/kanjigame/create" component={KanjiGameCreate} />
            <Route exact path="/kanjigame/game" component={KanjiGameRoom} />
            <Route exact path="/kanjigame/join" component={KanjiGameJoin} />
            <Route exact path="/shiritori/create" component={ShiritoriGameCreate} />
            <Route exact path="/shiritori/game" component={ShiritoriGameRoom} />
            <Route exact path="/shiritori/join" component={ShiritoriGameJoin} />
            <Route path="/dashboard" component={Dashboard} />
            <Route
              exact
              path="/"
              render={() => (
                <Redirect to="/kanjigame/create" />
              )}
            />

            <Route exact path="/quiz.html" component={BotQuizManual} />

            <Route render={renderNotFound} />
          </Switch>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default render;
