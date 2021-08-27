import React from 'react';
import Header from '../game_common/header';
import '../main.css';
import KanjiImage from '../img/kanji.png';
import './header.css';

function render() {
  return (
    <Header
      image={KanjiImage}
      imageId="kanjiHeaderImage"
      title="Kanji Readings"
      description="Practice Japanese character readings on your own or with friends."
    />
  );
}

export default render;
