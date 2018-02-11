var vue;

var names = ["Acrallef","Apnalled","AprilHomey","Archift","Atediney","Attractive","Boboundraw","Boninget","Buddientbr","BuffMatterExclusive","Buggyreet","Carecore","Certion","Cessorks","Chasemalead","CheeseSra","Churuser","Cleanzant","ComfyConspiracy","Cosinks","CrashStories","CrazyEye","Dailiesba","DarthCeticNight","Divagoon","Dubyaricamf","Dubyarita","Ducatchab","EatsyouIzPhobic","EssenceReporter","Everchicat","Exegycond","ExoticMaxi","Fashionew","Fighteritaz","Fishitly","Fixtudy","Fourianity","Fruitelec","FuzzyQuote","Gemainn","GinoJournal","Goosead","Greateguren","Griffonomed","Handcapod","HaroMajere","Heheadcobb","Himestn","Hunterhead","Incartleze","Inordity","Issuestre","KaiBrace","Konristi","LessPurfect","LightFred","LimeWeirdHello","LouAnime","Lumecher","MaidCheeNaybor","MajorYui","Mantecklena","Masterield","Mixalys","Natucsco","NeoRozMonkey","Nomyoknu","Nuwerclo","Parance","Phobicatic","Piercessor","Primirier","Pruntson","RadiantXglossy","Recomlepa","Rhemadou","Rundping","SandWriting","SchoolAlli","ScoobyVital","Shinginket","Smarthweb","SocialSmarter","StahMrFeature","Sweettems","Swingbigb","Talentedia","Tasoftie","ThehibikiLunatic","ThenornDancer","ThenornKitGorgeous","Trendynetc","TrimbleBee","TrippinTins","Undervera","Uoutschumb","VanderMiracle","Waredusk","Wellbeyer"];

function send() {
  var message = $('#m').val();
  if (message) {
    this.socket.emit('chat message', message);
    this.messageDatas.push({userName: this.userName, message: message, type: 'chat'});
    $('#m').val('');
  } else {
    this.socket.emit('skip');
  }
}

function skip() {
  this.socket.emit('skip');
}

function getRoomIdFromGetArgs() {
  var regex = new RegExp('id=(.*?)(&|$)')
  var regexResults = regex.exec(location.search);

  // TODO: Handle no room id
  if (regexResults) {
    return regexResults[1];
  }
}

function getUserNameFromGetArgs() {
  var regex = new RegExp('username=(.*?)(&|$)')
  var regexResults = regex.exec(location.search);

  // TODO: Handle no room id
  if (regexResults) {
    return regexResults[1];
  }
}

function joinWithName() {
  var roomId = getRoomIdFromGetArgs();
  window.location = '/game.html?id=' + roomId + '&username=' + this.userName;
}

vue = new Vue({
  el: '#app',
  data: {
    socket: io(),
    messageDatas: [],
    userName: names[Math.floor(Math.random() * names.length)],
    players: [],
    loaded: true,
    instructions: 'Next Question',
    imageDataUri: undefined,
  },
  methods: {
    send: send,
    skip: skip,
    joinWithName: joinWithName,
  },
  updated: function() {
    var element = document.getElementById('messageArea');
    element.scrollTop = element.scrollHeight;
  }
});

vue.socket.on('chat message', function(data){
  vue.messageDatas.push({userName: data.userName, message: data.msg, type: 'chat'});
});

vue.socket.on('ended no questions left', function() {
  vue.messageDatas.push({userName: 'System', message: 'The game stopped because there are no questions left in that category. Nice!', type: 'chat'});
});

vue.socket.on('broadcast', function(msg) {
  vue.messageDatas.push({userName: 'System', message: msg, type: 'broadcast'});
});

vue.socket.on('ended for error', function() {
  vue.messageDatas.push({userName: 'System', message: 'The game stopped because of an error. Sorry about that. The error was logged and will be looked at.', type: 'chat'});
});

vue.socket.on('stopping all', function() {
  vue.messageDatas.push({userName: 'System', message: 'The game stopped because the server is rebooting to apply bug fixes. It should be back online in 20-30 seconds. Thanks for playing!', type: 'chat'});
});

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

vue.socket.on('new question', function(data) {
  vue.imageDataUri = 'data:image/png;base64,' + _arrayBufferToBase64(data.question.bodyAsPngBuffer);
  vue.instructions = data.question.instructions;
});

vue.socket.on('ended too many wrong answers', function() {
  vue.messageDatas.push({userName: 'System', message: 'Ya got too many questions wrong in a row, so the game stopped.', type: 'chat'});
});

vue.socket.on('timeout', function(data) {
  vue.messageDatas.push({correctAnswers: data.answers, meaning: data.meaning, type: data.skipped ? 'skippedQuestion' : 'timedOutQuestion'});
});

vue.socket.on('correct', function(data) {
  var answerersText;
  if (data.userNames.length > 1) {
    answerersText = data.userNames.slice(0, data.userNames.length - 1).join(', ') + ' and ' + data.userNames[data.userNames.length - 1] + ' got it right!';
  } else {
    answerersText = data.userNames[0] + ' got it right!';
  }
  vue.messageDatas.push({correctAnswers: data.answers, meaning: data.meaning, answerersText: answerersText, type: 'correctAnswer'});
});

vue.socket.on('no such room', function() {
  window.location = 'create.html';
});

vue.socket.on('scores', function(scoreForUserName) {
  vue.players = Object.keys(scoreForUserName).map(userName => {
    return {name: userName, score: scoreForUserName[userName].totalScore || 0};
  }).sort((a, b) => {
    return b.score - a.score;
  });
});

var roomId = getRoomIdFromGetArgs();
var userName = getUserNameFromGetArgs();

if (!userName) {
  $('#userNameModal').modal('show');
} else {
  vue.socket.emit('join', roomId, userName);
  vue.userName = userName;
}
