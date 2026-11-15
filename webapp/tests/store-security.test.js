import test from 'node:test';
import assert from 'node:assert/strict';
import { createPasswordService, ScryptPool, SCRYPT } from '../src/store/passwords.js';
import { normalizePhone, validatePassword, registrationInput, loginInput } from '../src/store/validation.js';
import { AttemptLimiter } from '../src/store/rate-limit.js';
import { SessionStore, checkCsrf, readSessionCookie, cookieOptions } from '../src/store/sessions.js';
import { customerDto } from '../src/store/errors.js';

test('scrypt thật: salt riêng, kiểm chứng đúng/sai, hash thiếu/hỏng và tham số quá tải bị chặn', async () => {
  const passwords = createPasswordService();
  const first = await passwords.hash('Mật khẩu thử 2026!');
  const second = await passwords.hash('Mật khẩu thử 2026!');
  assert.deepEqual(first.ThamSoBam, SCRYPT);
  assert.notEqual(first.Salt, second.Salt); assert.notEqual(first.MatKhauBam, second.MatKhauBam);
  assert.equal(Buffer.from(first.Salt, 'base64').length, 16);
  assert.equal(Buffer.from(first.MatKhauBam, 'base64').length, 64);
  assert.equal(await passwords.verify('Mật khẩu thử 2026!', first), true);
  assert.equal(await passwords.verify('Sai mật khẩu 2026!', first), false);
  assert.equal(await passwords.verify('Mật khẩu thử 2026!', null), false);
  assert.equal(await passwords.verify('Mật khẩu thử 2026!', { ...first, Salt: 'broken' }), false);
  assert.equal(await passwords.verify('Mật khẩu thử 2026!', { ...first, ThamSoBam: { ...SCRYPT, N: 2 ** 30 } }), false);
  assert.equal(JSON.stringify(first).includes('Mật khẩu thử'), false);
});
test('KDF pool giới hạn hai tác vụ, hàng đợi hữu hạn, trả slot cả khi job lỗi', async () => {
  const pool = new ScryptPool({ maxQueue: 1 });
  const releases = [];
  const job = () => pool.run(() => new Promise(resolve => releases.push(resolve)));
  const a = job(); const b = job(); const c = job();
  assert.equal(pool.active, 2); assert.equal(pool.queued, 1);
  await assert.rejects(job(), { status: 429 });
  releases[0](); await a;
  assert.equal(pool.active, 2); assert.equal(pool.queued, 0);
  releases[1](); releases[2](); await Promise.all([b, c]);
  await assert.rejects(pool.run(async () => { throw new Error('memory-only'); }));
  assert.equal(pool.active, 0);
});
test('Mật khẩu không trim, không ép kiểu, kiểm tra độ dài Unicode', () => {
  assert.equal(validatePassword('  abcdefghijkl  '), '  abcdefghijkl  ');
  assert.equal(validatePassword('😀'.repeat(12)), '😀'.repeat(12));
  for (const value of ['a'.repeat(11), 'a'.repeat(129), 123, null, { $ne: '' }]) assert.throws(() => validatePassword(value));
});
for (const [input, output] of [['0901234567', '0901234567'], ['+84 901.234-567', '0901234567'], [' 090 123 4567 ', '0901234567']]) {
  test(`Chuẩn hóa SĐT ${input}`, () => assert.equal(normalizePhone(input), output));
}
test('SĐT sai kiểu/độ dài/ký tự/toán tử bị từ chối', () => {
  for (const input of [901234567, '', '+1-901234567', '09012345678', 'abc0901234567', { $ne: '' }, null]) assert.throws(() => normalizePhone(input));
});
test('Validate toàn bộ body, không nhận trường quyền/điểm/giá hoặc prototype đặc biệt', () => {
  const good = { hoTen: 'Khách mới', sdt: '+84901234567', matKhau: 'Mật khẩu thử 2026!' };
  assert.equal(registrationInput(good).sdt, '0901234567');
  for (const key of ['MaKH', 'DiemTichLuy', 'gia', '$where', '__proto__']) {
    const body = JSON.parse(JSON.stringify(good)); Object.defineProperty(body, key, { value: 100, enumerable: true });
    assert.throws(() => registrationInput(body));
  }
  assert.throws(() => registrationInput({ ...good, email: 'not-email' }));
  assert.throws(() => registrationInput({ ...good, hoTen: '\u0000wrong' }));
  assert.throws(() => loginInput({ sdt: '0901234567', matKhau: good.matKhau, maKH: 'other' }));
});
test('Rate limit: đúng 5 lần, key gắn IP/SĐT, hết cửa sổ với đồng hồ giả', () => {
  let now = 0; const limiter = new AttemptLimiter({ now: () => now });
  for (let i = 0; i < 5; i++) limiter.consume('ip-A', '0901234567');
  assert.throws(() => limiter.consume('ip-A', '0901234567'), error => error.status === 429 && error.retryAfter === 900);
  assert.doesNotThrow(() => limiter.consume('ip-B', '0901234567'));
  now = 900000;
  assert.doesNotThrow(() => limiter.consume('ip-A', '0901234567'));
});
test('Rate limit IP chặn đổi SĐT, thành công không tính là login sai', () => {
  const limiter = new AttemptLimiter();
  for (let i = 0; i < 30; i++) { limiter.consume('A', '0901234567'); limiter.success('A', '0901234567'); }
  for (let i = 0; i < 20; i++) limiter.consume('A', String(i));
  assert.throws(() => limiter.check('A', 'new'), { status: 429 });
  assert.doesNotThrow(() => limiter.consume('A', 'phone', 'register'));
});
test('Rate limiter có giới hạn bộ nhớ, không tự quên bucket đang khóa để né giới hạn', () => {
  const limiter = new AttemptLimiter({ maxBuckets: 2 });
  limiter.consume('A', 'one');
  assert.throws(() => limiter.consume('B', 'two'), { status: 429 });
});
test('Session ngẫu nhiên, rotate chống fixation, logout vô hiệu SID cũ', () => {
  const sessions = new SessionStore(); const first = sessions.create();
  assert.match(first.sid, /^[a-f0-9]{64}$/); assert.notEqual(first.sid, first.session.csrfToken);
  const next = sessions.rotate(first.sid, 'KH_ONL_abc');
  assert.equal(sessions.get(first.sid), null); assert.notEqual(next.session.csrfToken, first.session.csrfToken);
  assert.equal(sessions.get(next.sid).maKH, 'KH_ONL_abc');
  sessions.destroy(next.sid); assert.equal(sessions.get(next.sid), null);
});
test('Session idle/absolute expiry gồm đúng ranh giới và chống đầy bộ nhớ', () => {
  let now = 0; const sessions = new SessionStore({ now: () => now, idleMs: 30, absoluteMs: 80, maxSessions: 1 });
  const first = sessions.create();
  assert.throws(() => sessions.create(), { status: 429 });
  now = 29; assert.ok(sessions.get(first.sid)); now = 59; assert.equal(sessions.get(first.sid), null);
  const next = sessions.create();
  for (const value of [79, 99, 119]) { now = value; assert.ok(sessions.get(next.sid)); }
  now = 139; assert.equal(sessions.get(next.sid), null);
});
test('Cookie httpOnly + SameSite + scope đúng, reject cookie trùng hoặc malformed', () => {
  const { sid } = new SessionStore().create();
  assert.equal(readSessionCookie(`other=x; store_sid=${sid}`), sid);
  assert.equal(readSessionCookie(`store_sid=${sid}; store_sid=${sid}`), null);
  assert.equal(readSessionCookie('store_sid=broken'), null);
  assert.deepEqual(cookieOptions(true), { httpOnly: true, sameSite: 'strict', secure: true, path: '/store-api', maxAge: 28800000 });
  assert.equal(cookieOptions(false).secure, false);
});
test('CSRF: cần đúng Origin, session và token, không chấp nhận token phiên khác', () => {
  const sessions = new SessionStore(); const a = sessions.create(); const b = sessions.create();
  const good = { origin: 'http://localhost:3001', expectedOrigin: 'http://localhost:3001', session: a.session, token: a.session.csrfToken };
  assert.doesNotThrow(() => checkCsrf(good));
  for (const changed of [{ origin: undefined }, { origin: 'null' }, { origin: 'http://evil.local' }, { session: null }, { token: '' }, { token: b.session.csrfToken }, { token: ['x'] }]) assert.throws(() => checkCsrf({ ...good, ...changed }), { status: 403 });
});
test('DTO hồ sơ chỉ có field cho phép, không có hash/salt/nội bộ', () => {
  const result = customerDto({ MaKH: 'KH_X', HoTen: 'Demo', MatKhau: 'plain', MatKhauBam: 'hash', Salt: 'salt', ThamSoBam: {}, DiemDaCongOnline: ['X'] });
  assert.deepEqual(result, { MaKH: 'KH_X', HoTen: 'Demo' });
});
