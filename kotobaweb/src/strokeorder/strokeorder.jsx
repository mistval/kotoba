import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './strokeorder.css';
import '../main.css';
import Analytics from '../util/analytics';

function uriForKanji(kanji) {
  const codePointBase16String = kanji.codePointAt(0).toString(16);
  return `https://raw.githubusercontent.com/mistval/kanji_images/master/gifs/${codePointBase16String}.gif`;
}

function TextEntry(props) {
  const handleChange = (event) => {
    props.textChange(event.target.value);
  };

  const { value } = props;

  return (
    <div className="row mt-5">
      <div className="col-12">
        <form>
          <div className="form-group input-group-lg is-focused">
            <label className="bmd-label-floating label-darker" htmlFor="kanjiInput" id="kanjiLabel">Enter Kanji</label>
            <input id="kanjiInput" className="form-control emphasized-form-control" onChange={handleChange} value={value} autoFocus />
          </div>
        </form>
      </div>
    </div>
  );
}

TextEntry.propTypes = {
  value: PropTypes.string.isRequired,
  textChange: PropTypes.func.isRequired,
};

function createKanjiCards(kanjis) {
  const timesShown = {};

  return kanjis.map((kanji) => {
    timesShown[kanji] = timesShown[kanji] || 0;
    timesShown[kanji] += 1;

    const uri = uriForKanji(kanji);
    return (
      <div className="col-xl-2 col-lg-2 col-md-3 col-sm-4 col-6 pr-3 pb-4" key={`${kanji}${timesShown[kanji]}`}>
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">
              <a className="card-title" href={`https://jisho.org/search/${encodeURIComponent(kanji)}%23kanji`} target="_blank" rel="noopener noreferrer">
                {kanji}
              </a>
            </h5>
            { uri
              ? (<img className="card-img-bottom" src={uri} alt="Unknown kanji" />)
              : (<p>Unknown kanji</p>)}
          </div>
        </div>
      </div>
    );
  }).filter((element) => !!element);
}

function KanjiCards(props) {
  const { kanjis } = props;

  return (
    <div className="row mt-5">
      {createKanjiCards(kanjis)}
    </div>
  );
}

KanjiCards.propTypes = {
  kanjis: PropTypes.arrayOf(PropTypes.string).isRequired,
};

class StrokeOrder extends Component {
  constructor(props) {
    super(props);
    this.state = {
      kanjis: ['日', '本', '朝', '感', '陶', '礎'],
    };
  }

  componentDidMount() {
    Analytics.setPageView('/strokeorder');
  }

  handleSearchChange = (searchTerm) => {
    const kanjis = searchTerm.split('');
    this.setState({ kanjis });
  }

  render() {
    const { kanjis } = this.state;

    return (
      <div className="container-fluid" id="kanjiContainer">
        <TextEntry value={kanjis.join('')} textChange={this.handleSearchChange} />
        <KanjiCards kanjis={kanjis} />
      </div>
    );
  }
}

export default StrokeOrder;
