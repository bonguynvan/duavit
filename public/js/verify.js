// Re-run a race from its published seed and check the commitment hash. No server involved.
import { RULES } from '/shared/catalog.js';
import { isSeed, sha256Hex } from '/shared/fair.js';
import { rankRacers } from '/shared/race.js';
import { simulateRace } from '/shared/simulate.js';
import { el, formatTime } from './ui.js';

const $ = (id) => document.getElementById(id);

function fill(proof) {
  $('seed-hash').value = proof.seedHash ?? '';
  $('seed').value = proof.seed ?? '';
  $('track-length').value = proof.trackLength ?? '';
  $('max-ms').value = proof.maxMs ?? RULES.maxRaceMs;
  $('entrants').value = (proof.entrants ?? []).join('\n');
}

function verdict(text, ok) {
  $('verdict').textContent = text;
  $('verdict').className = `verdict ${ok ? 'ok' : 'bad'}`;
}

async function verify() {
  const seed = $('seed').value.trim().toLowerCase();
  const expectedHash = $('seed-hash').value.trim().toLowerCase();
  const trackLength = Number($('track-length').value);
  const maxMs = Number($('max-ms').value) || RULES.maxRaceMs;
  // Entrant order matters (it decides who draws which random numbers); keep names verbatim.
  const entrants = $('entrants').value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!isSeed(seed)) return verdict('Seed không hợp lệ (cần 64 ký tự hex).', false);
  if (!(trackLength > 0) || entrants.length < 2) return verdict('Thiếu quãng đường hoặc danh sách tay đua.', false);

  const hash = await sha256Hex(seed);
  const hashOk = !expectedHash || hash === expectedHash;
  const { racers } = simulateRace({ seed, ids: entrants, trackLength, maxMs });
  $('replay').start = 1;
  $('replay').replaceChildren(...rankRacers(racers).map((r) => el('li', {}, `${r.id} `, el('small', {}, formatTime(r.finishedAt === null ? null : Math.round(r.finishedAt))))));
  if (!expectedHash) return verdict('⚠️ Đã chạy lại, nhưng chưa nhập mã cam kết để đối chiếu.', false);
  return hashOk
    ? verdict('✅ Mã cam kết khớp với seed. Thứ hạng dưới đây là kết quả duy nhất có thể có của cuộc đua này.', true)
    : verdict('❌ Mã cam kết KHÔNG khớp với seed: seed đã bị thay đổi sau khi công bố.', false);
}

$('proof-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file || file.size > 2_000_000) return;
  try {
    fill(JSON.parse(await file.text()));
    await verify();
  } catch {
    verdict('File không đúng định dạng kiểm chứng.', false);
  }
});
$('verify').addEventListener('click', verify);
