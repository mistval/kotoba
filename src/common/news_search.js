'use strict'
const reload = require('require-reload')(require);
const https = require('https');
const API_KEY = reload('./../../api_keys.js').AZURE_NEWS;
const PublicError = reload('monochrome-bot').PublicError;

const API_HOST = 'api.cognitive.microsoft.com';
const API_PATH = '/bing/v7.0/news/search';
const JAPAN_MARKET_CODE = 'ja-jp'
const US_MARKET_CODE = 'en-us';

function isKatakana(char) {
  return char >= '\u30A1' && char <= '\u30FF';
}

function isHiragana(char) {
  return char >= '\u3041' && char <= '\u309F';
}

function isKanji(char) {
  return char >= '\u4E00' && char <= '\u9FAF';
}

function isJapanese(char) {
  return isKanji(char) || isHiragana(char) || isKatakana(char);
}

function getMarketCodeForQuery(q) {
  if (!q) {
    return JAPAN_MARKET_CODE;
  }
  for (let char of q) {
    if (isJapanese(char)) {
      return JAPAN_MARKET_CODE;
    }
  }
  return US_MARKET_CODE;
}

const daysInMonth = [
  0,
  31,
  0,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
];

function getDaysInMonth(month, year) {
  if (month === 2) {
    return year % 4 === 0 ? 29 : 28;
  }
  let days = daysInMonth[month];
  if (!days) {
    throw new Error('Invalid number of days for ' + month + '/' + year);
  }
}


function createNotRespondingError(err) {
  return new PublicError('Sorry, the news source is not responding. Please try again later.', 'Error', err);
}

function convertTimestampFromGMT(timeStamp) {
  timeStamp.substring(0, timeStamp.length - 1); // Remove timezone indicator (always Z for UTC)
  let [datePart, timePart] = timeStamp.split('T');
  let [hour, minute, second] = timePart.split(':').map(str => parseInt(str));
  let [year, month, day] = datePart.split('-').map(str => parseInt(str));

  hour += 9; // Convert UTC to JST.
  if (hour > 23) {
    hour -= 24;
    day += 1;
    if (day > getDaysInMonth(month, year)) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return `${year}年${month}月${day}日${hour}時${minute}分JST`;
}

function parseResponseData(data, q) {
  let articles = data.value.map(article => {
    let image = article.image ? article.image.contentUrl : undefined;
    return {
      name: article.name,
      uri: article.url,
      imageUri: image,
      description: article.description,
      datePublished: convertTimestampFromGMT(article.datePublished),
    };
  });
  return {
    q: q,
    articles: articles,
  }
}

module.exports.search = function(q) {
  // For some reason I can't make this work right with request-promise (it seems to not get the mkt parameter and get a messed up query parameter). So use good ol' https.
  return new Promise((fulfill, reject) => {
    let request_params = {
      method : 'GET',
      hostname : API_HOST,
      path : API_PATH + '?q=' + encodeURIComponent(q) + '&mkt=' + getMarketCodeForQuery(q) + '&originalImg=true',
      headers : {
        'Ocp-Apim-Subscription-Key' : API_KEY,
      }
    };
    let req = https.request(request_params, response => {
      try {
        let body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
          try {
            let bodyJson = JSON.parse(body);
            fulfill(parseResponseData(bodyJson, q));
          } catch (e) {
            reject(createNotRespondingError(e));
          }
        });
        response.on('error', function (e) {
          reject(createNotRespondingError(e));
        });
      } catch (e) {
        reject(createNotRespondingError(e));
      }
    });
    req.end();
  });
};
