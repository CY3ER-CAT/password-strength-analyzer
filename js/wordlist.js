/* ==========================================================================
   CY3ER-CAT — Local wordlist & pattern data
   Everything here ships with the page. No network requests, ever.
   All entries are lowercase; the analyzer normalises input before matching.
   ========================================================================== */
(function () {
  'use strict';

  window.PasswordLab = window.PasswordLab || {};

  /* Passwords seen constantly in public breach corpora.
     Deliberately kept as a compact sample — not a substitute for a full
     breach corpus, but enough to catch the classics that people actually use. */
  window.PasswordLab.COMMON_PASSWORDS = [
    '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234',
    '111111', '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football',
    'monkey', 'letmein', 'shadow', 'master', '666666', 'qwertyuiop', '123321',
    'mustang', '1234567890', 'michael', '654321', 'superman', '1qaz2wsx',
    '7777777', '121212', '000000', 'qazwsx', '123qwe', 'killer', 'trustno1',
    'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', 'hunter', 'buster', 'soccer',
    'harley', 'batman', 'andrew', 'tigger', 'sunshine', 'iloveyou', '2000',
    'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel', 'starwars',
    'klaster', '112233', 'george', 'computer', 'michelle', 'jessica', 'pepper',
    '1111', 'zxcvbn', '555555', '11111111', '131313', 'freedom', '777777',
    'pass', 'maggie', '159753', 'aaaaaa', 'ginger', 'princess', 'joshua',
    'cheese', 'amanda', 'summer', 'love', 'ashley', 'nicole', 'chelsea',
    'biteme', 'matthew', 'access', 'yankees', '987654321', 'dallas', 'austin',
    'thunder', 'taylor', 'matrix', 'mobilemail', 'mom', 'monitor', 'monitoring',
    'montana', 'moon', 'moscow', 'welcome', 'login', 'admin', 'root', 'toor',
    'test', 'guest', 'passw0rd', 'p@ssw0rd', 'password1', 'password123',
    'password1234', 'qwerty123', 'qwerty1', 'abc12345', 'abcd1234', '1q2w3e4r',
    '1q2w3e', 'q1w2e3r4', 'zaq12wsx', 'qazwsxedc', 'asdf1234', 'zxcv1234',
    'letmein123', 'welcome123', 'admin123', 'root123', 'test123', 'guest123',
    'changeme', 'default', 'secret', 'letmein1', 'trustme', 'whatever',
    'minecraft', 'pokemon', 'naruto', 'sasuke', 'goku', 'liverpool', 'arsenal',
    'barcelona', 'realmadrid', 'manchester', 'juventus', 'messi', 'ronaldo',
    'hello', 'hello123', 'monkey123', 'dragon123', 'sunshine1', 'princess1',
    'football1', 'baseball1', 'superman1', 'batman1', 'starwars1', 'iloveyou1',
    'beautiful', 'babygirl', 'babyboy', 'sweetheart', 'hottie', 'lovely',
    'angel', 'friends', 'family', 'mother', 'father', 'brother', 'sister',
    'coffee', 'cookie', 'chocolate', 'butterfly', 'rainbow', 'flower', 'purple',
    'orange', 'yellow', 'silver', 'golden', 'diamond', 'tigger1', 'snoopy',
    'garfield', 'mickey', 'donald', 'goofy', 'spiderman', 'ironman', 'avengers',
    'thor', 'hulk', 'wolverine', 'deadpool', 'matrix1', 'terminator',
    'predator', 'alien', 'phantom', 'ghost', 'spirit', 'shadow1', 'darkness',
    'lightning', 'thunder1', 'storm', 'tornado', 'hurricane', 'volcano',
    'earthquake', 'winter', 'spring', 'autumn', 'summer1', 'january', 'february',
    'march', 'april', 'june', 'july', 'august', 'september', 'october',
    'november', 'december', 'monday', 'friday', 'sunday', 'weekend', 'holiday',
    'vacation', 'college', 'school', 'student', 'teacher', 'doctor', 'nurse',
    'police', 'fireman', 'soldier', 'captain', 'general', 'colonel', 'sergeant',
    'president', 'king', 'queen', 'prince', 'castle', 'kingdom', 'throne',
    'sword', 'shield', 'arrow', 'falcon', 'eagle', 'hawk', 'wolf', 'tiger',
    'lion', 'bear', 'shark', 'dolphin', 'whale', 'elephant', 'giraffe',
    'penguin', 'panda', 'koala', 'rabbit', 'turtle', 'snake', 'viper', 'cobra',
    'python', 'java', 'javascript', 'coding', 'developer', 'programmer',
    'hacker', 'cyber', 'security', 'firewall', 'network', 'server', 'database',
    'internet', 'website', 'email', 'google', 'facebook', 'twitter',
    'instagram', 'snapchat', 'tiktok', 'youtube', 'netflix', 'spotify',
    'amazon', 'apple', 'microsoft', 'windows', 'linux', 'android', 'iphone',
    'samsung', 'laptop', 'keyboard', 'mouse', 'printer', 'camera', 'phone',
    'mobile', 'tablet', 'gaming', 'player', 'winner', 'champion', 'legend',
    'hero', 'warrior', 'ninja', 'samurai', 'pirate', 'cowboy', 'wizard',
    'magic', 'potter', 'harrypotter', 'hogwarts', 'gandalf', 'frodo', 'lotr',
    'skywalker', 'vader', 'yoda', 'jedi', 'sith', 'force', 'empire',
    'rebellion', 'matrix123', 'inception', 'avatar', 'titanic', 'jamesbond',
    'bond007', '007007', 'agent007', 'secret007', 'mission', 'impossible',
    'rocket', 'satellite', 'galaxy', 'universe', 'planet', 'mars', 'venus',
    'jupiter', 'saturn', 'mercury', 'neptune', 'pluto', 'asteroid', 'comet',
    'meteor', 'cosmos', 'nebula', 'quasar', 'photon', 'neutron', 'proton',
    'electron', 'gravity', 'energy', 'power', 'strength', 'muscle', 'fitness',
    'health', 'happy', 'smile', 'laugh', 'joy', 'hope', 'faith', 'dream',
    'destiny', 'future', 'present', 'time', 'space', 'infinity', 'eternity',
    'forever', 'never', 'always', 'nothing', 'everything', 'something',
    'anything', 'someone', 'everyone', 'nobody', 'somebody', 'anybody',
    'however', 'because', 'before', 'after', 'again', 'against', 'between',
    'through', 'during', 'without', 'within', 'around', 'behind', 'beyond',
    'above', 'below', 'under', 'over', 'inside', 'outside', 'question',
    'answer', 'problem', 'solution', 'reason', 'purpose', 'meaning',
    'knowledge', 'wisdom', 'truth', 'justice', 'peace', 'war', 'victory',
    'defeat', 'battle', 'fight', 'struggle', 'survival', 'adventure', 'journey',
    'destination', 'road', 'bridge', 'mountain', 'river', 'ocean', 'beach',
    'island', 'forest', 'desert', 'valley', 'canyon', 'waterfall', 'sunrise',
    'sunset', 'midnight', 'noon', 'morning', 'evening', 'tonight', 'tomorrow',
    'yesterday', 'today', 'calendar', 'clock', 'watch', 'minute', 'second',
    'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium',
    'correcthorsebatterystaple', 'thisisapassword', 'mypassword', 'yourpassword',
    'letmeinplease', 'openup', 'opensesame', 'sesame', 'qwertyui', 'asdfghjkl',
    'zxcvbnm1', '1qazxsw2', '2wsx3edc', '0987654321', '987654321a',
    'abc123abc', 'abcdefg', 'abcdef', 'qwertz', 'azerty', 'motdepasse',
    'contraseña', 'senha', 'geheim', 'passwort', 'iloveu', 'iloveyou2',
    'trustno1!', 'whatever1', 'nothing1', 'something1', 'summer2024',
    'winter2024', 'spring2024', 'autumn2024', 'summer2025', 'winter2025',
    'spring2025', 'summer2026', 'winter2026', 'password!', 'password2024',
    'password2025', 'welcome2024', 'welcome2025', 'admin2024', 'admin2025'
  ];

  /* Dictionary words that are especially damaging inside a longer password.
     The analyzer flags these when they appear anywhere in the password. */
  window.PasswordLab.COMMON_WORDS = [
    'password', 'passw0rd', 'qwerty', 'admin', 'welcome', 'letmein',
    'dragon', 'monkey', 'football', 'baseball', 'iloveyou', 'sunshine',
    'princess', 'master', 'shadow', 'superman', 'batman', 'trustno1',
    'login', 'secret', 'changeme', 'default', 'starwars', 'minecraft',
    'pokemon', 'naruto', 'liverpool', 'chelsea', 'arsenal', 'barcelona',
    'realmadrid', 'correcthorse', 'batterystaple', 'letmein1'
  ];

  /* Rows used to detect keyboard walks (qwerty, asdf, zxcv, etc.). */
  window.PasswordLab.KEYBOARD_ROWS = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890',
    'qazwsx',
    'wsxedc',
    '1qaz2wsx',
    'zaq12wsx',
    '1q2w3e4r',
    'q1w2e3r4'
  ];
})();
