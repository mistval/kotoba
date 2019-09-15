import React from 'react';
import Header from '../game_common/header';
import '../main.css';
import ShiritoriImage from '../img/shiritori.png';
import './header.css';

function render(props) {
  return (
    <Header
      image={ShiritoriImage}
      imageId="shiritoriHeaderImage"
      title="Shiritori"
      description="Play shiritori with your friends or with bots. Use the final sound of the previous word to start a new word."
    />
  );
}

export default render;
