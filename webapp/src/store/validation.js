import { StoreError } from './errors.js';

const invalid = () => { throw new StoreError(400, 'VALIDATION_ERROR'); };
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 40) return invalid();
  const phone = value.replace(/[\s.\-]/gu, '').replace(/^\+84/, '0');
  if (!/^0\d{9}$/.test(phone)) return invalid();
  return phone;
}
export function validatePassword(value) {
  if (typeof value !== 'string') return invalid();
  const length = [...value].length;
  if (length < 12 || length > 128 || Buffer.byteLength(value, 'utf8') > 1024) return invalid();
  return value; // Do not trim or normalize passwords.
}
export function exactBody(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return invalid();
  const keys = Object.keys(value);
  if (keys.some(key => ![...required, ...optional].includes(key))) throw new StoreError(400, 'UNKNOWN_PARAMETER');
  if (required.some(key => !Object.hasOwn(value, key))) return invalid();
  return value;
}
function text(value, min, max) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value)) return invalid();
  const clean = value.trim();
  if ([...clean].length < min || [...clean].length > max) return invalid();
  return clean;
}
export function registrationInput(body) {
  exactBody(body, ['hoTen', 'sdt', 'matKhau'], ['email', 'diaChi']);
  const result = { hoTen: text(body.hoTen, 2, 100), sdt: normalizePhone(body.sdt), matKhau: validatePassword(body.matKhau) };
  if (body.email !== undefined) {
    result.email = text(body.email, 3, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(result.email)) return invalid();
  }
  if (body.diaChi !== undefined) result.diaChi = text(body.diaChi, 1, 500);
  return result;
}
export function loginInput(body) {
  exactBody(body, ['sdt', 'matKhau']);
  return { sdt: normalizePhone(body.sdt), matKhau: validatePassword(body.matKhau) };
}
