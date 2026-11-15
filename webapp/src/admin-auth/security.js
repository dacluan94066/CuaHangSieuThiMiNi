import { randomBytes, createHash, timingSafeEqual, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { SCRYPT, ScryptPool } from '../store/passwords.js';

export const COOKIE = 'admin_sid';
const token = () => randomBytes(32).toString('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
const derive = promisify(scrypt);
const messages = {
  ADMIN_AUTH_REQUIRED: 'Vui lòng đăng nhập quản trị.', ADMIN_INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  ADMIN_FORBIDDEN: 'Bạn không có quyền xem mục này.', ADMIN_CSRF_INVALID: 'Phiên xác thực không hợp lệ. Vui lòng tải lại trang.',
  ADMIN_RATE_LIMIT: 'Bạn đã thử quá nhiều lần. Vui lòng đợi và thử lại.', ADMIN_INVALID_INPUT: 'Yêu cầu không hợp lệ.',
  ADMIN_AUTH_SETUP_REQUIRED: 'Chưa thiết lập tài khoản quản trị trên DB Test. Cần chạy script thủ công đã duyệt.',
  ADMIN_AUTH_TARGET_FORBIDDEN: 'Đăng nhập quản trị hiện chỉ được phép trên DB Test hoặc Demo đã thiết lập.',
  ADMIN_UNAVAILABLE: 'Chưa thể xác thực lúc này. Vui lòng thử lại sau.', ADMIN_METHOD_NOT_ALLOWED: 'Phương thức không được hỗ trợ.'
};
export class AdminError extends Error { constructor(status, code, retryAfter) { super(messages[code] || messages.ADMIN_UNAVAILABLE); this.status = status; this.code = code; this.retryAfter = retryAfter; } }
export function assertAdminTarget(name) { if (!['QLSieuThiMini', 'QLSieuThiMini_Test', 'QLSieuThiMini_Demo'].includes(name)) throw new AdminError(503, 'ADMIN_AUTH_TARGET_FORBIDDEN'); }
export function validPassword(value, min = 1) { return typeof value === 'string' && Array.from(value).length >= min && Array.from(value).length <= 128; }
export const validCredential = row => row && Object.entries(SCRYPT).every(([key, value]) => row.ThamSoBam?.[key] === value) && /^[A-Za-z0-9+/]{22}==$/.test(row.Salt || '') && /^[A-Za-z0-9+/]{86}==$/.test(row.MatKhauBam || '');
export function createAdminPasswords(pool = new ScryptPool()) {
  const dummy = { Salt: randomBytes(16).toString('base64'), MatKhauBam: Buffer.alloc(64).toString('base64'), ThamSoBam: SCRYPT };
  return {
    async hash(password, min = 1) {
      if (!validPassword(password, min)) throw new AdminError(400, 'ADMIN_INVALID_INPUT');
      const salt = randomBytes(16); const key = await pool.run(() => derive(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }));
      try { return { MatKhauBam: key.toString('base64'), Salt: salt.toString('base64'), ThamSoBam: { ...SCRYPT } }; } finally { key.fill(0); }
    },
    async verify(password, row) {
      if (!validPassword(password)) throw new AdminError(400, 'ADMIN_INVALID_INPUT');
      const valid = Boolean(validCredential(row)); const source = valid ? row : dummy;
      const key = await pool.run(() => derive(password, Buffer.from(source.Salt, 'base64'), 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }));
      try { return timingSafeEqual(key, Buffer.from(source.MatKhauBam, 'base64')) && valid; } finally { key.fill(0); }
    }
  };
}
export class AdminSessions {
  #items = new Map();
  constructor({ now = Date.now, idleMs = 1800000, absoluteMs = 28800000, max = 1000 } = {}) { Object.assign(this, { now, idleMs, absoluteMs, max }); }
  create(principal = null) {
    for (const [key, value] of this.#items) if (this.expired(value)) this.#items.delete(key);
    if (this.#items.size >= this.max) throw new AdminError(429, 'ADMIN_RATE_LIMIT', 60);
    const sid = token(); const session = { principal, csrfToken: token(), created: this.now(), seen: this.now() };
    this.#items.set(digest(sid), session); return { sid, session };
  }
  expired(value) { return this.now() - value.created >= this.absoluteMs || this.now() - value.seen >= this.idleMs; }
  get(sid, touch = false) {
    if (typeof sid !== 'string' || !/^[a-f0-9]{64}$/.test(sid)) return null;
    const key = digest(sid); const value = this.#items.get(key);
    if (!value) return null;
    if (this.expired(value)) { this.#items.delete(key); return null; }
    if (touch) value.seen = this.now(); return value;
  }
  destroy(sid) { if (typeof sid === 'string') this.#items.delete(digest(sid)); }
}
export function readAdminCookie(value = '') {
  if (typeof value !== 'string' || value.length > 8192) return null;
  const values = value.split(';').map(part => part.trim()).filter(part => part.startsWith(COOKIE + '='));
  const sid = values.length === 1 ? values[0].slice(COOKIE.length + 1) : '';
  return /^[a-f0-9]{64}$/.test(sid) ? sid : null;
}
export function checkAdminCsrf(origin, expected, session, value) {
  if (origin !== expected || !session || typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value) || !timingSafeEqual(Buffer.from(session.csrfToken, 'hex'), Buffer.from(value, 'hex'))) throw new AdminError(403, 'ADMIN_CSRF_INVALID');
}
export class AdminLimiter {
  #buckets = new Map();
  constructor({ now = Date.now, windowMs = 900000, max = 10000 } = {}) { Object.assign(this, { now, windowMs, max }); }
  reserve(ip, name) {
    const now = this.now(); for (const [key, value] of this.#buckets) if (value.expires <= now && !value.inflight) this.#buckets.delete(key);
    const entries = [[digest(`ip:${ip}`), 20], [digest(`pair:${ip}:${name}`), 5]];
    for (const [key, limit] of entries) { const value = this.#buckets.get(key); if (value && value.failed + value.inflight >= limit) throw new AdminError(429, 'ADMIN_RATE_LIMIT', Math.max(1, Math.ceil((value.expires - now) / 1000))); }
    if (this.#buckets.size + entries.filter(([key]) => !this.#buckets.has(key)).length > this.max) throw new AdminError(429, 'ADMIN_RATE_LIMIT', 60);
    const records = entries.map(([key]) => { let value = this.#buckets.get(key); if (!value) { value = { failed: 0, inflight: 0, expires: now + this.windowMs }; this.#buckets.set(key, value); } value.inflight++; return value; });
    let ended = false; return success => { if (ended) return; ended = true; for (const record of records) { record.inflight--; if (!success) record.failed++; } };
  }
}
