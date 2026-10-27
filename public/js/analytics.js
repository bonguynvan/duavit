// Google Analytics 4, only with consent. Nothing loads, and nothing is shown, unless the server has a GA4_ID
// and the visitor tapped "Đồng ý". Page views report a cleaned address (no host keys, no room codes).
import { GA4_ID } from '/analytics-config.js';
import { cleanLocation } from '/shared/analyticsUrl.js';
import { el } from './ui.js';

const CONSENT_KEY = 'peti.analytics'; // 'granted' | 'denied'
let loaded = false;

const readConsent = () => {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
};
const writeConsent = (value) => {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode: ask again next time */ }
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

function showBar() {
  if (document.querySelector('.consent-bar')) return;
  const answer = (value) => () => {
    writeConsent(value);
    bar.remove();
    if (value === 'granted') load();
  };
  const bar = el('div', { class: 'consent-bar', role: 'dialog', 'aria-label': 'Thống kê truy cập' },
    el('p', {}, 'Cho phép đếm lượt truy cập bằng Google Analytics để chúng mình cải thiện trang? ',
      el('a', { href: '/quyen-rieng-tu' }, 'Chi tiết')),
    el('div', { class: 'consent-actions' },
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: answer('denied') }, 'Không'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: answer('granted') }, 'Đồng ý')));
  document.body.append(bar);
}

/** Report a custom event (only once the visitor agreed). */
export function track(name, params = {}) {
  if (loaded) gtag('event', name, params);
}

if (GA4_ID) {
  const consent = readConsent();
  if (consent === 'granted') load();
  else if (consent === null) showBar();
  // The privacy page lets visitors change their mind.
  const settings = document.getElementById('analytics-settings');
  if (settings) {
    settings.hidden = false;
    settings.addEventListener('click', () => {
      if (readConsent() === 'granted') {
        writeConsent('denied');
        clearCookies();
        location.reload(); // gtag.js cannot be unloaded: start clean
      } else {
        try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ }
        showBar();
      }
    });
  }
}
