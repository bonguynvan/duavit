import { randomBytes } from 'node:crypto';
import { RULES } from '../shared/catalog.js';
import { sanitizeText } from './text.js';

/**
 * @typedef {{ id: string, name: string, initials: string, color: string, isHost?: boolean }} ChatAuthor
 * @typedef {{ id: string, author: ChatAuthor, text: string, at: number }} ChatMessage
 */

/** In-memory chat room shared by everyone on the LAN. */
export class Chat {
  constructor() {
    /** @type {ChatMessage[]} */
    this.messages = [];
    /** @type {Map<string, number>} author id -> last post time */
    this.lastPostAt = new Map();
  }

  /**
   * @param {ChatAuthor} author
   * @param {unknown} rawText
   * @param {number} now
   * @returns {{ message: ChatMessage } | { error: string }}
   */
  post(author, rawText, now) {
    const text = sanitizeText(rawText, { maxLength: RULES.chatMaxLength });
    if (!text) return { error: `Tin nhắn từ 1 đến ${RULES.chatMaxLength} ký tự` };
    const last = this.lastPostAt.get(author.id) ?? -Infinity;
    if (now - last < RULES.chatCooldownMs) return { error: 'Chậm lại chút nhé 🙂' };
    this.lastPostAt.set(author.id, now);
    const message = {
      id: randomBytes(6).toString('hex'),
      author: { id: author.id, name: author.name, initials: author.initials, color: author.color, isHost: Boolean(author.isHost) },
      text,
      at: now,
    };
    this.messages = [...this.messages, message].slice(-RULES.chatHistory);
    return { message };
  }

  history() {
    return this.messages;
  }
}

export const HOST_AUTHOR = Object.freeze({ id: 'host', name: '📢 Host', initials: 'H', color: '#1d1a2f', isHost: true });
