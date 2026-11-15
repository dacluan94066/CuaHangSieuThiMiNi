import { StoreError } from './errors.js';
import { exactBody } from './validation.js';

const invalid = () => { throw new StoreError(400, 'VALIDATION_ERROR'); };
export function storeCode(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(value)) return invalid(); return value; }
export function quantity(value) { if (!Number.isInteger(value) || value < 1 || value > 99) return invalid(); return value; }
function integer(value, min, max) { if (!/^\d+$/.test(value)) return invalid(); const result = Number(value); if (!Number.isSafeInteger(result) || result < min || result > max) return invalid(); return result; }
export function storeQuery(params, kind = 'none') {
  const allowed = kind === 'products' ? ['page', 'limit', 'q', 'maDM', 'giaTu', 'giaDen', 'sort'] : ['categories', 'orders'].includes(kind) ? ['page', 'limit'] : [];
  const result = kind === 'none' ? {} : { page: 1, limit: 20, ...(kind === 'products' ? { sort: 'ma-tang' } : {}) };
  const seen = new Set();
  for (const [key, value] of params) {
    if (!allowed.includes(key) || seen.has(key)) throw new StoreError(400, 'UNKNOWN_PARAMETER');
    seen.add(key);
    if (key === 'page') result.page = integer(value, 1, 10000);
    else if (key === 'limit') result.limit = integer(value, 1, 100);
    else if (key === 'maDM') result.maDM = storeCode(value);
    else if (key === 'giaTu' || key === 'giaDen') result[key] = integer(value, 0, Number.MAX_SAFE_INTEGER);
    else if (key === 'q') {
      if ([...value].length > 100 || /[\u0000-\u001f\u007f]/u.test(value)) return invalid();
      result.q = value.trim();
    } else {
      if (!['ma-tang', 'gia-tang', 'gia-giam'].includes(value)) return invalid();
      result.sort = value;
    }
  }
  if (result.giaTu !== undefined && result.giaDen !== undefined && result.giaTu > result.giaDen) return invalid();
  return result;
}
export function cartInput(body, add = false) {
  exactBody(body, add ? ['maSP', 'soLuong'] : ['soLuong']);
  return { ...(add ? { code: storeCode(body.maSP) } : {}), quantity: quantity(body.soLuong) };
}
