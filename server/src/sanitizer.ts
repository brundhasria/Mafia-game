import crypto from 'node:crypto';

// Characters avoiding ambiguous letters (no I, O, L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a clean 4-letter room code.
 */
export function generateRoomCode(existingCodes: Set<string>): string {
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    let code = '';
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * CODE_CHARS.length);
      code += CODE_CHARS[idx];
    }
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  // Fallback to random alphanumeric if space crowded
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

/**
 * Generates a unique session token for reconnection.
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Strips HTML tags and unsafe characters.
 */
export function sanitizeHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitizes and validates a player nickname.
 */
export function sanitizeNickname(raw: string): { valid: boolean; nickname: string; error?: string } {
  if (typeof raw !== 'string') {
    return { valid: false, nickname: '', error: 'Nickname must be a string' };
  }
  const stripped = sanitizeHtml(raw).replace(/[\r\n\t]/g, ' ').trim();
  if (stripped.length < 2) {
    return { valid: false, nickname: '', error: 'Nickname must be at least 2 characters' };
  }
  if (stripped.length > 16) {
    return { valid: false, nickname: '', error: 'Nickname cannot exceed 16 characters' };
  }
  return { valid: true, nickname: stripped };
}

/**
 * Sanitizes and validates chat message text.
 */
export function sanitizeChatText(raw: string): { valid: boolean; text: string } {
  if (typeof raw !== 'string') return { valid: false, text: '' };
  const stripped = sanitizeHtml(raw).replace(/[\r\n\t]/g, ' ').trim();
  if (stripped.length === 0 || stripped.length > 250) {
    return { valid: false, text: '' };
  }
  return { valid: true, text: stripped };
}

/**
 * Simple in-memory sliding window rate limiter per player.
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private maxEvents: number;
  private windowMs: number;

  constructor(maxEvents = 5, windowMs = 4000) {
    this.maxEvents = maxEvents;
    this.windowMs = windowMs;
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const history = this.timestamps.get(key) || [];
    const valid = history.filter((t) => now - t < this.windowMs);

    if (valid.length >= this.maxEvents) {
      this.timestamps.set(key, valid);
      return true;
    }

    valid.push(now);
    this.timestamps.set(key, valid);
    return false;
  }

  remove(key: string): void {
    this.timestamps.delete(key);
  }
}
