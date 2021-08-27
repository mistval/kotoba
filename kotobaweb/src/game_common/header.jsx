import React from 'react';
import '../main.css';

function render(props) {
  const {
    image, title, description, imageId,
  } = props;

  return (
    <div className="row pt-5 bg-light">
      <div className="col-sm-12">
        <img id={imageId} className="align-top mr-4 mb-4" alt="header" src={image} />
        <div className="inline-block mb-3">
          <h2>{title}</h2>
          <h5>{description}</h5>
        </div>
      </div>
    </div>
  );
}

export default render;
