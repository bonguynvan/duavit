// The commitment (SHA-256 of the secret seed) shown under the race: one line, full hash, copyable.
import { toast } from './ui.js';

function selectText(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Wire a `.commit-bar` element once; returns `show(seedHash)` (null hides the bar).
 * @param {HTMLElement} bar
 * @returns {(seedHash: string | null) => void}
 */
export function mountCommitBar(bar) {
  const hash = bar.querySelector('.commit-hash');
  bar.querySelector('.commit-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(hash.textContent);
      toast('Đã sao chép mã cam kết');
    } catch {
      selectText(hash); // no clipboard access (e.g. plain http): let the user press Ctrl+C
      toast('Đã chọn mã, nhấn Ctrl+C để sao chép');
    }
  });
  return (seedHash) => {
    bar.hidden = !seedHash;
    hash.textContent = seedHash ?? '';
  };
}
