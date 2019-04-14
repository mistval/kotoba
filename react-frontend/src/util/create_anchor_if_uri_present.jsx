import React from 'react';

function createAnchorIfUriPresent(text, uri) {
  if (uri) {
    return (
      <a target="_blank" href={uri} rel="noopener noreferrer">{text}</a>
    );
  }

  return (
    <span>{text}</span>
  );
}

export default createAnchorIfUriPresent;
