// Procedural chiptune music + sound effects (Web Audio), plus optional per-map mp3 soundtracks.

const STORAGE_KEY = 'peti.sound';
const LOOKAHEAD_S = 0.12;
const SCHEDULER_MS = 25;
const STEPS_PER_BAR = 16;
// Mix: background music stays well under the sound effects and voices in the room.
const MASTER_VOLUME = 0.5;
const MUSIC_VOLUME = 0.35;
const MUSIC_PAUSED_VOLUME = 0.08;
const TRACK_VOLUME = 0.7; // an mp3 soundtrack is mastered loud already
const MUSIC_DIR = '/music';
export const QUIET_AFTER_FINISH_MS = 5000; // music stops this long after a race ends

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

// I–V–vi–IV in C: the happiest four chords there are.
const CHORDS = [
  [48, 52, 55],
  [43, 47, 50],
  [45, 48, 52],
  [41, 45, 48],
];

// Race lead line, one entry per 8th note (0 = rest), 4 bars.
const LEAD = [
  72, 76, 79, 76, 81, 79, 76, 74,
  74, 79, 83, 79, 81, 79, 74, 71,
  72, 76, 81, 76, 84, 81, 79, 76,
  77, 81, 79, 77, 76, 74, 72, 0,
];

const SONGS = {
  lobby: {
    bpm: 96,
    step(play, bar, s) {
      const chord = CHORDS[bar % 4];
      if (s % 8 === 0) play.tone('triangle', chord[0] - 12, 6, 0.32);
      if (s % 2 === 0) play.tone('triangle', chord[(s / 2) % 3] + 12, 1.6, 0.1);
      if (s === 4 || s === 12) play.noise(0.05, 7000, 0.04);
    },
  },
  race: {
    bpm: 148,
    step(play, bar, s) {
      const chord = CHORDS[bar % 4];
      if (s % 2 === 0) play.tone('square', chord[0] - (s % 4 === 0 ? 12 : 0), 1.5, 0.11);
      if (s % 4 === 0) play.kick(0.45);
      if (s === 4 || s === 12) play.noise(0.12, 1800, 0.1);
      if (s % 2 === 1) play.noise(0.035, 8000, 0.03);
      const note = LEAD[(bar % 4) * 8 + s / 2];
      if (s % 2 === 0 && note) play.tone('square', note, 1.7, 0.07);
    },
  },
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.mode = 'none';
    this.enabled = false;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.recordDest = null;
    this.customTrack = null; // blob: URL of a song picked on this device
  }

  /** Load the saved on/off preference (or the page's default). */
  init({ defaultOn }) {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch { /* storage unavailable */ }
    this.enabled = saved === null ? defaultOn : saved === 'on';
    // Browsers only allow audio after a user gesture: unlock on the first tap/click/key.
    const unlock = () => this.#ensureContext();
    ['pointerdown', 'keydown'].forEach((type) => document.addEventListener(type, unlock, { passive: true }));
    return this;
  }

  #ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? MASTER_VOLUME : 0;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.#musicLevel();
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.noiseBuffer = this.#makeNoise();
      this.#startScheduler();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  #makeNoise() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setEnabled(on) {
    this.enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch { /* ignore */ }
    if (on) this.#ensureContext();
    if (this.master) this.master.gain.setTargetAtTime(on ? MASTER_VOLUME : 0, this.ctx.currentTime, 0.05);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  #musicLevel() {
    if (this.external) return 0; // an embedded soundtrack is playing: keep only the sound effects
    return this.mode === 'paused' ? MUSIC_PAUSED_VOLUME : MUSIC_VOLUME;
  }

  /** 'lobby' | 'race' | 'paused' | 'none' */
  setMusic(mode) {
    if (mode === this.mode) return;
    const fromSong = this.mode === 'paused' ? 'race' : this.mode;
    this.mode = mode;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(this.#musicLevel(), this.ctx.currentTime, 0.15);
    if (mode !== 'paused' && fromSong !== mode) this.step = 0; // new song starts from bar 1
  }

  /**
   * Play an mp3 soundtrack (looped) instead of the built-in chiptune.
   * It goes through the same master gain, so mute and video recording include it.
   * Resolves false when the file doesn't exist.
   */
  async playTrack(url, { paused = false } = {}) {
    if (this.trackUrl !== url) {
      this.stopTrack();
      this.trackUrl = url;
      const request = this.trackRequest;
      const exists = !brokenTracks.has(url) && (url.startsWith('blob:') || (await trackExists(url))); // a picked file is always there
      // Stopped or replaced while we waited: the newer call owns the track. Going on would start a second,
      // orphaned copy that nothing could stop (the "music plays twice" bug).
      if (request !== this.trackRequest) return false;
      if (!exists) {
        this.trackUrl = null;
        return false;
      }
      if (!this.#ensureContext()) return false;
      const audio = new Audio(url);
      audio.loop = true; // user-supplied file: always from 0:00, never skip its intro
      // A file the browser can't decode: drop it (never retry it) and fall back to the default music.
      audio.addEventListener('error', () => {
        if (this.track !== audio) return; // stopTrack() clearing src also fires "error"
        brokenTracks.add(url);
        this.stopTrack();
        if (this.customTrack === url) this.customTrack = null;
        window.dispatchEvent(new CustomEvent('soundtrack-error', { detail: { url } }));
      });
      this.trackSource = this.ctx.createMediaElementSource(audio);
      this.trackGain = this.ctx.createGain();
      this.trackGain.gain.value = TRACK_VOLUME;
      this.trackSource.connect(this.trackGain).connect(this.master);
      this.track = audio;
      this.setExternalMusic(true);
    }
    if (!this.track) return false;
    if (paused) this.track.pause();
    else this.track.play().catch(() => { /* blocked until the first tap; retried on the next state */ });
    return true;
  }

  /** A soundtrack the user picked on their device (blob: URL, never uploaded); null = the map's own. */
  setCustomTrack(url) {
    if (this.customTrack === url) return;
    this.customTrack = url;
    if (this.track) this.stopTrack(); // the next state update starts the right one
  }

  stopTrack() {
    this.trackRequest = (this.trackRequest ?? 0) + 1; // cancels a playTrack() still checking its file
    if (this.track) {
      this.track.pause();
      this.track.src = '';
      this.trackSource.disconnect();
      this.trackGain.disconnect();
    }
    this.track = null;
    this.trackSource = null;
    this.trackGain = null;
    this.trackUrl = null;
    this.setExternalMusic(false);
  }

  /** Silence the built-in music while a map's soundtrack plays. */
  setExternalMusic(on) {
    if (this.external === on) return;
    this.external = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.#musicLevel(), this.ctx.currentTime, 0.3);
  }

  #startScheduler() {
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => {
      const songName = this.mode === 'paused' ? 'race' : this.mode;
      const song = SONGS[songName];
      if (!song || !this.enabled) {
        this.nextTime = this.ctx.currentTime + 0.05;
        return;
      }
      const stepDur = 60 / song.bpm / 4;
      while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
        const bar = Math.floor(this.step / STEPS_PER_BAR);
        song.step(this.#voices(this.musicBus, this.nextTime, stepDur), bar, this.step % STEPS_PER_BAR);
        this.nextTime += stepDur;
        this.step += 1;
      }
    }, SCHEDULER_MS);
  }

  /** Little instrument rack bound to an output bus and a start time. */
  #voices(bus, at, stepDur) {
    const ctx = this.ctx;
    const envelope = (gainNode, vol, dur) => {
      gainNode.gain.setValueAtTime(0.0001, at);
      gainNode.gain.exponentialRampToValueAtTime(vol, at + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    };
    return {
      tone: (type, midi, steps, vol, slideTo = null) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const dur = steps * stepDur;
        osc.type = type;
        osc.frequency.setValueAtTime(freq(midi), at);
        if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(freq(slideTo), at + dur);
        envelope(gain, vol, dur);
        osc.connect(gain).connect(bus);
        osc.start(at);
        osc.stop(at + dur + 0.02);
      },
      noise: (dur, cutoff, vol) => {
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = this.noiseBuffer;
        filter.type = cutoff > 4000 ? 'highpass' : 'bandpass';
        filter.frequency.value = cutoff;
        envelope(gain, vol, dur);
        src.connect(filter).connect(gain).connect(bus);
        src.start(at, Math.random() * 0.5);
        src.stop(at + dur + 0.02);
      },
      kick: (vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(150, at);
        osc.frequency.exponentialRampToValueAtTime(40, at + 0.12);
        envelope(gain, vol, 0.16);
        osc.connect(gain).connect(bus);
        osc.start(at);
        osc.stop(at + 0.2);
      },
    };
  }

  /** One-shot sound effect. */
  sfx(name) {
    if (!this.enabled || !this.#ensureContext()) return;
    const v = this.#voices(this.sfxBus, this.ctx.currentTime + 0.01, 0.1);
    const later = (ms, fn) => setTimeout(() => this.enabled && fn(this.#voices(this.sfxBus, this.ctx.currentTime + 0.01, 0.1)), ms);
    switch (name) {
      case 'beep': v.tone('square', 81, 1.2, 0.18); break;
      case 'go': v.tone('square', 88, 3.5, 0.2); v.tone('square', 76, 3.5, 0.1); break;
      case 'whoosh': v.noise(0.28, 1500, 0.12); break;
      case 'bonk': v.tone('triangle', 57, 1.8, 0.35, 40); v.noise(0.08, 900, 0.2); break;
      case 'slip': v.tone('sine', 72, 3, 0.2, 96); break;
      case 'pop': v.tone('sine', 79, 0.6, 0.07, 86); break;
      case 'drum':
        [0, 260, 520].forEach((ms) => later(ms, (x) => {
          x.kick(0.8);
          x.tone('sine', 36, 3, 0.3, 30);
        }));
        break;
      case 'siren':
        v.tone('sawtooth', 67, 6, 0.08, 79);
        later(600, (x) => x.tone('sawtooth', 79, 6, 0.08, 67));
        break;
      case 'firework':
        [0, 500, 900, 1500].forEach((ms) => later(ms, (x) => {
          x.tone('sine', 84, 2.5, 0.06, 60);
          x.noise(0.4, 1500, 0.25);
        }));
        break;
      case 'crash':
        v.kick(0.7);
        v.noise(0.6, 700, 0.35);
        v.tone('sawtooth', 40, 4, 0.18, 28);
        later(140, (x) => x.noise(0.35, 2500, 0.2)); // clattering iron
        break;
      case 'fanfare':
        [72, 76, 79].forEach((n, i) => later(i * 130, (x) => x.tone('square', n, 1.1, 0.16)));
        later(400, (x) => {
          x.tone('square', 84, 7, 0.18);
          x.tone('square', 76, 7, 0.1);
        });
        break;
      default: break;
    }
  }

  /** Audio stream of everything we play (mixed into recorded videos). */
  stream() {
    if (!this.#ensureContext()) return null;
    if (!this.recordDest) {
      this.recordDest = this.ctx.createMediaStreamDestination();
      this.master.connect(this.recordDest);
    }
    return this.recordDest.stream;
  }
}

const trackChecks = new Map();
const brokenTracks = new Set(); // urls the browser failed to decode this session
/** HEAD request once per url: lets the host just drop mp3 files into public/music. */
function trackExists(url) {
  if (!trackChecks.has(url)) {
    trackChecks.set(url, fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false));
  }
  return trackChecks.get(url);
}

export const sound = new SoundEngine();

/**
 * Keeps music + race cues in sync with game state. Call on every state update.
 * Countdown beeps are scheduled from `startsAt`, since no state arrives during the countdown.
 */
export function createSoundDirector() {
  let lastPhase = null;
  let gateDownFor = null;
  let countdownKey = null;
  let timers = [];
  let quietTimer = null;
  let quiet = false; // the race ended a while ago: let the podium rest in silence
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  return (state, clockOffset = 0) => {
    const race = state.race;
    const paused = Boolean(race?.paused);
    const racing = state.phase === 'countdown' || state.phase === 'racing';
    if (state.phase === 'finished' && lastPhase !== 'finished' && !quietTimer) {
      quietTimer = setTimeout(() => {
        quiet = true;
        sound.stopTrack();
        sound.setMusic('none');
      }, QUIET_AFTER_FINISH_MS);
    }
    if (state.phase !== 'finished') {
      clearTimeout(quietTimer);
      quietTimer = null;
      quiet = false;
    }
    if (quiet) {
      lastPhase = state.phase;
      return;
    }
    sound.setMusic(state.phase === 'lobby' || state.phase === 'finished' ? 'lobby' : paused ? 'paused' : 'race');
    // Soundtrack (picked file, else public/music/<mapId>.mp3) plays from the countdown to the podium.
    if (race && state.phase !== 'lobby' && sound.enabled) {
      sound.playTrack(sound.customTrack ?? `${MUSIC_DIR}/${race.mapId}.mp3`, { paused });
    }
    else if (sound.track || sound.trackUrl) sound.stopTrack();

    const key = state.phase === 'countdown' && !paused ? race.startsAt : null;
    if (key !== countdownKey) {
      clearTimers();
      countdownKey = key;
      if (key !== null) {
        const startsIn = key - (Date.now() + clockOffset);
        [3, 2, 1].forEach((s) => {
          const at = startsIn - s * 1000;
          if (at >= -50) timers.push(setTimeout(() => sound.sfx('beep'), Math.max(0, at)));
        });
        if (startsIn > -200) timers.push(setTimeout(() => sound.sfx('go'), Math.max(0, startsIn)));
      }
    }
    if (state.phase === 'finished' && lastPhase === 'racing') sound.sfx('fanfare');
    // Special finish lines make their own noise when the first racer arrives.
    const finishSound = { saigon: 'crash', denhung: 'drum', congtruong: 'siren', badinh: 'firework', tet: 'firework' }[race?.mapId];
    if (finishSound && race.racers.some((r) => r.finishedAt !== null) && gateDownFor !== race.startsAt) {
      gateDownFor = race.startsAt;
      if (state.phase === 'racing') sound.sfx(finishSound);
    }
    if (!racing) clearTimers();
    lastPhase = state.phase;
  };
}

/** Sound cues for visual-only effects (throws, reactions). */
export function soundForEffect(fx) {
  if (fx?.type === 'throw') {
    sound.sfx('whoosh');
    setTimeout(() => sound.sfx(fx.item === 'banana' ? 'slip' : 'bonk'), 850);
  } else if (fx?.type === 'react') {
    sound.sfx('pop');
  }
}
