import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../shared/catalog.js';
import { Chat, HOST_AUTHOR } from '../src/chat.js';
import { sanitizeText } from '../src/text.js';

const author = { id: 'p1', name: 'An', initials: 'A', color: '#ff5a36' };

test('sanitizeText keeps punctuation/emoji messages but strips invisible characters', () => {
  assert.equal(sanitizeText('  hi \u202e there  ', { maxLength: 50 }), 'hi there');
  assert.equal(sanitizeText('👍', { maxLength: 50 }), '👍');
  assert.equal(sanitizeText('???', { maxLength: 50 }), '???');
  assert.equal(sanitizeText('???', { maxLength: 50, requireLetter: true }), null);
  assert.equal(sanitizeText('\u200b\u3164', { maxLength: 50 }), null);
  assert.equal(sanitizeText(null, { maxLength: 50 }), null);
});

test('sanitizeText keeps emoji sequences and turns line breaks into spaces', () => {
  assert.equal(sanitizeText('❤️ 👨‍👩‍👧', { maxLength: 50 }), '❤️ 👨‍👩‍👧');
  assert.equal(sanitizeText('xin\nchào\r\nbạn', { maxLength: 50 }), 'xin chào bạn');
});

test('sanitizeText caps stacked combining marks (zalgo)', () => {
  const zalgo = `a${'́'.repeat(30)}`;
  assert.equal(Array.from(sanitizeText(zalgo, { maxLength: 50 })).length, 3);
});

test('post stores a clean message with a copied author', () => {
  const chat = new Chat();
  const { message } = chat.post({ ...author, token: 'secret' }, '  xin chào  ', 1000);
  assert.equal(message.text, 'xin chào');
  assert.deepEqual(message.author, { ...author, isHost: false });
  assert.equal(message.at, 1000);
  assert.deepEqual(chat.history(), [message]);
});

test('post rejects empty and over-long text', () => {
  const chat = new Chat();
  assert.ok(chat.post(author, '   ', 0).error);
  assert.ok(chat.post(author, 'x'.repeat(RULES.chatMaxLength + 1), 0).error);
  assert.ok(chat.post(author, 'x'.repeat(RULES.chatMaxLength), 0).message);
});

test('post rate-limits each author separately', () => {
  const chat = new Chat();
  assert.ok(chat.post(author, 'one', 0).message);
  assert.match(chat.post(author, 'two', RULES.chatCooldownMs - 1).error, /Chậm/);
  assert.ok(chat.post(HOST_AUTHOR, 'host can talk', 1).message);
  assert.ok(chat.post(author, 'three', RULES.chatCooldownMs).message);
});

test('history keeps only the most recent messages', () => {
  const chat = new Chat();
  for (let i = 0; i < RULES.chatHistory + 5; i += 1) chat.post(author, `m${i}`, i * RULES.chatCooldownMs);
  assert.equal(chat.history().length, RULES.chatHistory);
  assert.equal(chat.history().at(-1).text, `m${RULES.chatHistory + 4}`);
});
