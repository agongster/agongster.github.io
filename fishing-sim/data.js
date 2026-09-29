// Tiny Tides — game content.
// Everything tunable lives here: the sky palettes, every fish, every piece of
// clothing, and the fishing gear. Change a number or a colour here and the
// rest of the game picks it up.

const OUTLINE = '#2a1a2e';

// ---------------------------------------------------------------- the sky --
// The day loops golden hour -> sunset -> dusk -> night -> (back to golden).
// Each phase lasts PHASE_SECONDS; the last 30% of a phase blends into the next.
const PHASE_SECONDS = 75;

const PHASES = [
  {
    id: 'golden', arrive: 'A new day: the light turns golden', name: 'Golden hour',
    sky: ['#7a64b0', '#a672b8', '#e08aa8', '#f7a88a', '#ffc88a', '#ffe0a0', '#fff0c4'],
    water: ['#f2a8a0', '#c47aa8', '#8a5a9a', '#5e3f7e'],
    refl: '#fff3c4', sun: '#fff3c4', sunY: 60,
    hillsFar: '#d58aa6', hills: '#a0508a', cloud: '#fff0dc', cloudShade: '#f5a8a0',
    stars: 0, lamp: 0, moon: 0, night: 0,
  },
  {
    id: 'sunset', arrive: 'The sun is setting...', name: 'Sunset',
    sky: ['#3d2a6b', '#7a3a7a', '#c4507a', '#f0706a', '#ff9a5c', '#ffc05c', '#ffe08a'],
    water: ['#e8808a', '#a24c86', '#62306e', '#3e2256'],
    refl: '#ffd27a', sun: '#ffd27a', sunY: 84,
    hillsFar: '#b0507a', hills: '#7a3470', cloud: '#ffc4a4', cloudShade: '#e0708a',
    stars: 0.1, lamp: 0.4, moon: 0, night: 0.15,
  },
  {
    id: 'dusk', arrive: 'Dusk settles in. Night fish are stirring!', name: 'Dusk',
    sky: ['#1e1a45', '#3a2560', '#6a3070', '#a8407a', '#e0607a', '#f59070', '#ffb880'],
    water: ['#9a5282', '#5e306a', '#34204e', '#221638'],
    refl: '#ff9a6a', sun: '#ff9a6a', sunY: 104,
    hillsFar: '#6a3070', hills: '#3a2458', cloud: '#c47aa0', cloudShade: '#7a4a8a',
    stars: 0.55, lamp: 1, moon: 0.35, night: 0.55,
  },
  {
    id: 'night', arrive: 'Night has fallen. The stars are out', name: 'Night',
    sky: ['#0e0e2a', '#141440', '#1c1a50', '#26205c', '#342866', '#44306e', '#553876'],
    water: ['#3a2e6a', '#241e50', '#16123a', '#0e0b28'],
    refl: '#efe6ff', sun: '#ff9a6a', sunY: 140,
    hillsFar: '#241e50', hills: '#15133a', cloud: '#4a3a78', cloudShade: '#2e2658',
    stars: 1, lamp: 1, moon: 1, night: 1,
  },
];

// ------------------------------------------------------------ the places --
// need: how many fish (not junk) you must have caught before the boat can take
// you there. tint pulls the sky and water toward a colour, by `amount`.
// map: where the island sits on the 160x100 sea chart.
const LOCATIONS = [
  { id: 'dock', name: 'Sunset Dock', need: 0, platform: 'dock', landmark: 'lighthouse', props: 'reeds',
    tint: null, map: { x: 34, y: 72 },
    blurb: 'Home sweet home. A creaky dock, a lantern, and a lighthouse winking across the water.' },
  { id: 'lagoon', name: 'Lily Lagoon', need: 12, platform: 'boat', landmark: 'willow', props: 'lilies',
    tint: { sky: '#ffb4d4', water: '#78c8a0', amount: 0.24 }, map: { x: 70, y: 34 },
    blurb: 'A still, pink lagoon full of lily pads, under a sleepy old willow.' },
  { id: 'cove', name: 'Coral Cove', need: 30, platform: 'boat', landmark: 'palms', props: 'coral',
    tint: { sky: '#ffc880', water: '#30b8c4', amount: 0.34 }, map: { x: 116, y: 74 },
    blurb: 'Warm, clear sea over pink coral. Watch out for pinchy things.' },
  { id: 'bay', name: 'Aurora Bay', need: 55, platform: 'boat', landmark: 'icebergs', props: 'ice',
    tint: { sky: '#a8d8ff', water: '#7aaae0', amount: 0.32 }, map: { x: 136, y: 24 },
    blurb: 'Far to the north. Icebergs, snowflakes, and ribbons of light at night.' },
];

// -------------------------------------------------------------- the fish --
const RARITY = {
  junk:      { label: 'Junk',      weight: 9,  color: '#b8a89a', biteWindow: 1.0 },
  common:    { label: 'Common',    weight: 58, color: '#fff4e0', biteWindow: 0.95 },
  uncommon:  { label: 'Uncommon',  weight: 22, color: '#8fd19e', biteWindow: 0.85 },
  rare:      { label: 'Rare',      weight: 8,  color: '#7fb8e6', biteWindow: 0.75 },
  legendary: { label: 'Legendary', weight: 2.5, color: '#ffd23f', biteWindow: 0.65 },
};

const ALL_DAY = ['golden', 'sunset', 'dusk', 'night'];

// where: which locations it lives in (leave it out for Sunset Dock only)
// shape: 'fish' (default), 'round', 'eel', 'puffer', or map: a pixel map in sprites.js
// pattern: none | stripes | spots | patches | stars | gradient
// diff: how hard it fights on the line (1 = sleepy, 6 = feral)
const FISH = [
  { id: 'boot', name: 'Soggy Boot', rarity: 'junk', price: 2, phases: ALL_DAY, diff: 0.6, where: ['dock', 'lagoon', 'cove', 'bay'],
    size: [24, 30], map: 'boot',
    blurb: 'Somebody out there is hopping around on one foot.' },
  { id: 'can', name: 'Tin Can', rarity: 'junk', price: 1, phases: ALL_DAY, diff: 0.6, where: ['dock', 'lagoon', 'cove', 'bay'],
    size: [8, 12], map: 'can',
    blurb: 'Peach slices, best before 1987. Still smells faintly of peaches.' },

  { id: 'minnow', name: 'Sunny Minnow', rarity: 'common', price: 6, phases: ['golden', 'sunset'], diff: 1,
    size: [4, 9], len: 10, h: 5, pattern: 'none',
    body: '#ffb35c', belly: '#ffe6a8', fin: '#ff8a4c', accent: '#ff8a4c',
    blurb: 'Tiny, bright, and absolutely convinced it is a shark.' },
  { id: 'perch', name: 'Peach Perch', rarity: 'common', price: 9, phases: ALL_DAY, diff: 1.4,
    size: [10, 25], len: 13, h: 7, pattern: 'stripes',
    body: '#ffab8a', belly: '#fff0d8', fin: '#ff7a6a', accent: '#e0705a',
    blurb: 'Smells faintly of summer. Nobody knows why.' },
  { id: 'carp', name: 'Pebble Carp', rarity: 'common', price: 11, phases: ALL_DAY, diff: 1.5,
    size: [20, 45], len: 15, h: 8, pattern: 'spots',
    body: '#bf9f80', belly: '#ecdcc4', fin: '#8f6f5f', accent: '#7a5a4a',
    blurb: 'Collects shiny pebbles and will not be sharing them.' },
  { id: 'guppy', name: 'Dusk Guppy', rarity: 'common', price: 8, phases: ['dusk', 'night'], diff: 1.2,
    size: [3, 6], len: 9, h: 5, pattern: 'gradient',
    body: '#c8a8f0', belly: '#f0e0ff', fin: '#9a6ae8', accent: '#ff9ec4',
    blurb: 'Only comes out once the sky turns purple to match.' },
  { id: 'bream', name: 'Blushing Bream', rarity: 'common', price: 13, phases: ['sunset', 'dusk'], diff: 1.8,
    size: [15, 35], len: 12, h: 10, shape: 'round', pattern: 'none',
    body: '#ff9ec4', belly: '#ffe0ec', fin: '#e06a9a', accent: '#e06a9a',
    blurb: 'Gets flustered when you look at it. Please be gentle.' },

  { id: 'koi', name: 'Marmalade Koi', rarity: 'uncommon', price: 32, phases: ['golden', 'sunset'], diff: 2.4,
    size: [30, 70], len: 16, h: 8, pattern: 'patches',
    body: '#fff3e6', belly: '#fff8f0', fin: '#ffb86b', accent: '#ff7a3c',
    blurb: 'Every pattern is unique, like a sticky little fingerprint.' },
  { id: 'puffer', name: 'Cotton Candy Puffer', rarity: 'uncommon', price: 40, phases: ['sunset', 'dusk'], diff: 2.8,
    size: [10, 25], r: 5, shape: 'puffer', pattern: 'spots',
    body: '#ffc4e0', belly: '#fff4fa', fin: '#8fd1f0', accent: '#7fb8e6',
    blurb: 'Puffs up when startled. Sadly, does not taste like candy.' },
  { id: 'catfish', name: 'Honey Catfish', rarity: 'uncommon', price: 36, phases: ['dusk', 'night'], diff: 2.5,
    size: [30, 80], len: 18, h: 7, pattern: 'spots', whiskers: true,
    body: '#d9a05a', belly: '#f5e0b0', fin: '#a8703a', accent: '#8a5a2a',
    blurb: 'Those whiskers are for sensing snacks. Mostly snacks.' },
  { id: 'trout', name: 'Lantern Trout', rarity: 'uncommon', price: 38, phases: ['night'], diff: 2.9,
    size: [25, 50], len: 16, h: 7, pattern: 'spots',
    body: '#4a5a8a', belly: '#c0d0f0', fin: '#3a4070', accent: '#ffd27a',
    blurb: 'Its spots glow softly, like a string of fairy lights.' },

  { id: 'salmon', name: 'Rosé Salmon', rarity: 'rare', price: 95, phases: ['golden', 'sunset'], diff: 3.5,
    size: [50, 90], len: 18, h: 7, pattern: 'gradient',
    body: '#ff8a8a', belly: '#ffe0d0', fin: '#e0606a', accent: '#ffb07a',
    blurb: 'Swims upstream purely for the view.' },
  { id: 'eel', name: 'Ember Eel', rarity: 'rare', price: 110, phases: ['sunset', 'dusk'], diff: 4,
    size: [60, 120], len: 24, shape: 'eel', pattern: 'stripes',
    body: '#e0503a', belly: '#ffb05a', fin: '#ffd27a', accent: '#b83a2a',
    blurb: 'Warm to the touch. Keeps the pond cosy in winter.' },
  { id: 'sunfish', name: 'Starry Sunfish', rarity: 'rare', price: 130, phases: ['night'], diff: 4.2,
    size: [30, 60], len: 14, h: 12, shape: 'round', pattern: 'stars',
    body: '#2e2e70', belly: '#3e3e90', fin: '#6a5ab0', accent: '#fff3c4',
    blurb: 'Swallowed a little piece of the night sky and kept it.' },

  { id: 'goldfish', name: 'Golden Sunfish', rarity: 'legendary', price: 420, phases: ['golden'], diff: 5,
    size: [40, 80], len: 15, h: 12, shape: 'round', pattern: 'stars',
    body: '#ffd23f', belly: '#fff3a0', fin: '#ffa030', accent: '#ffffff',
    blurb: 'Said to appear only when the light is exactly right.' },
  { id: 'moonkoi', name: 'Moonbeam Koi', rarity: 'legendary', price: 480, phases: ['night'], diff: 5.3,
    size: [60, 100], len: 18, h: 9, pattern: 'patches',
    body: '#ece8ff', belly: '#ffffff', fin: '#b8a8f0', accent: '#9b86e0',
    blurb: 'Nobody has ever seen it blink. Nobody has ever seen it eat.' },
  { id: 'dragon', name: 'Twilight Dragonfish', rarity: 'legendary', price: 600, phases: ['dusk'], diff: 5.8,
    size: [100, 200], len: 28, shape: 'eel', pattern: 'spots', whiskers: true,
    body: '#6a3a9a', belly: '#c07ae0', fin: '#ffd27a', accent: '#ffd27a',
    blurb: 'The old dock-keepers say it guards the last light of day.' },
  // ---- Lily Lagoon
  { id: 'loach', name: 'Lotus Loach', rarity: 'common', price: 14, phases: ALL_DAY, diff: 1.3, where: ['lagoon'],
    size: [8, 18], len: 18, shape: 'eel', pattern: 'spots',
    body: '#e8a0b8', belly: '#ffe0ea', fin: '#c87898', accent: '#b06080',
    blurb: 'Wiggles through lily roots looking for dropped petals.' },
  { id: 'mintminnow', name: 'Mint Minnow', rarity: 'common', price: 11, phases: ['golden', 'sunset'], diff: 1, where: ['lagoon'],
    size: [4, 10], len: 10, h: 5, pattern: 'none',
    body: '#8fe0b8', belly: '#e0fff0', fin: '#5fc098', accent: '#5fc098',
    blurb: 'Fresh! Cool! Tastes like toothpaste (allegedly).' },
  { id: 'betta', name: 'Petal Betta', rarity: 'common', price: 16, phases: ['sunset', 'dusk', 'night'], diff: 1.6, where: ['lagoon'],
    size: [5, 9], len: 11, h: 7, pattern: 'gradient',
    body: '#ff7aa8', belly: '#ffd0e0', fin: '#c060e0', accent: '#ffb0f0',
    blurb: 'Its fins look like a peony in full bloom.' },
  { id: 'pike', name: 'Mossback Pike', rarity: 'uncommon', price: 48, phases: ['dusk', 'night', 'golden'], diff: 2.8, where: ['lagoon'],
    size: [40, 90], len: 21, h: 6, pattern: 'stripes',
    body: '#7a9a5a', belly: '#e0e8b0', fin: '#5a7a3a', accent: '#4a6a3a',
    blurb: 'Hides under lily pads and pretends to be a log.' },
  { id: 'axolotl', name: 'Pearl Axolotl', rarity: 'rare', price: 150, phases: ['dusk', 'night'], diff: 3.8, where: ['lagoon'],
    size: [15, 30], map: 'axolotl',
    blurb: 'Smiles constantly. Nobody knows what it knows.' },
  { id: 'blossomkoi', name: 'Blossom Koi', rarity: 'legendary', price: 650, phases: ['sunset'], diff: 5.4, where: ['lagoon'],
    size: [60, 110], len: 18, h: 9, pattern: 'patches',
    body: '#fff0f4', belly: '#ffffff', fin: '#ffb0c8', accent: '#ff6a9a',
    blurb: 'Petals drift up from the water wherever it has been.' },

  // ---- Coral Cove
  { id: 'clownfish', name: 'Candy Clownfish', rarity: 'common', price: 18, phases: ['golden', 'sunset', 'dusk'], diff: 1.5, where: ['cove'],
    size: [6, 12], len: 11, h: 7, pattern: 'stripes',
    body: '#ff8a3c', belly: '#ffb070', fin: '#e0602a', accent: '#fff4e0',
    blurb: 'Lives in an anemone and refuses to share the rent.' },
  { id: 'sardine', name: 'Sandy Sardine', rarity: 'common', price: 12, phases: ALL_DAY, diff: 1.2, where: ['cove'],
    size: [10, 20], len: 13, h: 5, pattern: 'gradient',
    body: '#b0c0d8', belly: '#f0f4ff', fin: '#8090b0', accent: '#e0b070',
    blurb: 'Travels in a crowd of ten thousand best friends.' },
  { id: 'crab', name: 'Peach Crab', rarity: 'uncommon', price: 55, phases: ['golden', 'sunset', 'dusk'], diff: 2.6, where: ['cove'],
    size: [8, 20], map: 'crab',
    blurb: 'Walks sideways out of stubbornness, not necessity.' },
  { id: 'jelly', name: 'Bubblegum Jelly', rarity: 'uncommon', price: 60, phases: ['dusk', 'night'], diff: 2.2, where: ['cove'],
    size: [10, 30], map: 'jelly',
    blurb: 'Mostly water. Mostly vibes.' },
  { id: 'grouper', name: 'Coral Grouper', rarity: 'rare', price: 170, phases: ['sunset', 'dusk'], diff: 4, where: ['cove'],
    size: [50, 100], len: 16, h: 12, shape: 'round', pattern: 'spots',
    body: '#ff7a6a', belly: '#ffd0b8', fin: '#e0506a', accent: '#fff0c0',
    blurb: 'Big, grumpy, and secretly very soft-hearted.' },
  { id: 'marlin', name: 'Sunset Marlin', rarity: 'legendary', price: 800, phases: ['golden', 'sunset'], diff: 5.8, where: ['cove'],
    size: [150, 300], len: 24, h: 7, pattern: 'gradient', bill: true,
    body: '#4a5aa8', belly: '#ffd0a0', fin: '#ff8a5c', accent: '#ff9a5c',
    blurb: 'Its sail catches the last light like a tiny sunset of its own.' },

  // ---- Aurora Bay
  { id: 'cod', name: 'Snowcone Cod', rarity: 'common', price: 20, phases: ALL_DAY, diff: 1.6, where: ['bay'],
    size: [25, 50], len: 15, h: 8, pattern: 'spots',
    body: '#e8e4f0', belly: '#ffffff', fin: '#a8b8e0', accent: '#7fb8e6',
    blurb: 'Fluffy-looking. Actually just very cold.' },
  { id: 'smelt', name: 'Frost Smelt', rarity: 'common', price: 15, phases: ['dusk', 'night', 'golden'], diff: 1.3, where: ['bay'],
    size: [8, 15], len: 10, h: 4, pattern: 'gradient',
    body: '#c8b8ff', belly: '#f0ecff', fin: '#9a8ae0', accent: '#8fe0f0',
    blurb: 'Smells faintly of cucumbers and snowfall.' },
  { id: 'char', name: 'Blushing Char', rarity: 'uncommon', price: 65, phases: ['golden', 'sunset', 'dusk'], diff: 2.9, where: ['bay'],
    size: [30, 60], len: 16, h: 7, pattern: 'spots',
    body: '#6a7ab0', belly: '#ff9ab0', fin: '#e07090', accent: '#ffd0e0',
    blurb: 'Turns pinker the colder it gets. Very relatable.' },
  { id: 'auroraeel', name: 'Aurora Eel', rarity: 'rare', price: 190, phases: ['night', 'dusk'], diff: 4.3, where: ['bay'],
    size: [70, 140], len: 26, shape: 'eel', pattern: 'stripes',
    body: '#5ae0b0', belly: '#c0fff0', fin: '#c07aff', accent: '#9a6aff',
    blurb: 'Glows in soft ribbons, just like the sky above it.' },
  { id: 'narwhal', name: 'Tiny Narwhal', rarity: 'legendary', price: 900, phases: ['night'], diff: 6, where: ['bay'],
    size: [80, 150], map: 'narwhal',
    blurb: 'A baby. Its horn is mostly for pointing at things it likes.' },
  { id: 'bottle', name: 'Message in a Bottle', rarity: 'junk', price: 25, phases: ALL_DAY, diff: 0.6, where: ['cove', 'bay'],
    size: [20, 25], map: 'bottle',
    blurb: 'It says: "If found, please go fishing more." Wise words.' },
];

// ---------------------------------------------------------- the angler --
const SKIN_TONES = ['#ffe3cc', '#f5c6a0', '#dca27a', '#a8704c', '#6e4430'];
const HAIR_COLORS = ['#3b2433', '#7a4a32', '#e0a050', '#f07a5a', '#ff9ec4', '#9b86e0', '#8fd1c0', '#f4efe6'];
const TOP_COLORS = ['#ff8a6b', '#ffc15e', '#8fd19e', '#7fb8e6', '#c79bf2', '#f4efe6', '#e0566e', '#6a5a9a'];

// Everything with price 0 is free from the start.
const COSMETICS = {
  hair: [
    { id: 'short', name: 'Short', price: 0 },
    { id: 'bob', name: 'Bob', price: 0 },
    { id: 'spiky', name: 'Spiky', price: 0 },
    { id: 'long', name: 'Long', price: 45 },
    { id: 'pigtails', name: 'Pigtails', price: 60 },
    { id: 'bun', name: 'Bun', price: 60 },
  ],
  hat: [
    { id: 'none', name: 'No hat', price: 0 },
    { id: 'straw', name: 'Straw hat', price: 0 },
    { id: 'beanie', name: 'Beanie', price: 40 },
    { id: 'bucket', name: 'Bucket hat', price: 75 },
    { id: 'cat', name: 'Cat ears', price: 120 },
    { id: 'flower', name: 'Flower crown', price: 180 },
    { id: 'frog', name: 'Frog hat', price: 260 },
    { id: 'fishhat', name: 'Fish hat', price: 500 },
    { id: 'crown', name: 'Crown', price: 1200 },
  ],
  top: [
    { id: 'tee', name: 'Tee', price: 0 },
    { id: 'sweater', name: 'Sweater', price: 30 },
    { id: 'overalls', name: 'Overalls', price: 80 },
    { id: 'hoodie', name: 'Hoodie', price: 110 },
    { id: 'raincoat', name: 'Raincoat', price: 160 },
    { id: 'sailor', name: 'Sailor top', price: 240 },
  ],
  face: [
    { id: 'blush', name: 'Blush', price: 0 },
    { id: 'plain', name: 'Plain', price: 0 },
    { id: 'freckles', name: 'Freckles', price: 20 },
    { id: 'glasses', name: 'Glasses', price: 70 },
    { id: 'shades', name: 'Heart shades', price: 220 },
  ],
  buddy: [
    { id: 'none', name: 'No buddy', price: 0 },
    { id: 'duck', name: 'Duck', price: 200 },
    { id: 'cat', name: 'Cat', price: 320 },
    { id: 'frog', name: 'Frog', price: 380 },
    { id: 'capy', name: 'Capybara', price: 700 },
  ],
};

const COSMETIC_TABS = [
  { id: 'hair', label: 'Hair' },
  { id: 'hat', label: 'Hats' },
  { id: 'top', label: 'Tops' },
  { id: 'face', label: 'Face' },
  { id: 'buddy', label: 'Buddy' },
  { id: 'colors', label: 'Colours' },
];

const DEFAULT_LOOK = {
  skin: 1, hairColor: 1, topColor: 0,
  hair: 'bob', hat: 'straw', top: 'tee', face: 'blush', buddy: 'none',
};

// ------------------------------------------------------------- the gear --
// net: radius of your net in the underwater chase (in pixels)
// gain: how fast the catch bar fills while the fish is in your net
// luck: shifts odds toward rare fish and bigger sizes
// wait: multiplier on how long fish take to notice your bobber
const RODS = [
  { id: 'twig', name: 'Twig Rod', color: '#7a4a2a', price: 0, net: 15, gain: 0.3, luck: 0, wait: 1,
    blurb: 'A stick, some string, and a lot of hope.' },
  { id: 'bamboo', name: 'Bamboo Rod', color: '#c8a050', price: 90, net: 17, gain: 0.34, luck: 0.05, wait: 0.9,
    blurb: 'Bendy and dependable. A bigger net for chasing.' },
  { id: 'sunset', name: 'Sunset Rod', color: '#ff7a5c', price: 350, net: 19, gain: 0.38, luck: 0.12, wait: 0.8,
    blurb: 'Painted the colour of the sky. Fish seem to like it.' },
  { id: 'star', name: 'Star Rod', color: '#b89cff', price: 1000, net: 22, gain: 0.43, luck: 0.25, wait: 0.7,
    blurb: 'Hums quietly at night. Rare fish can\'t resist it.' },
];

const BUCKETS = [
  { cap: 6, price: 0, name: 'Tin pail' },
  { cap: 12, price: 110, name: 'Big bucket' },
  { cap: 24, price: 400, name: 'Cooler' },
];
