import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { StoreError } from './errors.js';
import { validatePassword } from './validation.js';

const derive = promisify(scrypt);
export const SCRYPT = Object.freeze({ algorithm: 'scrypt', version: 1, N: 131072, r: 8, p: 1, keylen: 64 });
const options = Object.freeze({ N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 256 * 1024 * 1024 });

export class ScryptPool {
  #active = 0; #waiting = [];
  constructor({ concurrency = 2, maxQueue = 8 } = {}) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2 || !Number.isInteger(maxQueue) || maxQueue < 0 || maxQueue > 100) throw new Error('Invalid KDF pool limits');
    this.concurrency = concurrency; this.maxQueue = maxQueue;
  }
  get active() { return this.#active; }
  get queued() { return this.#waiting.length; }
  async run(job) {
    if (this.#active < this.concurrency) this.#active++;
    else {
      if (this.#waiting.length >= this.maxQueue) throw new StoreError(429, 'TOO_MANY_ATTEMPTS', 1);
      await new Promise(resolve => this.#waiting.push(resolve));
    }
    try { return await job(); }
    finally {
      const next = this.#waiting.shift();
      if (next) next(); else this.#active--;
    }
  }
}
export function createPasswordService(pool = new ScryptPool()) {
  const dummy = { MatKhauBam: Buffer.alloc(64).toString('base64'), Salt: randomBytes(16).toString('base64'), ThamSoBam: SCRYPT };
  function recordValid(record) {
    return record && Object.keys(SCRYPT).every(key => record.ThamSoBam?.[key] === SCRYPT[key])
      && typeof record.Salt === 'string' && /^[A-Za-z0-9+/]{22}==$/.test(record.Salt)
      && typeof record.MatKhauBam === 'string' && /^[A-Za-z0-9+/]{86}==$/.test(record.MatKhauBam);
  }
  return Object.freeze({
    async hash(password) {
      validatePassword(password);
      const salt = randomBytes(16);
      const key = await pool.run(() => derive(password, salt, SCRYPT.keylen, options));
      try { return { MatKhauBam: key.toString('base64'), Salt: salt.toString('base64'), ThamSoBam: { ...SCRYPT } }; }
      finally { key.fill(0); }
    },
    async verify(password, record) {
      validatePassword(password);
      const valid = recordValid(record);
      const candidate = valid ? record : dummy;
      const key = await pool.run(() => derive(password, Buffer.from(candidate.Salt, 'base64'), SCRYPT.keylen, options));
      try { return timingSafeEqual(key, Buffer.from(candidate.MatKhauBam, 'base64')) && Boolean(valid); }
      finally { key.fill(0); }
    }
  });
}
