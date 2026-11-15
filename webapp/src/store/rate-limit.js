import { createHash } from 'node:crypto';
import { StoreError } from './errors.js';

export class AttemptLimiter {
  #buckets = new Map();
  constructor({ now = Date.now, windowMs = 15 * 60 * 1000, maxBuckets = 10000 } = {}) {
    this.now = now; this.windowMs = windowMs; this.maxBuckets = maxBuckets;
  }
  #key(value) { return createHash('sha256').update(value).digest('hex'); }
  #entries(ip, phone, kind) {
    return [[this.#key(`${kind}:ip:${ip}`), 20], [this.#key(`${kind}:phone:${ip}:${phone}`), 5]];
  }
  check(ip, phone, kind = 'login') {
    const now = this.now();
    for (const [key, record] of this.#buckets) if (record.expires <= now) this.#buckets.delete(key);
    const entries = this.#entries(ip, phone, kind);
    const delay = entries.reduce((seconds, [key, limit]) => {
      const item = this.#buckets.get(key);
      return item?.count >= limit ? Math.max(seconds, Math.ceil((item.expires - now) / 1000)) : seconds;
    }, 0);
    if (delay) throw new StoreError(429, 'TOO_MANY_ATTEMPTS', delay);
    if (this.#buckets.size + entries.filter(([key]) => !this.#buckets.has(key)).length > this.maxBuckets) throw new StoreError(429, 'TOO_MANY_ATTEMPTS', 60);
  }
  consume(ip, phone, kind = 'login') {
    this.check(ip, phone, kind);
    for (const [key] of this.#entries(ip, phone, kind)) {
      const item = this.#buckets.get(key);
      this.#buckets.set(key, { count: (item?.count || 0) + 1, expires: item?.expires || this.now() + this.windowMs });
    }
  }
  success(ip, phone) {
    const [[ipKey], [phoneKey]] = this.#entries(ip, phone, 'login');
    this.#buckets.delete(phoneKey);
    const item = this.#buckets.get(ipKey);
    if (item) { item.count--; if (!item.count) this.#buckets.delete(ipKey); }
  }
}
