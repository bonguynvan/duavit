// Google Analytics 4: page views + a few events whenever the server has a GA4_ID. Page views report a
// cleaned address (no host keys, no room codes). Visitors can switch it off for their browser on the
// privacy page.
import { GA4_ID } from '/analytics-config.js';
import { cleanLocation } from '/shared/analyticsUrl.js';
import { el } from './ui.js';

const OPT_OUT_KEY = 'peti.analytics'; // 'off' = this browser opted out
let loaded = false;

const optedOut = () => {
  try { return localStorage.getItem(OPT_OUT_KEY) === 'off'; } catch { return false; }
};

function gtag() {
  // gtag.js reads the arguments object itself, exactly as Google's snippet pushes it.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function load() {
  if (loaded || !GA4_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  gtag('js', new Date());
  gtag('config', GA4_ID, {
    send_page_view: false, // sent below with a cleaned address
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  gtag('event', 'page_view', { page_location: cleanLocation(location.href), page_title: document.title });
  document.head.append(el('script', { async: '', src: `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}` }));
}

/** Drop Google Analytics cookies (_ga, _ga_XXXX) on this host and its parent domains. */
function clearCookies() {
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n === '_ga' || n.startsWith('_ga_'));
  const parts = location.hostname.split('.');
  const domains = parts.map((_, i) => parts.slice(i).join('.')).filter((d) => d.includes('.'));
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
  }
}

/** Report a custom event. */
export function track(name, params = {}) {
  if (loaded) gtag('event', name, params);
}

if (GA4_ID) {
  if (!optedOut()) load();
  // Privacy page: switch analytics off (or back on) for this browser.
  const toggle = document.getElementById('analytics-settings');
  if (toggle) {
    const label = () => { toggle.textContent = optedOut() ? 'Bật lại thống kê trên trình duyệt này' : 'Tắt thống kê trên trình duyệt này'; };
    label();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      try {
        if (optedOut()) localStorage.removeItem(OPT_OUT_KEY);
        else localStorage.setItem(OPT_OUT_KEY, 'off');
      } catch { /* storage blocked: nothing to remember */ }
      if (optedOut()) clearCookies();
      location.reload(); // gtag.js cannot be unloaded: start clean
    });
  }
}
