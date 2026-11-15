import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createAdminAuth } from '../src/admin-auth/index.js';
import { AdminSessions, AdminLimiter, assertAdminTarget, createAdminPasswords, checkAdminCsrf, readAdminCookie } from '../src/admin-auth/security.js';
import { ROUTE_POLICIES, canRead, projectResponse } from '../src/admin-auth/policy.js';
import { planAdminImport } from '../scripts/setup-admin-auth.js';
import { memoryAdmin, loginMemoryAdmin } from './helpers/admin-memory.js';

const config = { dbName: 'QLSieuThiMini_Test', port: 3001, adminOrigin: 'http://localhost:3001', storeOrigin: 'http://localhost:3001', storeCookieSecure: false };
function fakeDatabase() {
  let reads = 0;
  const product = { MaSP: 'SP001', TenSP: 'Sản phẩm bộ nhớ', DonGiaBan: 10000, DonGiaNhap: 5000, MaNCC: 'NCC01', TenNCC: 'NCC bộ nhớ', NhaCungCap: { SDT: 'private-supply' }, SoLuongTon: 10, MatKhauBam: 'private-test', Salt: 'private-test', GiuChoOnline: [] };
  const cursor = data => ({ sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return data; } });
  return { get reads() { return reads; }, async collection(name) {
    reads++;
    return { async countDocuments() { return 1; }, find() { return cursor([{ MaKH: 'KH001', HoTen: 'Khách bộ nhớ', DiemTichLuy: 0 }]); }, aggregate(stages) {
      if (stages.some(stage => stage.$facet)) return cursor([{ items: [], data: [], total: [], groups: [] }]);
      if (stages[0]?.$match?.MaSP) return cursor([product]);
      if (stages[0]?.$match?.MaHD) return cursor([{ MaHD: 'HD001', ChiTiet: [], TongTien: 0, ThanhTien: 0 }]);
      if (stages[0]?.$match?.MaPN) return cursor([{ MaPN: 'PN001', ChiTiet: [], TongTien: 0 }]);
      if (name === 'KhachHang' && stages[0]?.$match?.MaKH) return cursor([{ MaKH: 'KH001', HoTen: 'Khách bộ nhớ', DiemTichLuy: 0 }]);
      return cursor([]);
    } };
  } };
}
async function open(t, fixture, db = fakeDatabase(), store) {
  const server = createApp({ config, db, adminAuth: fixture.adminAuth, store }).listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { base: `http://127.0.0.1:${server.address().port}`, db };
}
const paths = Object.keys(ROUTE_POLICIES).map(path => path.replace(':maSP', 'SP001').replace(':maHD', 'HD001').replace(':maPN', 'PN001').replace(':maKH', 'KH001'));
async function checked(response, status) { const body = await response.json(); assert.equal(response.status, status, JSON.stringify(body)); assert.doesNotMatch(JSON.stringify(body), /"(?:MatKhau[^"\s]*|Salt|ThamSoBam|SID|GiuChoOnline|DiemDaCongOnline|journal|Snapshot)"|mongodb(?:\+srv)?:\/\//i); return body; }

test('Admin AA-01/02/03: 21 routes × 4 roles, anonymous, không đọc DB trước 401/403', async t => {
  const fixture = await memoryAdmin(config); const { base, db } = await open(t, fixture); let http = 0;
  assert.equal(paths.length, 21);
  for (const path of paths) {
    await checked(await fetch(base + '/api' + path), 401); http++;
    for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) { assert.equal((await fetch(base + '/api' + path, { method })).status, 405); http++; }
  } assert.equal(db.reads, 0);
  for (const [i] of fixture.names.entries()) {
    const auth = await loginMemoryAdmin(base, fixture, i);
    for (const [index, path] of paths.entries()) {
      const before = db.reads; const allowed = canRead(auth.user.role, Object.values(ROUTE_POLICIES)[index]);
      await checked(await fetch(base + '/api' + path, { headers: { Cookie: auth.cookie } }), allowed ? 200 : 403); http++;
      if (!allowed) assert.equal(db.reads, before);
      for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) { const response = await fetch(base + '/api' + path, { method, headers: { Cookie: auth.cookie } }); assert.equal(response.status, 405); http++; }
    }
    const product = await checked(await fetch(base + '/api/san-pham/SP001', { headers: { Cookie: auth.cookie } }), 200);
    assert.equal(Object.hasOwn(product.data, 'DonGiaNhap'), ['Quản trị', 'Kho'].includes(auth.user.role));
    if (['Thu ngân', 'Bán hàng'].includes(auth.user.role)) await checked(await fetch(base + '/api/san-pham?maNCC=NCC01', { headers: { Cookie: auth.cookie } }), 403);
    await checked(await fetch(base + '/api/not-found', { headers: { Cookie: auth.cookie } }), 404);
  }
  for (const path of ['/api', '/API/health', '/api/health/', '/api/%68ealth', '/api/dashboard-extra']) await checked(await fetch(base + path), 401);
  t.diagnostic(JSON.stringify({ matrixHttpChecks: http, roles: 4, templates: paths.length, dataWrites: 0 }));
});
test('Admin AA-04/08/12: CSRF/Origin, SID xoay, logout; cookie khách không được dùng', async t => {
  const fixture = await memoryAdmin(config); const { base } = await open(t, fixture, fakeDatabase(), { accounts: { async profile() { return { MaKH: 'MEM_CUSTOMER', HoTen: 'Khách' }; } } }); const auth = await loginMemoryAdmin(base, fixture);
  assert.notEqual(auth.cookie, auth.oldCookie); assert.notEqual(auth.csrf, auth.oldCsrf);
  await checked(await fetch(base + '/api/health', { headers: { Cookie: auth.oldCookie } }), 401);
  await checked(await fetch(base + '/api/health', { headers: { Cookie: auth.cookie.replace('admin_sid=', 'store_sid=') } }), 401);
  await checked(await fetch(base + '/store-api/tai-khoan', { headers: { Cookie: auth.cookie } }), 401);
  const post = (csrf, origin = config.adminOrigin) => fetch(base + '/admin-auth/dang-xuat', { method: 'POST', headers: { Cookie: auth.cookie, Origin: origin, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, body: '{}' });
  await checked(await post(''), 403); await checked(await post(auth.oldCsrf), 403); await checked(await post(auth.csrf, 'http://localhost:9999'), 403);
  const response = await post(auth.csrf); const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Path=\//); await checked(response, 200);
  await checked(await fetch(base + '/api/health', { headers: { Cookie: auth.cookie } }), 401);
});
test('Admin AA-05/06/11: nghỉ/khóa/role lạ/NV_ONLINE/hash hỏng, thông báo chung, thu hồi phiên', async t => {
  const fixture = await memoryAdmin(config); const { base } = await open(t, fixture); const auth = await loginMemoryAdmin(base, fixture);
  const row = fixture.records.get(fixture.names[0]); row.employee.TrangThai = 'Tạm nghỉ'; await checked(await fetch(base + '/api/health', { headers: { Cookie: auth.cookie } }), 401);
  row.employee.TrangThai = 'Đang làm';
  async function invalid(name, patch) {
    const isolated = await memoryAdmin(config); if (patch) patch(isolated.records.get(isolated.names[0]));
    const app = await open(t, isolated); const bootstrap = await fetch(app.base + '/admin-auth/session'); const data = await bootstrap.json();
    return checked(await fetch(app.base + '/admin-auth/dang-nhap', { method: 'POST', headers: { Cookie: bootstrap.headers.get('set-cookie').split(';')[0], Origin: config.adminOrigin, 'X-CSRF-Token': data.data.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tenDangNhap: name || isolated.names[0], matKhau: isolated.password }) }), 401);
  }
  const expected = (await invalid('not_existing')).error;
  for (const patch of [r => { r.account.TrangThai = 'Khóa'; }, r => { r.employee.TrangThai = 'Tạm nghỉ'; }, r => { r.account.VaiTro = 'Unknown'; }, r => { r.account.MaNV = r.employee.MaNV = r.credential.MaNV = 'NV_ONLINE'; }, r => { r.credential.Salt = 'bad'; }]) assert.deepEqual((await invalid(null, patch)).error, expected);
  const next = await loginMemoryAdmin(base, fixture); row.credential.PhienBanXacThuc++; await checked(await fetch(base + '/api/health', { headers: { Cookie: next.cookie } }), 401);
});
test('Admin AA-07: 6 HTTP đồng thời, giữ lượt trước await; chỉ 5 KDF được thử', async t => {
  const fixture = await memoryAdmin(config); const { base } = await open(t, fixture); const bootstrap = await fetch(base + '/admin-auth/session'); const data = await bootstrap.json();
  const statuses = await Promise.all(Array.from({ length: 6 }, async () => (await fetch(base + '/admin-auth/dang-nhap', { method: 'POST', headers: { Cookie: bootstrap.headers.get('set-cookie').split(';')[0], Origin: config.adminOrigin, 'X-CSRF-Token': data.data.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tenDangNhap: fixture.names[0], matKhau: 'wrong' }) })).status));
  assert.deepEqual(statuses.sort(), [401, 401, 401, 401, 401, 429]);
});
test('Admin AA-09/10: session idle/absolute, restart, CSRF và cookie trùng', () => {
  let now = 0; const sessions = new AdminSessions({ now: () => now, idleMs: 10, absoluteMs: 20 }); const a = sessions.create();
  now = 9; assert.ok(sessions.get(a.sid)); now = 10; assert.equal(sessions.get(a.sid), null);
  now = 0; const b = sessions.create(); now = 9; sessions.get(b.sid, true); now = 18; sessions.get(b.sid, true); now = 20; assert.equal(sessions.get(b.sid), null);
  assert.equal(new AdminSessions().get(a.sid), null); assert.equal(readAdminCookie('admin_sid=' + a.sid + '; admin_sid=' + a.sid), null);
  assert.throws(() => checkAdminCsrf('null', config.adminOrigin, a.session, a.session.csrfToken));
});
test('Admin AA-10 HTTP: app mới không khôi phục login bằng SID của app cũ', async t => {
  const first = await memoryAdmin(config); const a = await open(t, first); const auth = await loginMemoryAdmin(a.base, first);
  const next = await memoryAdmin(config); const b = await open(t, next);
  const response = await checked(await fetch(b.base + '/admin-auth/session', { headers: { Cookie: auth.cookie } }), 200);
  assert.equal(response.data.authenticated, false); await checked(await fetch(b.base + '/api/health', { headers: { Cookie: auth.cookie } }), 401);
});
test('Admin AA-07 unit: IP không được xóa lần sai khi có login thành công', () => {
  let now = 0; const limiter = new AdminLimiter({ now: () => now, windowMs: 10 });
  for (let i = 0; i < 20; i++) limiter.reserve('ip', 'name' + i)(false);
  assert.throws(() => limiter.reserve('ip', 'new')); now = 10; limiter.reserve('ip', 'new')(true);
});
test('Admin AA-13/16: lọc sâu field riêng tư và thông tin NCC', () => {
  assert.deepEqual(projectResponse({ data: [{ TenSP: 'A', DonGiaNhap: 3, MaNCC: 'N', NhaCungCap: { Salt: 'private' }, nested: { MatKhau: 'private', valid: 1 }, ThamChieuThieu: ['MaDM', 'MaNCC'] }] }, true), { data: [{ TenSP: 'A', nested: { valid: 1 }, ThamChieuThieu: ['MaDM'] }] });
});
test('Admin AA-17/18/19: guard, import idempotent, nguồn đổi phải dừng, reset không bị import ghi đè', async () => {
  assert.throws(() => assertAdminTarget('QLSieuThiMini')); assert.throws(() => assertAdminTarget('QLSieuThiMini_Test_other')); assertAdminTarget('QLSieuThiMini_Test');
  const passwords = createAdminPasswords(); const source = [{ TenDangNhap: 'seed', MaNV: 'MEM', VaiTro: 'Kho', TrangThai: 'Hoạt động', MatKhau: 'seed' }]; const employees = [{ MaNV: 'MEM', TrangThai: 'Đang làm' }];
  const first = await planAdminImport(source, employees, [], passwords); assert.equal(first.plans.length, 1); assert.ok(!Object.hasOwn(first.plans[0], 'MatKhau'));
  const second = await planAdminImport(source, employees, first.plans, passwords); assert.equal(second.plans.length, 0); assert.equal(second.counts.skip, 1);
  await assert.rejects(planAdminImport([{ ...source[0], MatKhau: 'changed' }], employees, first.plans, passwords));
  const reset = [{ ...first.plans[0], ChinhSachMatKhau: 'DAT_LAI' }]; assert.equal((await planAdminImport(source, employees, reset, passwords)).counts.skip, 1);
  await assert.rejects(passwords.hash('short', 12)); assert.equal(await passwords.verify('seed', first.plans[0]), true);
});
test('Admin AA-20: Main và thiếu thiết lập không mở lại anonymous', async t => {
  const auth = createAdminAuth({ config: { ...config, dbName: 'QLSieuThiMini' } }); const { base, db } = await open(t, { adminAuth: auth });
  await checked(await fetch(base + '/api/dashboard'), 401); assert.equal(db.reads, 0);
  const bootstrap = await fetch(base + '/admin-auth/session'); const data = await bootstrap.json();
  const response = await fetch(base + '/admin-auth/dang-nhap', { method: 'POST', headers: { Cookie: bootstrap.headers.get('set-cookie').split(';')[0], Origin: config.adminOrigin, 'X-CSRF-Token': data.data.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tenDangNhap: 'none', matKhau: 'not-secret' }) });
  assert.equal((await checked(response, 503)).error.code, 'ADMIN_AUTH_TARGET_FORBIDDEN');
});
