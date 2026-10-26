const FPS = 30;
const BITRATE = 6_000_000;
const TAIL_MS = 4000; // keep filming the finish line + results for a moment
const MIME_WITH_AUDIO = [
  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
  ['video/webm;codecs=vp9,opus', 'webm'],
  ['video/webm;codecs=vp8,opus', 'webm'],
];
const MIME_CANDIDATES = [
  ['video/mp4;codecs=avc1.42E01E', 'mp4'],
  ['video/mp4', 'mp4'],
  ['video/webm;codecs=vp9', 'webm'],
  ['video/webm;codecs=vp8', 'webm'],
  ['video/webm', 'webm'],
];

function pickFormat(withAudio = false) {
  if (typeof MediaRecorder === 'undefined') return null;
  const list = withAudio ? [...MIME_WITH_AUDIO, ...MIME_CANDIDATES] : MIME_CANDIDATES;
  const found = list.find(([mime]) => MediaRecorder.isTypeSupported(mime));
  return found ? { mime: found[0], ext: found[1] } : null;
}

/** "Cuộc đua Tết 2026" -> "cuoc-dua-tet-2026" (safe file names). */
export function slugify(text) {
  const slug = String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'duavit';
}

/**
 * Records a canvas for the duration of one race.
 * `onReady({ blob, url, ext })` fires once the file is finalised.
 */
export class RaceRecorder {
  /** @param {{ onReady: Function, audio?: () => MediaStream | null }} opts audio: optional soundtrack to mix in */
  constructor(canvas, { onReady, audio = () => null }) {
    this.canvas = canvas;
    this.onReady = onReady;
    this.audio = audio;
    this.format = pickFormat();
    this.recorder = null;
    this.key = null;
    this.stopTimer = null;
  }

  get supported() {
    return Boolean(this.format && this.canvas.captureStream);
  }

  get recording() {
    return this.recorder?.state === 'recording' || this.recorder?.state === 'paused';
  }

  /** Mirror a paused race: the video simply skips the pause. */
  setPaused(paused) {
    if (!this.recorder) return;
    if (paused && this.recorder.state === 'recording') this.recorder.pause();
    if (!paused && this.recorder.state === 'paused') this.recorder.resume();
  }

  /** Start filming the race identified by `key` (no-op if already filming it). */
  start(key) {
    if (!this.supported || this.key === key) return;
    this.cancel();
    this.key = key;
    const chunks = [];
    const audioTracks = this.audio()?.getAudioTracks() ?? [];
    const format = pickFormat(audioTracks.length > 0) ?? this.format;
    const stream = new MediaStream([...this.canvas.captureStream(FPS).getVideoTracks(), ...(format.mime.includes(',') ? audioTracks : [])]);
    const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: BITRATE });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      recorder.stream.getVideoTracks().forEach((track) => track.stop()); // the audio track is shared: keep it alive
      if (recorder.discard || chunks.length === 0) return;
      const blob = new Blob(chunks, { type: format.mime.split(';')[0] });
      this.onReady({ blob, url: URL.createObjectURL(blob), ext: format.ext });
    };
    recorder.start(1000);
    this.recorder = recorder;
  }

  /** The race is over: film a short tail, then save. */
  finish() {
    if (!this.recording || this.stopTimer) return;
    this.stopTimer = setTimeout(() => this.#stop(false), TAIL_MS);
  }

  /** Stop right now (e.g. host left the arena); keeps the file if we were in the tail. */
  stopNow() {
    if (!this.recording) return;
    this.#stop(!this.stopTimer);
  }

  cancel() {
    if (this.recording) this.#stop(true);
  }

  #stop(discard) {
    clearTimeout(this.stopTimer);
    this.stopTimer = null;
    this.recorder.discard = discard;
    this.recorder.stop();
    this.recorder = null;
    this.key = null;
  }
}
