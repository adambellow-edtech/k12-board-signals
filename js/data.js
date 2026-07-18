/* Breakout Land — content data (mock content standing in for the Breakout EDU catalog) */

const DATA = {
  // The painted cast (assets/heroes.webp, 6x2 grid — index = sheet position)
  heroes: [
    { name: 'Nova' }, { name: 'Miles' }, { name: 'Pip' }, { name: 'Blaze' },
    { name: 'Sunny' }, { name: 'Ash' }, { name: 'Rio' }, { name: 'Specs' },
    { name: 'Buzz' }, { name: 'Skye' }, { name: 'Scout' }, { name: 'Ziggy' },
  ],
  trails: [
    { id: 'no-trail', name: 'No Trail', free: true },
    { id: 'sparkle',  name: 'Sparkle Trail', price: 35 },
    { id: 'bubbles',  name: 'Bubble Trail',  price: 45 },
    { id: 'rainbow',  name: 'Rainbow Trail', price: 80 },
  ],
  accessories: [
    { id: 'none',     name: 'None',          free: true },
    { id: 'cap',      name: 'Ball Cap',      price: 20 },
    { id: 'glasses',  name: 'Smart Glasses', price: 20 },
    { id: 'crown',    name: 'Key Crown',     price: 60 },
    { id: 'wizard',   name: 'Wizard Hat',    price: 50 },
    { id: 'cape',     name: 'Hero Cape',     price: 70 },
    { id: 'headband', name: 'Headband',      price: 15 },
  ],
  pets: [
    { id: 'nopet', name: 'No Pet', free: true },
    { id: 'fox',   name: 'Lockfox',    price: 90,  color: '#e8743c' },
    { id: 'owl',   name: 'Puzzle Owl', price: 90,  color: '#8a6db1' },
    { id: 'bot',   name: 'Key-Bot',    price: 120, color: '#9db4c4' },
  ],

  badges: [
    { id: 'first-breakout', name: 'First Breakout!',  desc: 'Complete your first game',            icon: 'lock' },
    { id: 'daily-3',        name: 'On a Roll',        desc: '3-day Lock of the Day streak',        icon: 'flame' },
    { id: 'key-50',         name: 'Key Collector',    desc: 'Earn 50 keys in total',               icon: 'key' },
    { id: 'mathlete',       name: 'Mathlete',         desc: 'Clear 3 Breakout Math nodes',         icon: 'math' },
    { id: 'challenge',      name: 'Challenge Champ',  desc: 'Beat a purple Challenge node',        icon: 'trophy' },
    { id: 'stylist',        name: 'Style Star',       desc: 'Buy your first Style Shop item',      icon: 'star' },
    { id: 'thinker',        name: 'Critical Thinker', desc: 'Solve a lock on the first try',       icon: 'bulb' },
    { id: 'persistent',     name: 'Never Give Up',    desc: 'Solve a lock after 3+ tries',         icon: 'heart' },
  ],

  // Lock of the Day pool — rotates by date
  dailyLocks: [
    { type: 'number', clue: 'I am a two-digit number. My tens digit is double my ones digit, and my digits add up to 9. Open the lock!', answer: '63', hint: 'Try digits that add to 9 where the first is twice the second.' },
    { type: 'word', clue: 'I have keys but open no locks, I have space but no room, you can enter but not go inside. What am I?', answer: 'KEYBOARD', hint: 'You might be using one right now…' },
    { type: 'color', clue: 'Mix-up at the paint shop! Enter the colors of: the sun, the ocean, grass, and a strawberry — in that order.', answer: ['yellow', 'blue', 'green', 'red'], hint: 'Sun → Ocean → Grass → Strawberry.' },
    { type: 'direction', clue: 'The treasure map says: toward the sunrise, then toward the mountains at the top, then sunrise again, then down the waterfall.', answer: ['right', 'up', 'right', 'down'], hint: 'Sunrise = East (right). Top of a map = up.' },
    { type: 'number', clue: 'Three friends share 24 cookies equally, then each eats 2. How many cookies does each friend have left?', answer: '6', hint: '24 ÷ 3 first, then subtract.' },
    { type: 'word', clue: 'The more you take, the more you leave behind. What are they?', answer: 'STEPS', hint: 'Think about walking.' },
    { type: 'number', clue: 'A clock shows 3:15. How many minutes until 4 o’clock?', answer: '45', hint: '60 minutes in an hour.' },
    { type: 'shape', clue: 'The wizard’s door whispers: “First 3 sides, then 4 sides, then no sides at all!”', answer: ['triangle', 'square', 'circle'], hint: 'Count each shape’s sides.' },
    { type: 'switch', clue: 'The power panel hums: “Flip ON only the ODD-numbered switches.”', answer: '10101', hint: 'Odd numbers: 1, 3, 5.' },
  ],

  // Assigned games — in production these embed the breakoutedu.com digital game player
  games: [
    {
      id: 'missing-mascot',
      name: 'The Case of the Missing Mascot',
      subject: 'ELA · Inference',
      grade: '3–5',
      story: 'Boomer the school mascot costume vanished the night before the big game! Follow the clues around the gym to figure out who borrowed it — and get it back before kickoff.',
      minutes: 15,
      locks: [
        { type: 'word', clue: 'Clue #1 — A note on the locker reads: “Take the first letter of each word: Basketballs Often Occupy My Storage Try Every Rack.”', answer: 'BOOMSTER', hint: 'First letter of each word, in order.' },
        { type: 'number', clue: 'Clue #2 — The janitor saw someone at “half past three”. Enter the time as 3 digits.', answer: '330', hint: 'Half past three = 3:30.' },
      ],
    },
    {
      id: 'space-escape',
      name: 'Space Station Escape',
      subject: 'Science · Problem Solving',
      grade: '3–5',
      story: 'A meteor shower knocked out the station’s main power! Reboot three systems and reach the escape pod before oxygen runs low. Work fast, think faster.',
      minutes: 20,
      locks: [
        { type: 'color', clue: 'Reboot panel — “Power flows like a rainbow, but skip every other color starting from red.” (red, orange, yellow, green, blue, purple)', answer: ['red', 'yellow', 'blue'], hint: 'Red, skip orange, yellow, skip green…' },
        { type: 'direction', clue: 'Airlock — The floor arrows spell the route: away from the meteor (it hit the left side), then toward the flashing light above, then above again, then toward the pod on the right.', answer: ['right', 'up', 'up', 'right'], hint: 'Away from left = right.' },
        { type: 'number', clue: 'Escape pod — “Oxygen: 88%. It drops 8% every minute. Enter how many minutes until it hits 48%.”', answer: '5', hint: '88 − 48 = 40, and 40 ÷ 8 = ?' },
      ],
    },
  ],

  // Breakout+ bonus content (subscription-gated)
  plusGames: [
    { id: 'pirate-cove', name: 'Mystery at Pirate Cove', subject: 'Social Studies', grade: 'K–2' },
    { id: 'time-machine', name: 'Dr. Tock’s Time Machine', subject: 'History', grade: '3–5' },
    { id: 'code-cave', name: 'The Coding Cave', subject: 'CS · Logic', grade: '3–5' },
    { id: 'sel-island', name: 'Friendship Island', subject: 'SEL', grade: 'K–2' },
  ],

  // Breakout Math — one sample unit trail per grade band (scoped & sequenced K–5)
  mathUnits: {
    K: { unit: 'Counting Camp', skills: 'Counting to 20 · comparing groups' },
    1: { unit: 'Addition Alley', skills: 'Add & subtract within 20' },
    2: { unit: 'Place Value Peaks', skills: 'Place value · 2-digit addition' },
    3: { unit: 'Multiplication Meadow', skills: 'Multiply & divide within 100' },
    4: { unit: 'Fraction Falls', skills: 'Fraction equivalence · comparison' },
    5: { unit: 'Decimal Desert', skills: 'Decimals · volume · order of operations' },
  },

  // Math puzzle generators per grade (returns {clue, answer} for a number lock)
  mathProblems: {
    K: [
      { clue: 'Count the keys: 🔑🔑🔑🔑🔑 + 🔑🔑🔑. How many keys in all?', answer: '8' },
      { clue: 'You have 4 balloons. 2 fly away! How many are left?', answer: '2' },
      { clue: 'Count by ones: 6, 7, 8, __? Enter the missing number.', answer: '9' },
    ],
    1: [
      { clue: '7 + 6 = ? Open the lock with the sum!', answer: '13' },
      { clue: '15 − 8 = ? Enter the difference.', answer: '7' },
      { clue: 'Double 9 is…?', answer: '18' },
    ],
    2: [
      { clue: 'What is 10 more than 47?', answer: '57' },
      { clue: '36 + 25 = ? Regroup carefully!', answer: '61' },
      { clue: 'In the number 83, how many TENS are there?', answer: '8' },
    ],
    3: [
      { clue: '7 × 8 = ? The classic! Enter the product.', answer: '56' },
      { clue: '54 ÷ 6 = ? Enter the quotient.', answer: '9' },
      { clue: 'An array has 4 rows of 6 chairs. How many chairs?', answer: '24' },
    ],
    4: [
      { clue: 'Which is bigger: 3/4 or 2/3? Enter the top number of the bigger fraction.', answer: '3' },
      { clue: '1/2 = ?/8 — enter the missing numerator.', answer: '4' },
      { clue: '6 × 40 = ? Enter the product.', answer: '240' },
    ],
    5: [
      { clue: '2.5 + 1.75 = ? Enter as digits, no decimal point (e.g. 4.25 → 425).', answer: '425' },
      { clue: 'Volume of a 3 × 4 × 2 box (cubic units)?', answer: '24' },
      { clue: '(8 + 4) ÷ 2 × 3 = ? Order of operations!', answer: '18' },
    ],
  },

  // Node layout for a math trail: type sequence along the path
  mathTrail: ['core', 'core', 'review', 'core', 'challenge', 'core', 'review', 'core', 'challenge', 'boss'],

  // Mock roster for teacher dashboard (the live player is appended as "You")
  roster: [
    { name: 'Ava R.',    level: 6, keys: 142, games: 9,  avgMin: 11.2, success: 0.92, streak: 5, arcade: true },
    { name: 'Diego M.',  level: 5, keys: 118, games: 8,  avgMin: 13.9, success: 0.88, streak: 2, arcade: true },
    { name: 'Jordan P.', level: 4, keys: 87,  games: 6,  avgMin: 16.4, success: 0.71, streak: 0, arcade: false },
    { name: 'Lily C.',   level: 7, keys: 203, games: 12, avgMin: 9.8,  success: 0.95, streak: 8, arcade: true },
    { name: 'Marcus T.', level: 3, keys: 54,  games: 4,  avgMin: 18.1, success: 0.64, streak: 1, arcade: true },
    { name: 'Nia W.',    level: 5, keys: 131, games: 8,  avgMin: 12.6, success: 0.85, streak: 3, arcade: true },
  ],

  // Comparison data: average minutes to breakout, per game (class / school / all players in age group)
  comparisons: [
    { game: 'Missing Mascot',   class: 12.4, school: 14.1, global: 15.8 },
    { game: 'Space Escape',     class: 17.2, school: 16.5, global: 18.9 },
    { game: 'Mult. Meadow 1–5', class: 8.1,  school: 9.4,  global: 10.2 },
  ],
  // Brand-derived series colors (validated for CVD + contrast):
  // class = Breakout Blue Light, school = Gamer Green (darkened step), global = Puzzling Purple
  chartColors: { class: '#0068ff', school: '#1c9a85', global: '#5c25b7' },

  parentWeek: [
    { day: 'Mon', min: 22 }, { day: 'Tue', min: 15 }, { day: 'Wed', min: 30 },
    { day: 'Thu', min: 0 },  { day: 'Fri', min: 25 }, { day: 'Sat', min: 12 }, { day: 'Sun', min: 0 },
  ],
};
