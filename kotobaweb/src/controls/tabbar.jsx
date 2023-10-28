import { NavLink } from 'react-router-dom';
import React from 'react';
import PropTypes from 'prop-types';
import '../main.css';
import './tabbar.css';

function TabBar(props) {
  const { tabs } = props;

  return (
    <div className="row">
      <div className="col-sm-12">
        <ul className="nav nav-tabs" id="tabbar">
          { tabs.map((tab) => (
            <li className="nav-item" key={`${tab.title}${tab.uri}`}>
              <NavLink exact activeClassName="active" className="nav-link submenu-nav-link" to={tab.uri}>{tab.title}</NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

TabBar.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    uri: PropTypes.string.isRequired,
  })).isRequired,
};

export default TabBar;
