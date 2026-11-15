import { StoreError } from './errors.js';

const ALLOWED_DBS = ['QLSieuThiMini', 'QLSieuThiMini_Test'];

export function assertTestDatabase(config, actualName) {
  if (!ALLOWED_DBS.includes(config.dbName) || !ALLOWED_DBS.includes(actualName) || config.dbName !== actualName) throw new StoreError(503, 'STORE_WRITES_DISABLED');
}
export function assertStoreWriteTarget(config, actualName) {
  assertTestDatabase(config, actualName);
  if (config.storeWriteEnabled !== true) throw new StoreError(503, 'STORE_WRITES_DISABLED');
}
