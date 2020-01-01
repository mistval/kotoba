import React from 'react';
import { NavLink } from 'react-router-dom';

function render() {
  return (
    <div className="row mb-5">
      <div className="col-sm-12">
        <ul className="nav nav-tabs bg-light pl-5">
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot">COMMANDS</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot/quiz">QUIZ MANUAL</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot/quizbuilder">QUIZ BUILDER</NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default render;
