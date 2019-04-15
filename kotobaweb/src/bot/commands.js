const COMMAND_PREFIX = 'k!';

class Example {
  constructor(exampleAlias, exampleSuffix, imageName) {
    this.exampleText = `${COMMAND_PREFIX}${exampleAlias}${exampleSuffix ? ' ' : ''}${exampleSuffix}`;
    this.imageName = imageName;
    this.key = `${exampleAlias}${exampleSuffix}${imageName}`;
  }
}

class Command {
  constructor(primaryAlias, shortAlias, description, examples) {
    this.key = `${primaryAlias}`;
    this.primaryCommand = `${COMMAND_PREFIX}${primaryAlias}`;
    this.shortCommand = shortAlias ? `${COMMAND_PREFIX}${shortAlias}` : '';
    this.description = description;
    this.examples = examples;
  }
}

const commands = [
  new Command(
    'help',
    'h',
    'Show help for all my commands that are enabled in this channel, or show detailed help for a specific command.',
    [
      new Example('help', '', 'khelp.png'),
      new Example('help', 'translate', 'khelptranslate.png'),
    ],
  ),
  new Command(
    'jisho',
    'j',
    'Show definitions for a Japanese or English word. The results come from Jisho.org. You can use the reaction buttons to also see kanji info and examples.',
    [
      new Example('jisho', '瞬間', 'kj.png'),
    ],
  ),
  new Command(
    'kanji',
    'k',
    'Search for information about kanji characters, including onyomi, kunyomi, stroke count, radical, and examples. You can look up many kanji at a time and use reactions to navigate between results.',
    [
      new Example('kanji', '瞬間', 'kkanji.png'),
    ],
  ),
  new Command(
    'strokeorder',
    's',
    'Search for stroke order gifs and diagrams for kanji. You can look up many kanji at a time and use reactions to navigate between results.',
    [
      new Example('strokeorder', '瞬間', 'kstrokeorder.png'),
    ],
  ),
  new Command(
    'quiz',
    'q',
    'Start a quiz, or show available quizzes. I have Japanese and English quizzes for all levels.',
    [
      new Example('quiz', '', 'kquiz.png'),
      new Example('quiz', 'n4', 'kquizjlptn4.png'),
      new Example('quiz', 'stop', 'kquizstop.png'),
    ],
  ),
  new Command(
    'shiritori',
    'sh',
    'Start a game of shiritori in this channel.',
    [
      new Example('shiritori', '', 'kshiritori.png'),
    ],
  ),
  new Command(
    'leaderboard',
    'lb',
    'Check your position on the quiz leaderboard. Competition is fierce. Over 500,000 correct answers from users so far!',
    [
      new Example('leaderboard', '', 'kleaderboard.png'),
    ],
  ),
  new Command(
    'translate',
    't',
    'Translate non-English text into English, or English text into Japanese. It is also possible to translate into other languages (say \'k!help translate\' to learn how).',
    [
      new Example('translate', 'I am a cat', 'ktranslate.png'),
      new Example('translate', '吾輩は猫である', 'ktranslate.png'),
      new Example('translate-german', 'I am a cat', 'ktranslate.png'),
    ],
  ),
  new Command(
    'furigana',
    'f',
    'Render furigana for Japanese text.',
    [
      new Example('furigana', '吾輩は猫である', 'kfurigana.png'),
    ],
  ),
  new Command(
    'examples',
    'ex',
    'Search Jisho.org for example sentences.',
    [
      new Example('examples', '瞬間', 'kexamples.png'),
    ],
  ),
  new Command(
    'jukebox',
    '',
    'I will choose a Japanese song for you and send you a Youtube link. Hope you like Touhou and vocaloid!',
    [
      new Example('jukebox', '', 'kjukebox.png'),
    ],
  ),
  new Command(
    'weblio',
    'w',
    'Search the Weblio dictionary for a word. (Results are in Japanese)',
    [
      new Example('weblio', '瞬間', 'kweblio.png'),
    ],
  ),
  new Command(
    'thesaurus',
    'th',
    'Search the Weblio thesaurus a word. (Results are in Japanese)',
    [
      new Example('thesaurus', '瞬間', 'kthesaurus.png'),
    ],
  ),
  new Command(
    'pronounce',
    'p',
    'Look up the pronunciation of a word',
    [
      new Example('pronounce', '瞬間', 'kpronounce.png'),
    ],
  ),
  new Command(
    'random',
    'r',
    'Grab a random Japanese word from Jisho. You can also specify a JLPT level or Kanken level.',
    [
      new Example('random', '', 'krandom.png'),
      new Example('random', 'n3', 'krandomn3.png'),
      new Example('random', '1k', 'krandom1k.png'),
    ],
  ),
  new Command(
    'settings',
    '',
    'Change my settings, including prefix. Most settings can be changed on a user level. Others can only be changed on a server or channel level.',
    [
      new Example('settings', '', 'ksettings.png'),
    ],
  ),
  new Command(
    'about',
    '',
    'Show a little bit of meta information about me.',
    [
      new Example('about', '', 'kabout.png'),
    ],
  ),
];

export default commands;
