import React from 'react';
import './bot.css';
import '../main.css';
import commands from './commands';
import Header from './header';
import Analytics from '../util/analytics';

const exampleImages = require.context('./../img/command_example_images/');

function modalIdForExample(example) {
  return `modal-${example.imageName}`;
}

function createModals() {
  return commands.map(
    (command) => command.examples.filter((example) => example.imageName).map((example) => (
      <div className="modal fade" id={modalIdForExample(example)} key={example.key}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="center-block">
              <div className="modal-header">
                <h5 className="modal-title">{example.exampleText}</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="close" />
              </div>
              <div className="modal-body">
                <img src={exampleImages(`./${example.imageName}`).default} alt="command example" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )),
  );
}

function createExamplesJsx(examples) {
  return examples.filter((example) => example.imageName).map((example) => (
    <a href="#" data-toggle="modal" data-target={`#${modalIdForExample(example)}`} className="card-link" key={example.key}>{example.exampleText}</a>
  ));
}

function Commands() {
  return (
    <div className="row">
      { commands.map((command) => (
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-12 pr-3 pb-4" key={command.key}>
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">{command.primaryCommand}</h5>
              {command.shortCommand
                  && (
                    <h6 className="card-subtitle mb-2 text-muted">
                      short:&nbsp;
                      {command.shortCommand}
                    </h6>
                  )}
              <p className="card-text">{command.description}</p>
              {createExamplesJsx(command.examples)}
            </div>
          </div>
        </div>
      )) }
    </div>
  );
}

function render() {
  Analytics.setPageView('/bot/commands');

  return (
    <div className="container-fluid">
      {createModals()}
      <Header />
      <Commands />
    </div>
  );
}

export default render;
