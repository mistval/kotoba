const shiritori = require('shiritori');

async function build() {
  return shiritori.build();
}

if (require.main === module) {
  build().then(() => {
    console.log('done');
    process.exit(0);
  }).catch((err) => {
    console.warn(err);
    process.exit(1);
  });
}

module.exports = build;
