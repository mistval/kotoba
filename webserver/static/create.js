var vue;

var maxAnswerTimeLimit = 999999999;

var names = ["Acrallef","Apnalled","AprilHomey","Archift","Atediney","Attractive","Boboundraw","Boninget","Buddientbr","BuffMatterExclusive","Buggyreet","Carecore","Certion","Cessorks","Chasemalead","CheeseSra","Churuser","Cleanzant","ComfyConspiracy","Cosinks","CrashStories","CrazyEye","Dailiesba","DarthCeticNight","Divagoon","Dubyaricamf","Dubyarita","Ducatchab","EatsyouIzPhobic","EssenceReporter","Everchicat","Exegycond","ExoticMaxi","Fashionew","Fighteritaz","Fishitly","Fixtudy","Fourianity","Fruitelec","FuzzyQuote","Gemainn","GinoJournal","Goosead","Greateguren","Griffonomed","Handcapod","HaroMajere","Heheadcobb","Himestn","Hunterhead","Incartleze","Inordity","Issuestre","KaiBrace","Konristi","LessPurfect","LightFred","LimeWeirdHello","LouAnime","Lumecher","MaidCheeNaybor","MajorYui","Mantecklena","Masterield","Mixalys","Natucsco","NeoRozMonkey","Nomyoknu","Nuwerclo","Parance","Phobicatic","Piercessor","Primirier","Pruntson","RadiantXglossy","Recomlepa","Rhemadou","Rundping","SandWriting","SchoolAlli","ScoobyVital","Shinginket","Smarthweb","SocialSmarter","StahMrFeature","Sweettems","Swingbigb","Talentedia","Tasoftie","ThehibikiLunatic","ThenornDancer","ThenornKitGorgeous","Trendynetc","TrimbleBee","TrippinTins","Undervera","Uoutschumb","VanderMiracle","Waredusk","Wellbeyer"];

function create() {
  var selector = $('#selectdecks')[0];
  var selectedDecks = [];
  for (var i = 0; i < selector.options.length; ++i) {
    var option = selector.options[i];
    if (option.selected){
      selectedDecks.push(option.value);
    }
  }

  if (selectedDecks.length === 0) {
    this.errorText = 'Please select at least one category.';
    return;
  }

  if (!/^[a-zA-Z0-9]{1,20}$/.test(this.userName)) {
    this.errorText = 'Invalid username';
    return;
  }

  let answerTimeLimitInS = sliderValueAsInteger($('#answerTimeLimitSlider')[0], vue.answerTimeLimitMax);
  let answerTimeLimitInMs;
  if (answerTimeLimitInS !== Number.MAX_SAFE_INTEGER) {
    answerTimeLimitInMs = answerTimeLimitInS * 1000;
  } else {
    answerTimeLimitInMs = maxAnswerTimeLimit;
  }

  vue.socket.emit('create', {
    decks: selectedDecks,
    answerTimeLimitInMs: answerTimeLimitInMs,
    private: vue.private,
    answerForgivenessWindow: this.answerForgivenessWindow,
  });
  vue.gameStarted = true;
}

function answerTimeLimitChanged() {
  var slider = $('#answerTimeLimitSlider')[0];
  var selectedTimeLimit = slider.value;
  vue.answerTimeLimit = selectedTimeLimit;
}

function answerForgivenessWindowChanged() {
  var slider = $('#answerForgivenessWindowSlider')[0];
  var selectedAnswerForgivenessWindow = slider.value;
  vue.answerForgivenessWindow = selectedAnswerForgivenessWindow;
}

function sliderValueAsInteger(slider, maxValue) {
  var asInt = parseInt(slider.value);
  if (asInt === maxValue) {
    return Number.MAX_SAFE_INTEGER;
  }
  return asInt;
}

vue = new Vue({
  el: '#app',
  data: {
    socket: io(),
    answerTimeLimit: 180,
    answerTimeLimitMax: 180,
    answerTimeLimitMin: 5,
    userName: names[Math.floor(Math.random() * names.length)],
    private: false,
    loaded: true,
    answerForgivenessWindowMax: 10000,
    answerForgivenessWindowMin: 0,
    answerForgivenessWindow: 0,
    errorText: '',
    decks: [
      {shortName: 'hiragana', longName: 'Hiragana'},
      {shortName: 'katakana', longName: 'Katakana'},
      {shortName: 'n5', longName: 'JLPT N5'},
      {shortName: 'n4', longName: 'JLPT N4'},
      {shortName: 'n3', longName: 'JLPT N3'},
      {shortName: 'n2', longName: 'JLPT N2'},
      {shortName: 'n1', longName: 'JLPT N1'},
      {shortName: '10k', longName: 'Kanken 10級'},
      {shortName: '9k', longName: 'Kanken 9級'},
      {shortName: '8k', longName: 'Kanken 8級'},
      {shortName: '7k', longName: 'Kanken 7級'},
      {shortName: '6k', longName: 'Kanken 6級'},
      {shortName: '5k', longName: 'Kanken 5級'},
      {shortName: '4k', longName: 'Kanken 4級'},
      {shortName: '3k', longName: 'Kanken 3級'},
      {shortName: 'j2k', longName: 'Kanken 準2級'},
      {shortName: '2k', longName: 'Kanken 2級'},
      {shortName: 'j1k', longName: 'Kanken 準1級'},
      {shortName: '1k', longName: 'Kanken 1級'},
      {shortName: 'prefectures', longName: 'Prefectures'},
      {shortName: 'cities', longName: 'Cities'},
      {shortName: 'stations', longName: 'Stations'},
      {shortName: 'tokyo', longName: 'Tokyo'},
      {shortName: 'myouji', longName: 'Family Names'},
      {shortName: 'namae', longName: 'Given Names'},
      {shortName: 'onago', longName: 'Female Given Names'},
      {shortName: 'seiyuu', longName: 'Voice Actor/Actress Names'},
      {shortName: 'countries', longName: 'Countries'},
      {shortName: 'places', longName: 'Places'},
      {shortName: 'kirakira', longName: 'Kirakira Names'},
      {shortName: 'animals', longName: 'Animals'},
      {shortName: 'birds', longName: 'Birds'},
      {shortName: 'bugs', longName: 'Bugs'},
      {shortName: 'fish', longName: 'Fish'},
      {shortName: 'plants', longName: 'Plants'},
      {shortName: 'vegetables', longName: 'Vegetables'},
      {shortName: 'common', longName: 'Common (According to Jisho.org)'},
      {shortName: 'numbers', longName: 'Numbers'},
      {shortName: 'hard', longName: 'Hard'},
      {shortName: 'insane', longName: 'Insane'},
      {shortName: 'yojijukugo', longName: '四字熟語'},
      {shortName: 'kokuji', longName: '国字'},
      {shortName: 'radicals', longName: 'Radicals'},
      {shortName: 'klcc', longName: 'Kodansha Learner\'s Course'},
      {shortName: 'anagrams3', longName: 'English Anagrams Length 3'},
      {shortName: 'anagrams4', longName: 'English Anagrams Length 4'},
      {shortName: 'anagrams5', longName: 'English Anagrams Length 5'},
      {shortName: 'anagrams6', longName: 'English Anagrams Length 6'},
      {shortName: 'anagrams7', longName: 'English Anagrams Length 7'},
      {shortName: 'anagrams8', longName: 'English Anagrams Length 8'},
      {shortName: 'anagrams9', longName: 'English Anagrams Length 9'},
      {shortName: 'anagrams10', longName: 'English Anagrams Length 10+'},
    ],
  },
  methods: {
    create: create,
    answerTimeLimitChanged: answerTimeLimitChanged,
    answerForgivenessWindowChanged: answerForgivenessWindowChanged,
  },
});

function joinGame() {
  vue.socket.emit('request games');
  return false;
}

$('#answerTimeLimitSlider')[0].value = vue.answerTimeLimitMax;
$('#answerForgivenessWindowSlider')[0].value = vue.answerForgivenessWindowMin;

vue.socket.on('room created', function(roomId) {
  window.location = '/game.html?id=' + roomId + '&username=' + vue.userName;
});
