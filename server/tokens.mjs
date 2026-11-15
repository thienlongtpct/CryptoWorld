import { createHash, randomBytes } from 'node:crypto';

export const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function newToken() {
  return randomBytes(24).toString('hex');
}
