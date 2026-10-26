import { findMap, MAPS } from '/shared/catalog.js';
import { el } from './net.js';

const PHASE_LABEL = { lobby: 'Đang chờ host', countdown: 'Sắp xuất phát', racing: 'Đang đua', finished: 'Vừa đua xong' };

function statusOf(p, state) {
  if (!p.connected) return 'mất kết nối';
  if (p.inRace && state.phase !== 'lobby') return state.phase === 'finished' ? 'vừa đua' : 'đang đua';
  if (p.queuePos === null) return '';
  return p.queuePos <= state.raceSlots ? 'lượt tới' : `chờ #${p.queuePos}`;
}

function row(p, state, myId) {
  return el('li', { class: `${p.id === myId ? 'me' : ''}${p.connected ? '' : ' off'}` },
    el('span', { class: 'face', style: { background: p.color }, 'aria-hidden': 'true' }, p.initials),
    el('span', { class: 'rp-name' }, p.name, p.isBot ? el('small', {}, ' · bot') : null, p.isManual ? el('small', {}, ' · host thêm') : null),
    el('small', { class: 'rp-status' }, statusOf(p, state)));
}

/**
 * Room overview: racers (in queue order) and the audience.
 * Rebuilt only when something visible changes, not on every 20 Hz race frame.
 */
export function createRoomPanel(root) {
  const $ = (id) => root.querySelector(`#${id}`);
  let signature = '';

  return {
    update(state, myId) {
      const next = [state.phase, state.title, state.mapId, ...state.players.map((p) => `${p.id}:${p.name}:${p.connected}:${p.spectator}:${p.queuePos}:${p.inRace}`)].join('|');
      if (next === signature) return;
      signature = next;

      const map = findMap(state.mapId) ?? MAPS[0];
      $('rp-title').textContent = state.title || 'Phòng đua';
      $('rp-meta').textContent = `🗺 ${map.name} · ${PHASE_LABEL[state.phase] ?? ''}`;

      const byQueue = (a, b) => Number(b.inRace) - Number(a.inRace) || (a.queuePos ?? Infinity) - (b.queuePos ?? Infinity);
      const racers = state.players.filter((p) => !p.spectator).sort(byQueue);
      const audience = state.players.filter((p) => p.spectator);
      $('rp-racer-count').textContent = `(${racers.length})`;
      $('rp-audience-count').textContent = `(${audience.length})`;
      $('rp-racers').replaceChildren(...racers.map((p) => row(p, state, myId)));
      $('rp-audience').replaceChildren(...audience.map((p) => row(p, state, myId)));
      $('rp-audience-empty').hidden = audience.length > 0;
    },
  };
}
