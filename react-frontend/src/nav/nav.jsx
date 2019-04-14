import React from 'react';
import { NavLink } from 'react-router-dom';

function isInKanjiGame(match, location) {
  return location.pathname.startsWith('/kanjigame');
}

function isInShiritori(match, location) {
  return location.pathname.startsWith('/shiritori');
}

function render() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbar">
        <span className="navbar-toggler-icon" />
      </button>
      <span className="navbar-brand">KotobaWeb</span>
      <div className="collapse navbar-collapse" id="navbar">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item">
            <NavLink activeClassName="active" className="nav-link" isActive={isInKanjiGame} to="/kanjigame/create">Kanji Game</NavLink>
          </li>
          <li className="nav-item">
            <NavLink activeClassName="active" className="nav-link" isActive={isInShiritori} to="/shiritori/create">Shiritori</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link" to="/strokeorder">Stroke Order</NavLink>
          </li>
          <li className="nav-item">
            <NavLink activeClassName="active" className="nav-link" to="/bot">Discord Bot</NavLink>
          </li>
          <li className="nav-item">
            <NavLink activeClassName="active" className="nav-link" to="/dashboard">Dashboard</NavLink>
          </li>
          <li className="nav-item">
            <NavLink exact activeClassName="active" className="nav-link" to="/about">About</NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default render;
