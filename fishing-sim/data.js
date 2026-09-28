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

// -------------------------------------------------------------- the fish --
const RARITY = {
  junk:      { label: 'Junk',      weight: 9,  color: '#b8a89a', biteWindow: 1.0 },
  common:    { label: 'Common',    weight: 58, color: '#fff4e0', biteWindow: 0.95 },
  uncommon:  { label: 'Uncommon',  weight: 22, color: '#8fd19e', biteWindow: 0.85 },
  rare:      { label: 'Rare',      weight: 8,  color: '#7fb8e6', biteWindow: 0.75 },
  legendary: { label: 'Legendary', weight: 2.5, color: '#ffd23f', biteWindow: 0.65 },
};

const ALL_DAY = ['golden', 'sunset', 'dusk', 'night'];

// shape: 'fish' (default), 'round', 'eel', 'puffer', or map: 'boot' / 'can'
// pattern: none | stripes | spots | patches | stars | gradient
// diff: how hard the reeling minigame is (1 = sleepy, 6 = feral)
const FISH = [
  { id: 'boot', name: 'Soggy Boot', rarity: 'junk', price: 2, phases: ALL_DAY, diff: 0.6,
    size: [24, 30], map: 'boot',
    blurb: 'Somebody out there is hopping around on one foot.' },
  { id: 'can', name: 'Tin Can', rarity: 'junk', price: 1, phases: ALL_DAY, diff: 0.6,
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
// zone: width of the catch zone in the reel minigame (0..1 of the bar)
// gain: how fast the catch meter fills while the fish is in the zone
// luck: shifts odds toward rare fish and bigger sizes
// wait: multiplier on how long you wait for a bite
const RODS = [
  { id: 'twig', name: 'Twig Rod', color: '#7a4a2a', price: 0, zone: 0.2, gain: 0.3, luck: 0, wait: 1,
    blurb: 'A stick, some string, and a lot of hope.' },
  { id: 'bamboo', name: 'Bamboo Rod', color: '#c8a050', price: 90, zone: 0.24, gain: 0.34, luck: 0.05, wait: 0.9,
    blurb: 'Bendy and dependable. Wider catch zone.' },
  { id: 'sunset', name: 'Sunset Rod', color: '#ff7a5c', price: 350, zone: 0.28, gain: 0.38, luck: 0.12, wait: 0.8,
    blurb: 'Painted the colour of the sky. Fish seem to like it.' },
  { id: 'star', name: 'Star Rod', color: '#b89cff', price: 1000, zone: 0.32, gain: 0.43, luck: 0.25, wait: 0.7,
    blurb: 'Hums quietly at night. Rare fish can\'t resist it.' },
];

const BUCKETS = [
  { cap: 6, price: 0, name: 'Tin pail' },
  { cap: 12, price: 110, name: 'Big bucket' },
  { cap: 24, price: 400, name: 'Cooler' },
];
