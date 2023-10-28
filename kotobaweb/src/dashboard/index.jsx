import React, { useEffect, useState } from 'react';
import Loader from 'react-loader-spinner';
import { useRouteMatch, Switch, Route } from 'react-router-dom';
import { DashboardHeader } from './header';
import Main from './main';
import CustomDeck from './custom_deck';
import GameReport from './reports';

const LoginState = {
  checking: 1,
  notLoggedIn: 2,
  loggedIn: 4,
  error: 8,
};

function BodyGrid({ children }) {
  return (
    <div className="container">
      <div className="row">
        <div className="col-12 d-flex justify-content-center mt-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [user, setUser] = useState(undefined);
  const [loginState, setLoginState] = useState(LoginState.checking);
  const [loginError, setLoginError] = useState('');

  const match = useRouteMatch();

  useEffect(() => {
    async function login() {
      try {
        const res = await fetch('/api/users/me');

        if (res.ok) {
          setUser(await res.json());
          setLoginState(LoginState.loggedIn);
        } else if (res.status === 401) {
          setLoginState(LoginState.notLoggedIn);
        } else {
          setLoginState(LoginState.error);
          setLoginError(`Error logging in. Error code: ${res.status}. Please try refreshing and if the issue persists please report it.`);
        }
      } catch (err) {
        setLoginState(LoginState.error);
        setLoginError(`Error logging in. Error detail: ${err.message}.`);
      }
    }

    login();
  }, []);

  if (loginState === LoginState.checking) {
    return (
      <BodyGrid>
        <Loader type="ThreeDots" color="#336699" />
      </BodyGrid>
    );
  }

  if (loginState === LoginState.error) {
    return (
      <BodyGrid>
        <div className="alert alert-danger mt-3" role="alert">
          <strong>RIP</strong>
          {' '}
          There was a problem logging in. Details:&nbsp;
          <strong>{loginError}</strong>
        </div>
      </BodyGrid>
    );
  }

  return (
    <>
      <DashboardHeader user={user} />
      <Switch>
        <Route path={`${match.path}/decks/:id`} render={(props) => user && <CustomDeck {...props} user={user} />} />
        <Route path={`${match.path}/game_reports/:id`} render={(props) => <GameReport {...props} user={user} />} />
        <Route path={match.path} render={(props) => user && <Main {...props} user={user} />} />
      </Switch>
    </>
  );
}
