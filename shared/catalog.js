// Shared between server (Node) and browser (served at /shared/catalog.js).

export const ANIMALS = [
  { id: 'horse', name: 'Ngựa', color: '#9a5b2e' },
  { id: 'rabbit', name: 'Thỏ', color: '#efe7da' },
  { id: 'turtle', name: 'Rùa', color: '#3f9d4a' },
  { id: 'cat', name: 'Mèo', color: '#f0a35e' },
  { id: 'dog', name: 'Chó', color: '#c9a27a' },
  { id: 'pig', name: 'Heo', color: '#f5a9bc' },
  { id: 'penguin', name: 'Cánh cụt', color: '#2b2d42' },
  { id: 'camel', name: 'Lạc đà', color: '#d8ad5f' },
  { id: 'tiger', name: 'Hổ', color: '#f28c28' },
  { id: 'fox', name: 'Cáo', color: '#e8692c' },
  { id: 'cow', name: 'Bò', color: '#f7f3ea' },
  { id: 'chicken', name: 'Gà', color: '#fff4dc' },
  { id: 'duck', name: 'Vịt', color: '#ffd23f' },
  { id: 'elephant', name: 'Voi', color: '#a7b1c2' },
  { id: 'frog', name: 'Ếch', color: '#6cc04a' },
  { id: 'mouse', name: 'Chuột', color: '#b8b2a7' },
  { id: 'tank', name: 'Xe tăng 390', color: '#55703f', group: 'saigon' },
  { id: 'tank843', name: 'Xe tăng 843', color: '#4f6a45', group: 'saigon' },
  { id: 'helicopter', name: 'Trực thăng', color: '#5f6b4e', group: 'saigon' },
  { id: 'palace', name: 'Dinh mini', color: '#f4f1ea', group: 'saigon' },
  // Map-exclusive characters (`maps`): only offered on those maps.
  { id: 'giong', name: 'Thánh Gióng', color: '#6b6f78', maps: ['denhung'] },
  { id: 'dragon', name: 'Rồng', color: '#3f9d6a', maps: ['denhung'] },
  { id: 'lacBird', name: 'Chim Lạc', color: '#c94f3d', maps: ['denhung'] },
  { id: 'nineTuskElephant', name: 'Voi chín ngà', color: '#a7b1c2', maps: ['denhung'] },
  { id: 'excavator', name: 'Xe xúc', color: '#f2b705', maps: ['congtruong'] },
  { id: 'roller', name: 'Xe lu', color: '#f28c28', maps: ['congtruong'] },
  { id: 'forklift', name: 'Xe nâng', color: '#ff7a1a', maps: ['congtruong'] },
  { id: 'worker', name: 'Công nhân', color: '#2d5aa0', maps: ['congtruong'] },
  { id: 'cyclo', name: 'Xích lô', color: '#c94f3d', maps: ['badinh'] },
  { id: 'flowerBike', name: 'Xe đạp hoa', color: '#2f6b4f', maps: ['badinh'] },
  { id: 'tram', name: 'Tàu điện', color: '#b5523b', maps: ['badinh'] },
  { id: 'vespa', name: 'Vespa', color: '#8fd3c8', maps: ['badinh'] },
];

export const MAPS = [
  {
    id: 'meadow', name: 'Đồng cỏ', trackLength: 640,
    palette: { skyTop: '#7ec8f2', skyBottom: '#d6f0ff', ground: '#6dbb4f', laneA: '#c99a5b', laneB: '#bf8f50', line: '#fff6e5' },
  },
  {
    id: 'desert', name: 'Sa mạc', trackLength: 720,
    palette: { skyTop: '#ffb15e', skyBottom: '#ffe3a8', ground: '#e8b86d', laneA: '#f2cf8d', laneB: '#e9c27c', line: '#fff6e5' },
  },
  {
    id: 'snow', name: 'Băng tuyết', trackLength: 660,
    palette: { skyTop: '#9fb8d9', skyBottom: '#eef4fb', ground: '#f4f8fc', laneA: '#dfe9f4', laneB: '#d3e0ee', line: '#7f9bbf' },
  },
  {
    id: 'beach', name: 'Bãi biển', trackLength: 600,
    palette: { skyTop: '#4fc3e8', skyBottom: '#c9f1ff', ground: '#f7dc9c', laneA: '#f3d38a', laneB: '#eccb7e', line: '#ffffff' },
  },
  {
    id: 'farm', name: 'Nông trại', trackLength: 680,
    palette: { skyTop: '#8fd3ff', skyBottom: '#fff1c9', ground: '#86c25a', laneA: '#9b6b43', laneB: '#8e613b', line: '#ffe9b8' },
  },
];

/** Cosmetic accessories: free, shown above the animal's head, never affect speed. */
export const ITEMS = [
  { id: 'shoes', name: 'Giày tăng tốc', icon: '👟' },
  { id: 'bull', name: 'Nước tăng lực', icon: '🥫' },
  { id: 'brick', name: 'Gạch', icon: '🧱', throwable: true },
  { id: 'rock', name: 'Đá', icon: '🪨', throwable: true },
  { id: 'banana', name: 'Vỏ chuối', icon: '🍌', throwable: true },
  { id: 'crown', name: 'Vương miện', icon: '👑' },
  { id: 'shades', name: 'Kính râm', icon: '🕶️' },
  { id: 'rocket', name: 'Tên lửa', icon: '🚀' },
  { id: 'balloon', name: 'Bóng bay', icon: '🎈' },
  { id: 'magnet', name: 'Nam châm', icon: '🧲' },
  { id: 'clover', name: 'Cỏ 4 lá', icon: '🍀' },
  { id: 'flag', name: 'Cờ đỏ', icon: '🚩' },
];

/** Emoji anyone in the room can float over the race. */
MAPS.push({
  id: 'saigon', name: 'Dinh Độc Lập', trackLength: 700,
  allowedAnimals: ['tank', 'tank843', 'helicopter', 'palace'], // vehicles + the mini palace only
  special: true, // 30/4 theme: hidden on the public site unless the host turns special maps on
  finish: 'palace-gate', // the finish line is the palace gate
  palette: { skyTop: '#5bb8f0', skyBottom: '#dff3ff', ground: '#cdbb98', laneA: '#71757e', laneB: '#676b74', line: '#f7f7f7' },
});

MAPS.push(
  {
    id: 'denhung', name: 'Đền Hùng', trackLength: 680,
    allowedAnimals: ['giong', 'dragon', 'lacBird', 'nineTuskElephant'],
    finish: 'temple-drum', // a bronze drum booms when the first racer arrives
    cheers: ['Con Rồng cháu Tiên!', 'Uống nước nhớ nguồn', 'Tùng! Tùng! Tùng!'],
    palette: { skyTop: '#8fd3ff', skyBottom: '#fff1c9', ground: '#86c25a', laneA: '#c9a26b', laneB: '#bf9760', line: '#fff6e5' },
  },
  {
    id: 'congtruong', name: 'Công trường', trackLength: 660,
    allowedAnimals: ['excavator', 'roller', 'forklift', 'worker'],
    finish: 'ribbon', // ribbon-cutting at the finish
    cheers: ['Lao động là vinh quang!', 'Tăng ca không bằng tăng tốc!', 'An toàn là bạn!'],
    palette: { skyTop: '#a8c8e0', skyBottom: '#f2efe6', ground: '#b9a98a', laneA: '#9a9a96', laneB: '#8f8f8b', line: '#ffd23f' },
  },
  {
    id: 'badinh', name: 'Ba Đình', trackLength: 700,
    allowedAnimals: ['cyclo', 'flowerBike', 'tram', 'vespa'],
    finish: 'flag-raise', // the flag goes up the pole + fireworks
    cheers: ['Độc lập – Tự do – Hạnh phúc', 'Không có gì quý hơn độc lập, tự do', 'Hà Nội mùa thu!'],
    palette: { skyTop: '#7ec8f2', skyBottom: '#e9f6ff', ground: '#9ccf63', laneA: '#8a8d93', laneB: '#80838a', line: '#ffffff' },
  },
);

export const REACTIONS = ['👏', '😂', '🔥', '😱', '❤️', '🐢', '🚀', '🍀'];

export const FACE_COLORS = ['#ff5a36', '#18a999', '#5b6cff', '#ff9f1c', '#c840e9', '#e63973', '#2d9cdb', '#7ac74f', '#8d6e63', '#ef476f'];

export const RULES = {
  baseSpeed: 8, // average units/s -> ~75-90s per 600-720 unit track
  speedSpread: 3, // each new target speed is base +/- spread
  formSpread: 0.05, // hidden random form: multiplier in 1 +/- spread
  formShiftChance: 0.12, // per speed change: chance the hidden form is re-rolled (comebacks!)
  accel: 3, // how fast speed approaches its target (1/s)
  changeMinMs: 400,
  changeMaxMs: 1400,
  burstChance: 0.1,
  burstFactor: 1.45,
  stumbleChance: 0.08,
  stumbleFactor: 0.55,
  // Gentle pack effect so nobody runs away or gets stranded; switched off for the final sprint.
  catchUpStrength: 0.18, // max +/- speed change when far from the pack
  catchUpRangeM: 30, // metres from the pack median where the effect reaches full strength
  finalSprintShare: 0.15, // last 15% of the track: purely random, no pack effect
  countdownMs: 3000,
  maxRaceMs: 240000,
  // Host-picked race length (seconds of average running time). null = use the map's own track length.
  durationChoices: [30, 60, 90, 120, 180],
  reactCooldownMs: 500,
  maxPlayers: 300, // lobby is effectively unlimited; this only guards against spam
  raceSlots: 20, // racers per round; everyone else waits for the next one
  maxBots: 10,
  nameMaxLength: 20,
  titleMaxLength: 60,
  maxItems: 3,
  throwCooldownMs: 2500,
  chatMaxLength: 200,
  chatCooldownMs: 800,
  chatHistory: 50,
  lobbyDisconnectGraceMs: 15 * 60 * 1000, // phones lock their screens a lot; keep their slot
};

export const findAnimal = (id) => ANIMALS.find((a) => a.id === id);
export const findMap = (id) => MAPS.find((m) => m.id === id);
export const findItem = (id) => ITEMS.find((i) => i.id === id);

/** Track length for a race: the map's default, or sized so an average racer needs `seconds`. */
export const trackLengthFor = (map, seconds) => (seconds ? Math.round(RULES.baseSpeed * seconds) : map.trackLength);

/** Safety cut-off for a race: generous room for the slowest racer on long tracks. */
export const maxRaceMsFor = (trackLength) => Math.max(RULES.maxRaceMs, (trackLength / RULES.baseSpeed) * 2500);

/** Animals a map allows (most maps: all of them). */
export const allowedAnimals = (map) =>
  map?.allowedAnimals
    ? ANIMALS.filter((a) => map.allowedAnimals.includes(a.id))
    : ANIMALS.filter((a) => !a.maps); // map-exclusive characters stay on their own map
export const isAnimalAllowed = (map, animalId) => allowedAnimals(map).some((a) => a.id === animalId);

/**
 * Tabs of the character picker, in display order. A character's group is its `group`, else the map it
 * belongs to (`maps`), else 'animals'. New themed maps/characters add a group here.
 */
export const CHARACTER_GROUPS = [
  { id: 'animals', name: 'Động vật', icon: '🐾' },
  { id: 'saigon', name: '30/4', icon: '⭐' },
  { id: 'denhung', name: 'Đền Hùng', icon: '🥁' },
  { id: 'congtruong', name: 'Công trường', icon: '🏗️' },
  { id: 'badinh', name: 'Ba Đình', icon: '🏛️' },
];
export const groupOf = (animal) => animal.group ?? animal.maps?.[0] ?? 'animals';

/** The picker's tabs for a map: only groups with characters the map allows, each with those characters. */
export function characterGroups(map) {
  const allowed = allowedAnimals(map);
  return CHARACTER_GROUPS
    .map((group) => ({ ...group, animals: allowed.filter((a) => groupOf(a) === group.id) }))
    .filter((group) => group.animals.length > 0);
}

/** Stand-in when someone's animal isn't allowed on the map: stable per player (seed), so it doesn't flicker. */
export function animalForMap(map, animalId, seed = 0) {
  if (isAnimalAllowed(map, animalId)) return animalId;
  const options = allowedAnimals(map);
  return options[Math.abs(seed) % options.length].id;
}

/** Hidden per-race random form. Every character has the same odds. */
export const randomForm = (rng) => 1 + (rng() * 2 - 1) * RULES.formSpread;

export function initialsOf(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return picked.map((w) => Array.from(w)[0].toUpperCase()).join('');
}
