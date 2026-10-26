// /cong-bang: live SHA-256 and seeded-rng demos, using the same code as the races.
import { isSeed, newSeed, rngFromSeed, sha256Hex } from '/shared/fair.js';

const $ = (id) => document.getElementById(id);
const SAMPLE_COUNT = 5;

async function showSha() {
  $('sha-output').textContent = await sha256Hex($('sha-input').value);
}

async function showSeed() {
  const seed = $('seed-input').value.trim().toLowerCase();
  if (!isSeed(seed)) {
    $('seed-hash').textContent = 'Seed cần đúng 64 ký tự 0-9, a-f.';
    $('seed-numbers').textContent = '…';
    return;
  }
  const rng = rngFromSeed(seed);
  $('seed-numbers').textContent = Array.from({ length: SAMPLE_COUNT }, () => rng().toFixed(6)).join('  ');
  $('seed-hash').textContent = await sha256Hex(seed);
}

function freshSeed() {
  $('seed-input').value = newSeed();
  showSeed();
}

$('sha-input').addEventListener('input', showSha);
$('seed-input').addEventListener('input', showSeed);
$('seed-new').addEventListener('click', freshSeed);
showSha();
freshSeed();
