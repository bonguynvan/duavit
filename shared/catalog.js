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
  { id: 'nhaTho', name: 'Nhà thờ Đức Bà mini', color: '#c8613f', group: 'saigon' },
  { id: 'cotDien', name: 'Cột điện rối nùi', color: '#b9b4a8', group: 'saigon' },
  // Everyday people: on every regular map, in their own tab.
  { id: 'nongDan', name: 'Anh Hai Lúa', color: '#6b8f4e', group: 'people' },
  { id: 'xeBo', name: 'Bác Ba xe bò', color: '#4f7a8f', group: 'people' },
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
  // Playful look-alike heroes: our own drawings, just fun nicknames.
  { id: 'starShield', name: 'Đội trưởng Mễ', color: '#2d4fa0', maps: ['sieuanhhung'] },
  { id: 'nonLaHero', name: 'Siêu nhân Nón Lá', color: '#18a999', maps: ['sieuanhhung'] },
  { id: 'robot', name: 'Người sắt đồng nát', color: '#9aa0aa', maps: ['sieuanhhung'] },
  { id: 'ninja', name: 'Ninja ú òa', color: '#2b2d42', maps: ['sieuanhhung'] },
  { id: 'buiCay', name: 'Bụi cây biết nói', color: '#5fa04e', maps: ['sieuanhhung'] },
  { id: 'astronaut', name: 'Phi hành gia Cuội', color: '#f4f1ea', maps: ['vongquanh'] },
  { id: 'mummy', name: 'Xác ướp mất ngủ', color: '#efe4c8', maps: ['vongquanh'] },
  { id: 'cowboy', name: 'Cao bồi miền Tây', color: '#a0522d', maps: ['vongquanh'] },
  { id: 'flagBro', name: 'Anh trai cờ Mỹ', color: '#d62828', maps: ['vongquanh'] },
  { id: 'doubleDecker', name: 'Xe buýt Luân Đôn', color: '#d62828', maps: ['vongquanh'] },
  { id: 'banhMi', name: 'Bánh mì ổ bự', color: '#e3a04f', maps: ['chodem'] },
  { id: 'traSua', name: 'Trà sữa full topping', color: '#c8a27c', maps: ['chodem'] },
  { id: 'pho', name: 'Phở tái nạm', color: '#f7f3ea', maps: ['chodem'] },
  { id: 'saurieng', name: 'Sầu riêng thơm lừng', color: '#9bbf3a', maps: ['chodem'] },
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
  allowedAnimals: ['tank', 'tank843', 'helicopter', 'palace', 'nhaTho', 'cotDien'], // Saigon cast only
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
  {
    id: 'sieuanhhung', name: 'Phố siêu anh hùng', trackLength: 660,
    allowedAnimals: ['starShield', 'nonLaHero', 'robot', 'ninja', 'buiCay'],
    cheers: ['POW! BAM! VÈO!', 'Cứu thế giới xong rồi đua tiếp!', 'Siêu anh hùng về đích!'],
    palette: { skyTop: '#141a3d', skyBottom: '#4b3f8f', ground: '#3a3f4b', laneA: '#5a5f6b', laneB: '#525763', line: '#ffd23f' },
  },
  {
    id: 'vongquanh', name: 'Vòng quanh thế giới', trackLength: 720,
    allowedAnimals: ['astronaut', 'mummy', 'cowboy', 'flagBro', 'doubleDecker'],
    finish: 'ribbon',
    cheers: ['Bonjour! Hello! Xin chào!', 'Đi một ngày đàng, học một sàng khôn', 'Về đích là về nhà!'],
    palette: { skyTop: '#6ec6f5', skyBottom: '#e6f7ff', ground: '#9ccf63', laneA: '#d9c49a', laneB: '#cfb98d', line: '#ffffff' },
  },
  {
    id: 'chodem', name: 'Chợ đêm', trackLength: 640,
    allowedAnimals: ['banhMi', 'traSua', 'pho', 'saurieng'],
    cheers: ['Ăn gì cũng được, về nhất là được!', 'Nóng hổi vừa thổi vừa đua!', 'Chợ đêm vui quá trời!'],
    palette: { skyTop: '#1d1640', skyBottom: '#6a3d7a', ground: '#5c4a3a', laneA: '#7a6a58', laneB: '#706050', line: '#ffd23f' },
  },
);

// ---------------- Tết ----------------
ANIMALS.push(
  { id: 'lan', name: 'Ông Lân', color: '#d62828', maps: ['tet'] },
  { id: 'ongDia', name: 'Ông Địa', color: '#e9a23b', maps: ['tet'] },
  { id: 'banhChung', name: 'Bánh chưng', color: '#3f8f3a', maps: ['tet'] },
  { id: 'liXi', name: 'Bao lì xì', color: '#d62828', maps: ['tet'] },
  { id: 'chauMai', name: 'Chậu mai', color: '#f4f8fc', maps: ['tet'] },
  { id: 'ongDo', name: 'Ông đồ', color: '#7a4a2a', maps: ['tet'] },
  { id: 'aoDai', name: 'Cô Ba áo dài', color: '#d62828', maps: ['tet'] },
  { id: 'deCon', name: 'Dê con', color: '#f4f1ea', maps: ['tet'] },
);
MAPS.push({
  id: 'tet', name: 'Tết đến xuân về', trackLength: 680,
  allCharacters: true, // Tết event: every character from every map may join (new ones too)
  cheers: ['Chúc mừng năm mới!', 'An khang thịnh vượng', 'Vạn sự như ý', 'Xuân về rộn ràng!'],
  // Cream-gold track with red lines: the red Tết cast (lân, lì xì, áo dài) must stand out against it.
  palette: { skyTop: '#8fd3ff', skyBottom: '#fff1c9', ground: '#c94f3d', laneA: '#f2d9a6', laneB: '#ead09a', line: '#d62828' },
});

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
  map?.allCharacters
    ? ANIMALS
    : map?.allowedAnimals
    ? ANIMALS.filter((a) => map.allowedAnimals.includes(a.id))
    : ANIMALS.filter((a) => !a.maps); // map-exclusive characters stay on their own map
export const isAnimalAllowed = (map, animalId) => allowedAnimals(map).some((a) => a.id === animalId);

/**
 * Tabs of the character picker, in display order. A character's group is its `group`, else the map it
 * belongs to (`maps`), else 'animals'. New themed maps/characters add a group here.
 */
export const CHARACTER_GROUPS = [
  { id: 'animals', name: 'Động vật', icon: '🐾' },
  { id: 'people', name: 'Con người', icon: '👨‍🌾' },
  { id: 'saigon', name: '30/4', icon: '⭐' },
  { id: 'denhung', name: 'Đền Hùng', icon: '🥁' },
  { id: 'congtruong', name: 'Công trường', icon: '🏗️' },
  { id: 'badinh', name: 'Ba Đình', icon: '🏛️' },
  { id: 'sieuanhhung', name: 'Siêu anh hùng', icon: '🦸' },
  { id: 'vongquanh', name: 'Thế giới', icon: '🌍' },
  { id: 'chodem', name: 'Chợ đêm', icon: '🏮' },
  { id: 'tet', name: 'Tết', icon: '🧧' },
];
export const groupOf = (animal) => animal.group ?? animal.maps?.[0] ?? 'animals';

/**
 * The picker's tabs for a map: only groups with characters the map allows, each with those characters.
 * The map's own group (e.g. 'tet') comes first.
 */
export function characterGroups(map) {
  const allowed = allowedAnimals(map);
  return CHARACTER_GROUPS
    .map((group) => ({ ...group, animals: allowed.filter((a) => groupOf(a) === group.id) }))
    .filter((group) => group.animals.length > 0)
    .sort((a, b) => (b.id === map?.id) - (a.id === map?.id));
}

/**
 * The map as a room / quick race plays it: with `allCharacters` the host opened it to every character
 * of every map (maps like Tết are always open).
 */
export const withCast = (map, allCharacters) => (allCharacters && map && !map.allCharacters ? { ...map, allCharacters: true } : map);

/**
 * May a pick on `map` become the player's usual character (what ordinary maps give back)? Only an everyday
 * character picked where everyday characters are on offer: not Ông Lân, not a tank on the vehicles-only map.
 */
export const isEverydayPick = (map, animalId) => (!map?.allowedAnimals || Boolean(map?.allCharacters)) && !findAnimal(animalId)?.maps;

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
