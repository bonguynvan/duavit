// OBS / projector view of a room: read-only, no host rights, no controls.
import { RaceView } from './raceView.js';
import { createSoundDirector, sound, soundForEffect } from './audio.js';
import { messageNode } from './chat.js';
import { roomCode, socket } from './net.js';

const $ = (id) => document.getElementById(id);
const MAX_LANES = 12;
const CHAT_MAX = 5;
const CHAT_TTL_MS = 9000;

let state = null;
const raceView = new RaceView($('race-canvas'), { showNames: true, maxLanes: MAX_LANES, drawResults: true });
sound.init({ defaultOn: true }); // OBS captures the page audio
const directSound = createSoundDirector();

$('live-code').textContent = roomCode;
$('live-qr').src = `/r/${roomCode}/qr.svg`;

function render() {
  if (!state) return;
  const racing = state.phase !== 'lobby' && state.race;
  $('live-lobby').hidden = Boolean(racing);
  $('live-title').textContent = state.title || 'Cuộc đua sắp bắt đầu';
  const racers = state.players.filter((p) => !p.spectator).length;
  $('live-count').textContent = `${racers} tay đua đã vào phòng`;
  directSound(state, raceView.clockOffset);
  if (racing) {
    raceView.showNames = state.race.racers.length <= MAX_LANES;
    raceView.setState(state);
    raceView.start();
  } else {
    raceView.stop();
  }
}

socket.on('state', (next) => {
  state = next;
  render();
});
socket.on('race', (frame) => {
  if (!state) return;
  state = { ...state, ...frame };
  render();
});
socket.on('fx', (fx) => {
  raceView.addEffect(fx);
  soundForEffect(fx);
});
socket.on('chat:message', (message) => {
  const node = messageNode(message);
  $('live-chat').append(node);
  while ($('live-chat').children.length > CHAT_MAX) $('live-chat').firstElementChild.remove();
  setTimeout(() => node.classList.add('leaving'), CHAT_TTL_MS);
  setTimeout(() => node.remove(), CHAT_TTL_MS + 600);
});
