import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { StoreError } from './errors.js';
import { createCart } from './cart.js';

const token = () => randomBytes(32).toString('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
export const COOKIE_NAME = 'store_sid';
export class SessionStore {
  #sessions = new Map();
  constructor({ now = Date.now, idleMs = 30 * 60 * 1000, absoluteMs = 8 * 60 * 60 * 1000, maxSessions = 1000 } = {}) {
    this.now = now; this.idleMs = idleMs; this.absoluteMs = absoluteMs; this.maxSessions = maxSessions;
  }
  create(maKH = null) {
    this.prune();
    if (this.#sessions.size >= this.maxSessions) throw new StoreError(429, 'TOO_MANY_ATTEMPTS', 60);
    const sid = token();
    const session = { maKH, csrfToken: token(), cart: createCart(), createdAt: this.now(), lastSeenAt: this.now() };
    this.#sessions.set(digest(sid), session);
    return { sid, session };
  }
  get(sid, { touch = true } = {}) {
    if (typeof sid !== 'string' || !/^[a-f0-9]{64}$/.test(sid)) return null;
    const key = digest(sid); const session = this.#sessions.get(key);
    if (!session) return null;
    if (this.now() - session.createdAt >= this.absoluteMs || this.now() - session.lastSeenAt >= this.idleMs) { this.#sessions.delete(key); return null; }
    if (touch) session.lastSeenAt = this.now();
    return session;
  }
  destroy(sid) { if (typeof sid === 'string') this.#sessions.delete(digest(sid)); }
  rotate(sid, maKH) {
    const old = this.get(sid, { touch: false });
    this.destroy(sid);
    const created = this.create(maKH);
    if (old) created.session.cart = old.cart;
    return created;
  }
  prune() {
    for (const [key, session] of this.#sessions) if (this.now() - session.createdAt >= this.absoluteMs || this.now() - session.lastSeenAt >= this.idleMs) this.#sessions.delete(key);
  }
}
export function readSessionCookie(header = '') {
  if (typeof header !== 'string' || header.length > 8192) return null;
  const values = header.split(';').map(part => part.trim()).filter(part => part.startsWith(`${COOKIE_NAME}=`));
  if (values.length !== 1) return null;
  const sid = values[0].slice(COOKIE_NAME.length + 1);
  return /^[a-f0-9]{64}$/.test(sid) ? sid : null;
}
export function cookieOptions(secure) {
  return { httpOnly: true, sameSite: 'strict', secure, path: '/store-api', maxAge: 8 * 60 * 60 * 1000 };
}
export function checkCsrf({ origin, expectedOrigin, session, token: supplied }) {
  if (typeof origin !== 'string' || origin !== expectedOrigin) throw new StoreError(403, 'ORIGIN_INVALID');
  if (!session || typeof session.csrfToken !== 'string' || !/^[a-f0-9]{64}$/.test(session.csrfToken) || typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)) throw new StoreError(403, 'CSRF_INVALID');
  if (!timingSafeEqual(Buffer.from(session.csrfToken, 'hex'), Buffer.from(supplied, 'hex'))) throw new StoreError(403, 'CSRF_INVALID');
}
