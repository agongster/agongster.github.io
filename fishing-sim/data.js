// Tiny Tides — game content.
// Everything tunable lives here: the sky palettes, every fish, every piece of
// clothing, and the fishing gear. Change a number or a colour here and the
// rest of the game picks it up.

const OUTLINE = '#2a1a2e';

// ---------------------------------------------------------------- the sky --
// The day loops sunrise -> day -> golden hour -> sunset -> dusk -> night -> ...
// Each phase lasts PHASE_SECONDS; the last 30% of a phase blends into the next.
// sunX / sunY: where the sun sits (it travels left to right across the day).
const PHASE_SECONDS = 65;

const PHASES = [
  {
    id: 'sunrise', arrive: 'Good morning! The sun is rising', name: 'Sunrise',
    sky: ['#4a5a9a', '#8a74b0', '#d890b0', '#ffb0a0', '#ffc8a0', '#ffe0b0', '#fff0d0'],
    water: ['#e8b0b8', '#a88ab8', '#6a6aa0', '#443e78'],
    refl: '#ffe8c0', sun: '#ffe0b0', sunX: 84, sunY: 80,
    hillsFar: '#b08ab0', hills: '#7a5a90', cloud: '#ffe8e0', cloudShade: '#f0a8b8',
    stars: 0.12, lamp: 0.3, moon: 0, night: 0.1,
  },
  {
    id: 'day', arrive: 'Bright blue skies. Day fish are out!', name: 'Daytime',
    sky: ['#5aa0e0', '#6eaee6', '#86bcec', '#9ecaf0', '#b6d8f2', '#cee6f2', '#e6f2ee'],
    water: ['#8ad0e0', '#5aaad0', '#3a82b4', '#2a5a8e'],
    refl: '#ffffff', sun: '#fff8e0', sunX: 150, sunY: 24,
    hillsFar: '#9ac4b4', hills: '#6a9a7e', cloud: '#ffffff', cloudShade: '#cce0f4',
    stars: 0, lamp: 0, moon: 0, night: 0,
  },
  {
    id: 'golden', arrive: 'The light turns golden', name: 'Golden hour',
    sky: ['#7a64b0', '#a672b8', '#e08aa8', '#f7a88a', '#ffc88a', '#ffe0a0', '#fff0c4'],
    water: ['#f2a8a0', '#c47aa8', '#8a5a9a', '#5e3f7e'],
    refl: '#fff3c4', sun: '#fff3c4', sunX: 205, sunY: 58,
    hillsFar: '#d58aa6', hills: '#a0508a', cloud: '#fff0dc', cloudShade: '#f5a8a0',
    stars: 0, lamp: 0, moon: 0, night: 0,
  },
  {
    id: 'sunset', arrive: 'The sun is setting...', name: 'Sunset',
    sky: ['#3d2a6b', '#7a3a7a', '#c4507a', '#f0706a', '#ff9a5c', '#ffc05c', '#ffe08a'],
    water: ['#e8808a', '#a24c86', '#62306e', '#3e2256'],
    refl: '#ffd27a', sun: '#ffd27a', sunX: 228, sunY: 84,
    hillsFar: '#b0507a', hills: '#7a3470', cloud: '#ffc4a4', cloudShade: '#e0708a',
    stars: 0.1, lamp: 0.4, moon: 0, night: 0.15,
  },
  {
    id: 'dusk', arrive: 'Dusk settles in. Night fish are stirring!', name: 'Dusk',
    sky: ['#1e1a45', '#3a2560', '#6a3070', '#a8407a', '#e0607a', '#f59070', '#ffb880'],
    water: ['#9a5282', '#5e306a', '#34204e', '#221638'],
    refl: '#ff9a6a', sun: '#ff9a6a', sunX: 236, sunY: 104,
    hillsFar: '#6a3070', hills: '#3a2458', cloud: '#c47aa0', cloudShade: '#7a4a8a',
    stars: 0.55, lamp: 1, moon: 0.35, night: 0.55,
  },
  {
    id: 'night', arrive: 'Night has fallen. The stars are out', name: 'Night',
    sky: ['#0e0e2a', '#141440', '#1c1a50', '#26205c', '#342866', '#44306e', '#553876'],
    water: ['#3a2e6a', '#241e50', '#16123a', '#0e0b28'],
    refl: '#efe6ff', sun: '#ff9a6a', sunX: 84, sunY: 140,
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
    tint: null, map: { x: 22, y: 80 },
    blurb: 'Home sweet home. A creaky dock, a lantern, and a lighthouse winking across the water.' },
  { id: 'lagoon', name: 'Lily Lagoon', need: 12, platform: 'boat', landmark: 'willow', props: 'lilies',
    tint: { sky: '#ffb4d4', water: '#78c8a0', amount: 0.24 }, map: { x: 40, y: 42 },
    blurb: 'A still, pink lagoon full of lily pads, under a sleepy old willow.' },
  { id: 'cove', name: 'Coral Cove', need: 30, platform: 'boat', landmark: 'palms', props: 'coral',
    tint: { sky: '#ffc880', water: '#30b8c4', amount: 0.34 }, map: { x: 72, y: 72 },
    blurb: 'Warm, clear sea over pink coral. Watch out for pinchy things.' },
  { id: 'bay', name: 'Aurora Bay', need: 55, platform: 'boat', landmark: 'icebergs', props: 'ice',
    tint: { sky: '#a8d8ff', water: '#7aaae0', amount: 0.32 }, map: { x: 82, y: 20 },
    blurb: 'Far to the north. Icebergs, snowflakes, and ribbons of light at night.' },
  { id: 'blossom', name: 'Blossom River', need: 80, platform: 'boat', landmark: 'sakura', props: 'petals',
    tint: { sky: '#ffc4dc', water: '#a4c8e8', amount: 0.26 }, map: { x: 114, y: 46 },
    blurb: 'A slow river under cherry trees. Petals land on the water like tiny boats.' },
  { id: 'ember', name: 'Ember Isle', need: 110, platform: 'boat', landmark: 'volcano', props: 'embers',
    tint: { sky: '#ff9a6a', water: '#3a6a78', amount: 0.3 }, map: { x: 136, y: 80 },
    blurb: 'A sleepy volcano puffs smoke rings. The water is warm and a little sparkly.' },
  { id: 'cloud', name: 'Cloud Lake', need: 150, platform: 'boat', landmark: 'floating', props: 'mist',
    tint: { sky: '#c4e2ff', water: '#a4d4ff', amount: 0.36 }, map: { x: 140, y: 16 },
    blurb: 'A lake so still it holds the sky. Little islands float overhead.' },
];

// -------------------------------------------------------------- the fish --
// reel: how each tier fights on the line. speed scales how fast it swims,
// gain how fast the catch bar fills while it's in your net, drain how fast
// the bar empties while it's out.
const RARITY = {
  junk:      { label: 'Junk',      weight: 9,  color: '#b8a89a', biteWindow: 1.0,  reel: { speed: 0.7,  gain: 1.4,  drain: 0.6 } },
  common:    { label: 'Common',    weight: 58, color: '#fff4e0', biteWindow: 0.95, reel: { speed: 1,    gain: 1,    drain: 1 } },
  uncommon:  { label: 'Uncommon',  weight: 22, color: '#8fd19e', biteWindow: 0.85, reel: { speed: 1.03, gain: 0.85, drain: 1.1 } },
  rare:      { label: 'Rare',      weight: 8,  color: '#7fb8e6', biteWindow: 0.75, reel: { speed: 1.06, gain: 0.72, drain: 1.2 } },
  legendary: { label: 'Legendary', weight: 2.5, color: '#ffd23f', biteWindow: 0.65, reel: { speed: 1.1,  gain: 0.6,  drain: 1.35 } },
  // weight 0: nothing is caught by being 'goat' tier alone; LeBron sets his own weight below
  goat:      { label: 'The GOAT', weight: 0, color: '#c79bf2', biteWindow: 0.8,  reel: { speed: 1.12, gain: 0.55, drain: 1.45 } },
};

const ALL_DAY = ['sunrise', 'day', 'golden', 'sunset', 'dusk', 'night'];
const EVERYWHERE = ['dock', 'lagoon', 'cove', 'bay', 'blossom', 'ember', 'cloud'];

// where: which locations it lives in (leave it out for Sunset Dock only)
// weight: optional fixed catch weight, overriding the rarity's (see LeBron)
// bottom: in the aquarium it walks along the sand instead of swimming
// unsellable: can never be sold, only kept in the tank (where he always fits)
// shape: 'fish' (default), 'round', 'eel', 'puffer', or map: a pixel map in sprites.js
// pattern: none | stripes | spots | patches | stars | gradient
// diff: how hard it fights on the line (1 = sleepy, 6 = feral)
const FISH = [
  { id: 'boot', name: 'Soggy Boot', rarity: 'junk', price: 2, phases: ALL_DAY, diff: 0.6, where: EVERYWHERE,
    size: [24, 30], map: 'boot', bottom: true,
    blurb: 'Somebody out there is hopping around on one foot.' },
  { id: 'can', name: 'Tin Can', rarity: 'junk', price: 1, phases: ALL_DAY, diff: 0.6, where: EVERYWHERE,
    size: [8, 12], map: 'can', bottom: true,
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
    size: [8, 20], map: 'crab', bottom: true,
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
  { id: 'bottle', name: 'Message in a Bottle', rarity: 'junk', price: 25, phases: ALL_DAY, diff: 0.6, where: ['cove', 'bay', 'cloud'],
    size: [20, 25], map: 'bottle', bottom: true,
    blurb: 'It says: "If found, please go fishing more." Wise words.' },
  // ---- more Sunset Dock
  { id: 'darter', name: 'Dewdrop Darter', rarity: 'common', price: 8, phases: ['sunrise', 'day'], diff: 1.1,
    size: [3, 8], len: 9, h: 4, pattern: 'none',
    body: '#a8e0ff', belly: '#ffffff', fin: '#7ac0f0', accent: '#7ac0f0',
    blurb: 'Made mostly of morning dew and enthusiasm.' },
  { id: 'bluegill', name: 'Buttercup Bluegill', rarity: 'common', price: 12, phases: ['day', 'golden'], diff: 1.4,
    size: [10, 22], len: 11, h: 9, shape: 'round', pattern: 'stripes',
    body: '#ffd86a', belly: '#fff4c0', fin: '#7fb8e6', accent: '#e8b848',
    blurb: 'Hold it under your chin to see if you like butter.' },
  { id: 'rainbowtrout', name: 'Pastel Rainbow Trout', rarity: 'uncommon', price: 42, phases: ['sunrise', 'day'], diff: 2.6,
    size: [25, 55], len: 17, h: 7, pattern: 'gradient',
    body: '#8fd1e0', belly: '#fff4f8', fin: '#c79bf2', accent: '#ff9ec4',
    blurb: 'Someone left the rainbow in the wash with a pink sock.' },
  { id: 'grandpacarp', name: 'Grandpa Carp', rarity: 'rare', price: 140, phases: ['day', 'dusk'], diff: 3.6,
    size: [60, 110], len: 20, h: 10, pattern: 'spots', whiskers: true,
    body: '#a08060', belly: '#e8d8b8', fin: '#7a5a40', accent: '#6a4a30',
    blurb: 'Has lived in this pond for 80 years. Tells the same three stories.' },

  // ---- more Lily Lagoon
  { id: 'danio', name: 'Dragonfly Danio', rarity: 'common', price: 11, phases: ['sunrise', 'day'], diff: 1.2, where: ['lagoon'],
    size: [3, 7], len: 10, h: 4, pattern: 'stripes',
    body: '#7fd0f0', belly: '#e8f8ff', fin: '#4a8ad0', accent: '#4a8ad0',
    blurb: 'Zips around like it has somewhere very important to be.' },
  { id: 'gourami', name: 'Rosy Gourami', rarity: 'common', price: 15, phases: ['day', 'golden', 'sunset'], diff: 1.5, where: ['lagoon'],
    size: [8, 14], len: 12, h: 8, pattern: 'gradient',
    body: '#ffb0a0', belly: '#fff0ea', fin: '#ff7aa0', accent: '#ff7aa0',
    blurb: 'Blows little bubble nests and is very proud of them.' },
  { id: 'mudskipper', name: 'Mossy Mudskipper', rarity: 'uncommon', price: 44, phases: ALL_DAY, diff: 2.4, where: ['lagoon'],
    size: [10, 20], len: 16, shape: 'eel', pattern: 'spots',
    body: '#8a9a60', belly: '#d8e0b0', fin: '#6a7a40', accent: '#5a6a30',
    blurb: 'Half fish, half frog, fully confused about which.' },
  { id: 'sturgeon', name: 'Sunrise Sturgeon', rarity: 'rare', price: 160, phases: ['sunrise'], diff: 3.9, where: ['lagoon'],
    size: [90, 180], len: 24, h: 6, pattern: 'stripes',
    body: '#b8a0c8', belly: '#f0e8f8', fin: '#8a70a8', accent: '#9a80b8',
    blurb: 'Older than the dinosaurs. Still an early riser.' },

  // ---- more Coral Cove
  { id: 'tang', name: 'Tang Tang', rarity: 'common', price: 17, phases: ['day', 'golden'], diff: 1.5, where: ['cove'],
    size: [10, 25], len: 12, h: 9, shape: 'round', pattern: 'none',
    body: '#4a80e0', belly: '#6aa0f0', fin: '#ffd23f', accent: '#2a4aa0',
    blurb: 'Forgets things constantly. Very good at swimming, though.' },
  { id: 'parrotfish', name: 'Parrotfish Pop', rarity: 'common', price: 19, phases: ['sunrise', 'day', 'golden'], diff: 1.7, where: ['cove'],
    size: [20, 50], len: 14, h: 8, pattern: 'gradient',
    body: '#5ad0a0', belly: '#d0fff0', fin: '#ff8ab0', accent: '#ff8ab0',
    blurb: 'Chews coral and poops sand. That beach? Thank a parrotfish.' },
  { id: 'seahorse', name: 'Sea Pony', rarity: 'uncommon', price: 58, phases: ['sunrise', 'day', 'dusk'], diff: 2.3, where: ['cove'],
    size: [8, 18], map: 'seahorse',
    blurb: 'The dad carries the babies. Absolute legend.' },
  { id: 'octopus', name: 'Octo Pal', rarity: 'rare', price: 150, phases: ['dusk', 'night', 'day'], diff: 3.8, where: ['cove'],
    size: [30, 80], map: 'octopus',
    blurb: 'Has opened your tackle box twice already. Very clever. Very sneaky.' },

  // ---- more Aurora Bay
  { id: 'herring', name: 'Icicle Herring', rarity: 'common', price: 16, phases: ['day', 'sunrise', 'golden'], diff: 1.3, where: ['bay'],
    size: [15, 30], len: 12, h: 5, pattern: 'gradient',
    body: '#d0e8ff', belly: '#ffffff', fin: '#a0c0e8', accent: '#8ab0e0',
    blurb: 'So shiny you can see your own reflection in it.' },
  { id: 'flounder', name: 'Frosted Flounder', rarity: 'common', price: 18, phases: ['sunrise', 'day', 'sunset'], diff: 1.6, where: ['bay'],
    size: [20, 45], len: 14, h: 9, shape: 'round', pattern: 'spots',
    body: '#c8b8a0', belly: '#f0e8dc', fin: '#a89880', accent: '#8a7860',
    blurb: 'Both eyes on one side. It has made peace with this.' },
  { id: 'snowcrab', name: 'Snow Crab', rarity: 'uncommon', price: 62, phases: ALL_DAY, diff: 2.5, where: ['bay'],
    size: [10, 25], map: 'crab', bottom: true, pal: { p: '#f0e8ff', h: '#ffffff', l: '#b0b8e0', k: OUTLINE },
    blurb: 'Wears its own little snowsuit, all year round.' },
  { id: 'glaciersalmon', name: 'Glacier Salmon', rarity: 'rare', price: 175, phases: ['sunrise', 'day'], diff: 4, where: ['bay'],
    size: [50, 100], len: 18, h: 7, pattern: 'gradient',
    body: '#a8c0ff', belly: '#fff0f4', fin: '#8098e0', accent: '#ff9ab0',
    blurb: 'Swam here from a glacier. Refuses to talk about the journey.' },

  // ---- Blossom River
  { id: 'sakuraminnow', name: 'Sakura Minnow', rarity: 'common', price: 20, phases: ['sunrise', 'day', 'golden', 'sunset'], diff: 1.3, where: ['blossom'],
    size: [4, 9], len: 9, h: 5, pattern: 'none',
    body: '#ffc0d8', belly: '#fff4f8', fin: '#ff90b8', accent: '#ff90b8',
    blurb: 'Hides among fallen petals. You will never find it. Oh wait, there it is.' },
  { id: 'mochicarp', name: 'Mochi Carp', rarity: 'common', price: 24, phases: ALL_DAY, diff: 1.6, where: ['blossom'],
    size: [15, 30], len: 13, h: 10, shape: 'round', pattern: 'patches',
    body: '#fff4f0', belly: '#ffffff', fin: '#ffc0d0', accent: '#ffb0c8',
    blurb: 'Soft, round, squishy. Please do not eat it.' },
  { id: 'matchaloach', name: 'Matcha Loach', rarity: 'common', price: 22, phases: ['day', 'dusk', 'night'], diff: 1.5, where: ['blossom'],
    size: [10, 20], len: 17, shape: 'eel', pattern: 'spots',
    body: '#9ac878', belly: '#e0f0c8', fin: '#6a9a50', accent: '#6a9a50',
    blurb: 'Slightly bitter. Very calming. Best enjoyed slowly.' },
  { id: 'lanterngold', name: 'Lantern Goldfish', rarity: 'uncommon', price: 70, phases: ['dusk', 'night'], diff: 2.6, where: ['blossom'],
    size: [8, 16], len: 12, h: 9, shape: 'round', pattern: 'gradient',
    body: '#ff7a3c', belly: '#ffe0a0', fin: '#ffd27a', accent: '#ffd23f',
    blurb: 'Glows like a paper lantern at the festival.' },
  { id: 'teakoi', name: 'Hojicha Koi', rarity: 'uncommon', price: 75, phases: ['sunrise', 'day', 'golden'], diff: 2.8, where: ['blossom'],
    size: [30, 70], len: 16, h: 8, pattern: 'patches',
    body: '#fff0dc', belly: '#fff8f0', fin: '#c09070', accent: '#8a5a3a',
    blurb: 'Roasted-tea brown and milky white. Pairs well with a nap.' },
  { id: 'cranefish', name: 'Paper Crane Fish', rarity: 'rare', price: 200, phases: ['day', 'sunset'], diff: 4.1, where: ['blossom'],
    size: [20, 40], len: 15, h: 6, pattern: 'stripes',
    body: '#f4efe6', belly: '#ffffff', fin: '#e0566e', accent: '#e0566e',
    blurb: 'Folded itself out of a wish somebody made at the river.' },
  { id: 'spiritkoi', name: 'Spirit Koi', rarity: 'legendary', price: 950, phases: ['night'], diff: 5.9, where: ['blossom'],
    size: [70, 120], len: 20, h: 9, pattern: 'stars',
    body: '#b8f0ff', belly: '#e8fcff', fin: '#88d8ff', accent: '#ffffff',
    blurb: 'You can see the moon through it. It is almost certainly a ghost.' },

  // ---- Ember Isle
  { id: 'cinderminnow', name: 'Cinder Minnow', rarity: 'common', price: 22, phases: ALL_DAY, diff: 1.5, where: ['ember'],
    size: [4, 10], len: 9, h: 5, pattern: 'spots',
    body: '#4a3a4a', belly: '#7a6070', fin: '#ff7a3c', accent: '#ff7a3c',
    blurb: 'Glows a little when it is happy. Always a little warm.' },
  { id: 'magmamolly', name: 'Magma Molly', rarity: 'common', price: 26, phases: ['day', 'golden', 'sunset', 'dusk'], diff: 1.7, where: ['ember'],
    size: [5, 12], len: 11, h: 8, shape: 'round', pattern: 'gradient',
    body: '#ff5a3a', belly: '#ffc070', fin: '#ffd23f', accent: '#ffd23f',
    blurb: 'Do not hold for too long. Oven mitts recommended.' },
  { id: 'obsidianeel', name: 'Obsidian Eel', rarity: 'uncommon', price: 80, phases: ['dusk', 'night', 'sunrise'], diff: 2.9, where: ['ember'],
    size: [50, 100], len: 22, shape: 'eel', pattern: 'stripes',
    body: '#2a2238', belly: '#5a4a68', fin: '#ff7a3c', accent: '#ff5a3a',
    blurb: 'Glossy, black, and dramatic. Probably writes poetry.' },
  { id: 'ashpuffer', name: 'Ash Puffer', rarity: 'uncommon', price: 78, phases: ['day', 'golden', 'sunset'], diff: 2.7, where: ['ember'],
    size: [10, 25], r: 5, shape: 'puffer', pattern: 'spots',
    body: '#8a8090', belly: '#c8c0d0', fin: '#ff7a3c', accent: '#ff5a3a',
    blurb: 'Puffs up in a little cloud of smoke. Very theatrical.' },
  { id: 'lavacrab', name: 'Lava Crab', rarity: 'rare', price: 220, phases: ALL_DAY, diff: 4, where: ['ember'],
    size: [15, 35], map: 'crab', bottom: true, pal: { p: '#ff5a3a', h: '#ffd23f', l: '#b8302a', k: OUTLINE },
    blurb: 'Its shell is still cooling. Please wait five business days.' },
  { id: 'phoenix', name: 'Phoenix Fin', rarity: 'legendary', price: 1100, phases: ['sunset', 'dusk'], diff: 6, where: ['ember'],
    size: [80, 150], len: 22, h: 9, pattern: 'gradient', bill: false,
    body: '#ff3a3a', belly: '#ffd080', fin: '#ffec80', accent: '#ffd23f',
    blurb: 'Every sunset it bursts into sparks and swims out of its own ashes.' },

  // ---- Cloud Lake
  { id: 'cloudguppy', name: 'Cloud Guppy', rarity: 'common', price: 26, phases: ALL_DAY, diff: 1.5, where: ['cloud'],
    size: [3, 7], len: 9, h: 5, pattern: 'none',
    body: '#ffffff', belly: '#e8f0ff', fin: '#b8d0ff', accent: '#b8d0ff',
    blurb: 'Fluffy. Weightless. Occasionally rains a little.' },
  { id: 'skysardine', name: 'Sky Sardine', rarity: 'common', price: 24, phases: ['sunrise', 'day', 'golden'], diff: 1.4, where: ['cloud'],
    size: [10, 20], len: 12, h: 4, pattern: 'gradient',
    body: '#8fc8ff', belly: '#ffffff', fin: '#6aa8e8', accent: '#ffffff',
    blurb: 'Swims in flocks shaped like birds, just to mess with the birds.' },
  { id: 'rainbowtetra', name: 'Rainbow Tetra', rarity: 'common', price: 28, phases: ['sunrise', 'day', 'sunset'], diff: 1.6, where: ['cloud'],
    size: [3, 6], len: 10, h: 5, pattern: 'stripes',
    body: '#ff9ec4', belly: '#fff4f8', fin: '#8fe0f0', accent: '#8fe0f0',
    blurb: 'Appears right after it rains. Collect all seven colours.' },
  { id: 'balloonpuffer', name: 'Balloon Puffer', rarity: 'uncommon', price: 85, phases: ['day', 'golden', 'dusk'], diff: 2.8, where: ['cloud'],
    size: [10, 30], r: 6, shape: 'puffer', pattern: 'spots',
    body: '#ffd0e0', belly: '#ffffff', fin: '#ffffff', accent: '#ff9ec4',
    blurb: 'Filled with helium. Hold on tight or it floats away.' },
  { id: 'thundertuna', name: 'Thunder Tuna', rarity: 'rare', price: 230, phases: ['day', 'sunset'], diff: 4.3, where: ['cloud'],
    size: [80, 160], len: 20, h: 9, pattern: 'stripes',
    body: '#5a6ab0', belly: '#e0e8ff', fin: '#ffd23f', accent: '#ffd23f',
    blurb: 'Fast as lightning, loud as thunder. Not great at hide and seek.' },
  { id: 'cometeel', name: 'Comet Eel', rarity: 'rare', price: 240, phases: ['night', 'dusk'], diff: 4.4, where: ['cloud'],
    size: [60, 130], len: 26, shape: 'eel', pattern: 'spots',
    body: '#3a3a8a', belly: '#6a6ab8', fin: '#fff3c4', accent: '#fff3c4',
    blurb: 'Leaves a sparkly tail behind it. Make a wish!' },
  { id: 'cloudwhale', name: 'Cloud Whale', rarity: 'legendary', price: 1300, phases: ['sunrise', 'day'], diff: 6, where: ['cloud'],
    size: [300, 600], map: 'whale',
    blurb: 'Sings a very low song that makes the clouds drift. It is a baby.' },

  // ---- ???
  { id: 'lebron', name: 'LeBron James', rarity: 'goat', price: 2323, phases: ALL_DAY, diff: 6.5, where: EVERYWHERE,
    weight: 0.35, size: [203, 206], map: 'lebron', bottom: true, unsellable: true,
    blurb: 'This is not a fish. This is LeBron James. Nobody knows how he got in the water. He seems fine with it. He is not for sale.' },
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

// -------------------------------------------------------------- the boat --
// Shown at every spot except the home dock (where it's tied up), while
// sailing, and on the sea chart. Everything with price 0 is free from the start.
// usesColor: the hull and stripe colours paint this style (others have their own look)
const BOAT_PARTS = {
  base: [
    { id: 'rowboat', name: 'Rowboat', price: 0, usesColor: true },
    { id: 'box', name: 'Cardboard box', price: 40 },
    { id: 'banana', name: 'Banana', price: 120 },
    { id: 'watermelon', name: 'Watermelon', price: 150 },
    { id: 'bathtub', name: 'Bathtub', price: 220, usesColor: true },
    { id: 'teacup', name: 'Teacup', price: 260, usesColor: true },
    { id: 'sneaker', name: 'Big sneaker', price: 300, usesColor: true },
    { id: 'swan', name: 'Swan boat', price: 400 },
    { id: 'duck', name: 'Duck parade', price: 600 },
  ],
  hull: [
    { id: 'coral', name: 'Coral', price: 0, color: '#e0566e' },
    { id: 'sky', name: 'Sky', price: 0, color: '#6aa8e0' },
    { id: 'mint', name: 'Mint', price: 0, color: '#5cc49a' },
    { id: 'cream', name: 'Cream', price: 30, color: '#f0dcc0' },
    { id: 'lilac', name: 'Lilac', price: 60, color: '#b48ae0' },
    { id: 'sunshine', name: 'Sunshine', price: 90, color: '#ffc83a' },
    { id: 'midnight', name: 'Midnight', price: 150, color: '#3e3a80' },
    { id: 'gold', name: 'Solid gold', price: 1500, color: '#ffd23f', shiny: true },
  ],
  trim: [
    { id: 'cream', name: 'Cream', price: 0, color: '#fff4e0' },
    { id: 'navy', name: 'Navy', price: 0, color: '#3a4a8a' },
    { id: 'pink', name: 'Pink', price: 20, color: '#ff9ec4' },
    { id: 'mint', name: 'Mint', price: 20, color: '#8fe0c0' },
    { id: 'gold', name: 'Gold', price: 60, color: '#ffd23f' },
  ],
  sail: [
    { id: 'plain', name: 'Plain sail', price: 0 },
    { id: 'stripes', name: 'Striped', price: 60 },
    { id: 'heart', name: 'Heart', price: 120 },
    { id: 'star', name: 'Star', price: 180 },
    { id: 'fish', name: 'Fish', price: 250 },
  ],
  flag: [
    { id: 'none', name: 'No flag', price: 0 },
    { id: 'pennant', name: 'Pennant', price: 30 },
    { id: 'heart', name: 'Heart flag', price: 80 },
    { id: 'pirate', name: 'Pirate', price: 150 },
    { id: 'fish', name: 'Fish flag', price: 200 },
  ],
  decor: [
    { id: 'none', name: 'Nothing', price: 0 },
    { id: 'fern', name: 'Potted fern', price: 50 },
    { id: 'flowers', name: 'Flower box', price: 70 },
    { id: 'duck', name: 'Rubber duck', price: 90 },
    { id: 'lights', name: 'String lights', price: 160 },
  ],
};

const BOAT_TABS = [
  { id: 'base', label: 'Style' },
  { id: 'hull', label: 'Colour' },
  { id: 'trim', label: 'Stripe' },
  { id: 'sail', label: 'Sail' },
  { id: 'flag', label: 'Flag' },
  { id: 'decor', label: 'Decor' },
];

const DEFAULT_BOAT = { base: 'rowboat', hull: 'coral', trim: 'cream', sail: 'plain', flag: 'none', decor: 'none' };

// ------------------------------------------------------------- the gear --
// net: radius of your net in the underwater chase (in pixels)
// gain: how fast the catch bar fills while the fish is in your net
// luck: shifts odds toward rare fish and bigger sizes
// wait: multiplier on how long fish take to notice your bobber
// net: radius of the chase net. gain: how fast the bar fills. tame: slows
// the fish down. grip: how much of the drain you feel when it slips out.
const RODS = [
  { id: 'twig', name: 'Twig Rod', color: '#7a4a2a', price: 0, net: 14, gain: 0.3, tame: 1, grip: 1, luck: 0, wait: 1,
    blurb: 'A stick, some string, and a lot of hope. Rare fish laugh at it.' },
  { id: 'bamboo', name: 'Bamboo Rod', color: '#c8a050', price: 90, net: 16, gain: 0.34, tame: 0.9, grip: 0.85, luck: 0.05, wait: 0.9,
    blurb: 'Bendy and dependable. A bigger net for chasing.' },
  { id: 'sunset', name: 'Sunset Rod', color: '#ff7a5c', price: 350, net: 21, gain: 0.45, tame: 0.8, grip: 0.68, luck: 0.12, wait: 0.8,
    blurb: 'Painted the colour of the sky. Fish tire out fast on it.' },
  { id: 'star', name: 'Star Rod', color: '#b89cff', price: 1000, net: 26, gain: 0.56, tame: 0.74, grip: 0.55, luck: 0.25, wait: 0.7,
    blurb: 'Hums quietly at night. Even legends come quietly.' },
];

const TANKS = [
  { cap: 6, price: 0, name: 'Fishbowl' },
  { cap: 12, price: 180, name: 'Glass tank' },
  { cap: 24, price: 600, name: 'Grand aquarium' },
];

// The aquarium canvas, in pixels, and where its sand starts.
const TANK_W = 240, TANK_H = 135, TANK_SAND = TANK_H - 14;

// Props for the tank, bought in the Shop and dragged into place in the Tank.
// w and h are the prop's size in tank pixels (the tank is 240 x 135). Props
// sit on the sand unless they float, which lets them go anywhere in the water.
// The pixel art for each one is drawDecor() in ui.js.
const DECOR = [
  { id: 'castle', name: 'Sandcastle', price: 0, w: 32, h: 44, blurb: 'Every tank starts with one.' },
  { id: 'chest', name: 'Treasure chest', price: 0, w: 16, h: 12, blurb: 'Burps a bubble now and then.' },
  { id: 'kelp', name: 'Kelp', price: 0, w: 8, h: 36, blurb: 'Sways in a current that isn\'t there.' },
  { id: 'starfish', name: 'Starfish', price: 25, w: 10, h: 5, blurb: 'Has been lying there all day. Living the dream.' },
  { id: 'pinkweed', name: 'Pink seaweed', price: 35, w: 8, h: 26, blurb: 'Kelp, but make it fashion.' },
  { id: 'coral', name: 'Peach coral', price: 60, w: 20, h: 20, blurb: 'Fish love hiding behind it.' },
  { id: 'clam', name: 'Pearl clam', price: 80, w: 16, h: 9, blurb: 'Opens up to show off its pearl.' },
  { id: 'sign', name: 'Welcome sign', price: 70, w: 20, h: 16, blurb: 'Says "home" in fish.' },
  { id: 'arch', name: 'Rock arch', price: 90, w: 34, h: 20, blurb: 'For swimming through, dramatically.' },
  { id: 'duck', name: 'Rubber duck', price: 120, w: 14, h: 11, float: true, blurb: 'Floats. Squeaks. Judges.' },
  { id: 'diver', name: 'Tiny diver', price: 150, w: 12, h: 18, blurb: 'Looking for treasure. It\'s right there.' },
  { id: 'jelly', name: 'Jellyfish lamp', price: 180, w: 12, h: 16, float: true, blurb: 'A gentle night light that drifts.' },
  { id: 'pineapple', name: 'Pineapple house', price: 200, w: 18, h: 28, blurb: 'Someone very cheerful lives here.' },
  { id: 'volcano', name: 'Bubble volcano', price: 220, w: 24, h: 16, blurb: 'Erupts in bubbles. Very safe.' },
  { id: 'wreck', name: 'Little shipwreck', price: 280, w: 46, h: 24, blurb: 'Nobody knows what happened. (A duck did it.)' },
  { id: 'trophy', name: 'GOAT trophy', price: 400, w: 14, h: 20, blurb: 'For the tank that has everything.' },
];
const DECOR_BY_ID = Object.fromEntries(DECOR.map(d => [d.id, d]));
const MAX_DECOR = 30;  // props placed in the tank at once

// The tank everyone starts with (and what older saves get): x is the prop's
// centre, y its bottom, both in tank pixels.
const STARTER_DECOR = [
  { id: 'kelp', x: 9, y: 121 }, { id: 'castle', x: 37, y: 121 }, { id: 'kelp', x: 71, y: 121 },
  { id: 'kelp', x: 151, y: 121 }, { id: 'chest', x: 198, y: 121 }, { id: 'kelp', x: 225, y: 121 },
];

