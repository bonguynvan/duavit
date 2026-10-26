// "Nhạc nền": play a song from the user's own device instead of the default music.
// The file is never uploaded: it gets a local blob: URL that only this tab can read.
import { sound } from './audio.js';
import { toast } from './ui.js';

const MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_LABEL = 'Nhạc mặc định của map';
// Some systems report no MIME type for these; the browser decides in the end (see 'soundtrack-error').
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;
const isAudio = (file) => file.type.startsWith('audio/') || (!file.type && AUDIO_EXTENSIONS.test(file.name));

/**
 * Wire a `.music-picker` block: an <input type="file">, a `.music-name` and a `.music-clear` button.
 * @param {HTMLElement} box
 */
export function mountMusicPicker(box) {
  const input = box.querySelector('input[type="file"]');
  const name = box.querySelector('.music-name');
  const clear = box.querySelector('.music-clear');
  let url = null;

  const use = (file) => {
    const previous = url;
    url = file ? URL.createObjectURL(file) : null;
    sound.setCustomTrack(url); // stops the old track before its URL goes away
    if (previous) URL.revokeObjectURL(previous);
    name.textContent = file ? `🎵 ${file.name}` : DEFAULT_LABEL;
    name.title = file?.name ?? '';
    clear.hidden = !file;
  };

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = ''; // picking the same file again still fires "change"
    if (!file) return;
    if (!isAudio(file)) return toast('Hãy chọn file âm thanh (mp3, m4a, ogg, wav…)');
    if (file.size > MAX_BYTES) return toast('File nhạc quá lớn (tối đa 50 MB)');
    use(file);
    toast('Đã chọn nhạc, sẽ phát khi bắt đầu đua');
  });
  clear.addEventListener('click', () => use(null));
  window.addEventListener('soundtrack-error', (event) => {
    if (event.detail?.url !== url) return;
    use(null);
    toast('Trình duyệt không phát được file nhạc này, đã quay về nhạc mặc định');
  });
  use(null);
}
