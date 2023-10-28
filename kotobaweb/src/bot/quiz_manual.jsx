import React from 'react';
import './bot.css';
import '../main.css';
import manualSections from './manual_sections';
import Header from './header';
import Analytics from '../util/analytics';

function QuizManual() {
  return (
    <div className="row">
      <div className="col-xl-2 col-lg-3 col-md-3 col-sm-12 pl-5 mb-5">
        { manualSections.map((section) => (
          <p className="toc-item text-muted" key={section.title}>
            <a href={`#${section.title}`}>{ section.title }</a>
          </p>
        )) }
      </div>
      <div className="col-xl-8 col-lg-7 col-md-9 col-sm-12">
        { manualSections.map((section) => {
          const Instructions = section.content;
          return (
            <div className="mb-5" id={section.title} key={section.title}>
              <h3>{ section.title }</h3>
              <Instructions />
            </div>
          );
        }) }
      </div>
    </div>
  );
}

function render() {
  Analytics.setPageView('/bot/quiz');

  return (
    <div className="container-fluid">
      <Header />
      <QuizManual />
    </div>
  );
}

export default render;
