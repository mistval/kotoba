const fs = require('fs');
const path = require('path');

// eslint-disable-next-line import/no-extraneous-dependencies
const csvStringify = require('csv-stringify/lib/sync');
// eslint-disable-next-line import/no-extraneous-dependencies
const { Storage } = require('@google-cloud/storage');

const STORAGE_BUCKET_NAME = 'kotoba_public_quiz_data';
const QUIZ_FILE_DIR = path.join(__dirname, '..', '..', 'resources', 'quiz_data');
const CLOUD_AUTH_KEY_PATH = path.join(__dirname, 'gcloud_key.json');

const storage = new Storage();
const storageBucket = storage.bucket(STORAGE_BUCKET_NAME);

if (!fs.existsSync(CLOUD_AUTH_KEY_PATH)) {
  throw new Error('No Google Cloud authentication key');
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = CLOUD_AUTH_KEY_PATH;

function filterDeck(deckFileName) {
  if (deckFileName.startsWith('anagrams')) {
    return false;
  }

  if (deckFileName.startsWith('esyn')) {
    return false;
  }

  if (deckFileName.startsWith('images')) {
    return false;
  }

  if (deckFileName.startsWith('jsyn')) {
    return false;
  }

  if (deckFileName.startsWith('k_')) {
    return false;
  }

  if (deckFileName === 'places_full.json') {
    return false;
  }

  if (deckFileName === 'ranobe.json') {
    return false;
  }

  return true;
}

function createIndexHtml(csvFileNames) {
  const anchors = csvFileNames.map(csvFileName => `<a href="https://storage.googleapis.com/${STORAGE_BUCKET_NAME}/${csvFileName}">${csvFileName}</a>`);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quiz Deck CSV</title>
      </head>
      <body>
        ${anchors.join('<br />')}
      </body>
    </html>
  `;
}

const quizFileNames = fs.readdirSync(QUIZ_FILE_DIR).filter(filterDeck);
const csvFileNames = quizFileNames.map(qfn => qfn.replace('.json', '.csv'));
const indexHtml = createIndexHtml(csvFileNames);

async function go() {
  for (let i = 0; i < quizFileNames.length; i += 1) {
    const fileName = quizFileNames[i];
    const filePath = path.join(QUIZ_FILE_DIR, fileName);

    // eslint-disable-next-line import/no-dynamic-require,global-require
    const deck = require(filePath);

    const cardsAsRows = deck.cards.filter(c => c).map(card => [
      card.question,
      card.answer.join(', '),
      card.meaning,
    ]);

    cardsAsRows.unshift(['Question', 'Answers', 'Comment', 'Instructions']);

    const csvStr = csvStringify(cardsAsRows, { delimiter: '\t' });
    const csvFileName = fileName.replace('.json', '.tsv');
    const storageFile = storageBucket.file(csvFileName);

    console.log(`Uploading ${csvFileName}`);

    // This needs to happen sequentially or RAM usage will be crazy
    // eslint-disable-next-line no-await-in-loop
    fs.mkdirSync('./output', { recursive: true });
    fs.writeFileSync('./output/' + csvFileName, csvStr);
  }

  const indexFile = storageBucket.file('index.html');
  console.log('Uploading index.html');
  await indexFile.save(indexHtml, { resumable: false, contentType: 'auto' });
}

go()
  .then(() => { console.log('Finished uploading'); })
  .catch((err) => { console.warn(err); });
