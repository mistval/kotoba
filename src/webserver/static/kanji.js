function isKanji(char) {
  return char >= '\u4E00' && char <= '\u9FAF';
}

function linkForKanji(kanji) {
  let fileCodeStringLength = 5;
  let unicodeString = kanji.codePointAt(0).toString(16);
  let fillZeroes = fileCodeStringLength - unicodeString.length;
  let fileCode = new Array(fillZeroes + 1).join('0') + unicodeString;
  let fileName = fileCode + '_anim.gif';
  return 'https://raw.githubusercontent.com/mistval/kotoba/master/resources/images/kanjianimations/' + fileName;
}

var vue = new Vue({
  el: '#app',
  data: {
    socket: io(),
    links: [],
    kanjiString: '犬感陶轟',
    loaded: true,
  },
  watch: {
    kanjiString: function(kanjiString) {
      let kanjiArray = kanjiString.split('').filter(char => isKanji(char)).slice(0, 49);
      this.links = [];
      for (let kanji of kanjiArray) {
        this.links.push(linkForKanji(kanji));
      }
    },
  }
});

vue.kanjiString = '犬朝感陶礎';
