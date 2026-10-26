import { RULES } from '/shared/catalog.js';
import { el, request, socket, toast } from './net.js';

const timeOf = (at) => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function messageNode(message, { mine = false } = {}) {
  const { author } = message;
  return el('li', { class: `msg${mine ? ' mine' : ''}${author.isHost ? ' host' : ''}` },
    el('span', { class: 'face', style: { background: author.color }, 'aria-hidden': 'true' }, author.initials),
    el('div', { class: 'bubble' },
      el('div', { class: 'msg-head' }, el('strong', {}, author.name), el('time', {}, timeOf(message.at))),
      el('p', {}, message.text)));
}

/**
 * Wires a chat log + form to the socket.
 * @param {{ log: HTMLElement, form: HTMLFormElement, input: HTMLInputElement, myId?: () => string | null, onMessage?: (m: object) => void }} parts
 */
export function mountChat({ log, form, input, myId = () => null, onMessage = () => {} }) {
  input.maxLength = RULES.chatMaxLength;

  const stickToBottom = () => {
    log.scrollTop = log.scrollHeight;
  };
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 60;

  socket.on('chat:history', (messages) => {
    log.replaceChildren(...messages.map((m) => messageNode(m, { mine: m.author.id === myId() })));
    stickToBottom();
  });

  socket.on('chat:message', (message) => {
    const follow = nearBottom() || message.author.id === myId();
    log.append(messageNode(message, { mine: message.author.id === myId() }));
    while (log.children.length > RULES.chatHistory) log.firstElementChild.remove();
    if (follow) stickToBottom();
    onMessage(message);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const reply = await request('chat:send', { text });
    if (reply.error) {
      input.value = text;
      toast(reply.error);
    }
    input.focus();
  });

  return { stickToBottom };
}
