import React from 'react';
import { NavLink } from 'react-router-dom';
import Avatar from '../img/kotoba_avatar.png';
import '../main.css';

function render() {
  return (
    <div className="row pt-5 mb-5 bg-light">
      <div className="col-sm-12">
        <img className="align-top mr-4 mb-4" alt="bot avatar" id="avatar" src={Avatar} />
        <div className="inline-block">
          <h5 className="mb-2">Kotoba Discord Bot</h5>
          <a href="https://discordbots.org/bot/251239170058616833"><img src="https://discordbots.org/api/widget/status/251239170058616833.svg" alt="Discord Bots" /></a>
          &nbsp;
          <a href="https://discordbots.org/bot/251239170058616833"><img src="https://discordbots.org/api/widget/servers/251239170058616833.svg" alt="Discord Bots" /></a>
          <br />
          <div className="mt-3">
            <a href="https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot&permissions=52288" target="_blank" rel="noopener noreferrer">INVITE</a>
            <a className="ml-4" href="https://github.com/mistval/kotoba" target="_blank" rel="noopener noreferrer">GITHUB</a>
            <a className="ml-4" href="https://discord.gg/S92qCjbNHt" target="_blank" rel="noopener noreferrer">HELP</a>
          </div>
        </div>
        <ul className="nav nav-tabs bg-light mt-5">
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot">COMMANDS</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot/quiz">QUIZ MANUAL</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot/quizbuilder">QUIZ COMMAND BUILDER</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot/privacy">PRIVACY POLICY</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to="/bot/tos">TERMS OF SERVICE</NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default render;
