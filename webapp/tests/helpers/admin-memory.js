import assert from 'node:assert/strict';
import { createAdminAuth } from '../../src/admin-auth/index.js';
import { createAdminPasswords } from '../../src/admin-auth/security.js';
let secretPromise;
export async function memoryAdmin(config = {}) {
  const password = 'Memory admin password 2026!';
  secretPromise ||= createAdminPasswords().hash(password); const secret = await secretPromise;
  const roles = ['Quản trị', 'Thu ngân', 'Kho', 'Bán hàng']; const names = ['memory_admin', 'memory_cashier', 'memory_stock', 'memory_sales'];
  const records = new Map(names.map((name, i) => [name, { account: { TenDangNhap: name, MaNV: 'MEM_NV' + i, VaiTro: roles[i], TrangThai: 'Hoạt động' }, credential: { TenDangNhap: name, MaNV: 'MEM_NV' + i, ...secret, PhienBanXacThuc: 1, TrangThaiBaoMat: 'HoatDong', ChinhSachMatKhau: 'IMPORT_DEMO' }, employee: { MaNV: 'MEM_NV' + i, HoTen: 'Nhân viên bộ nhớ ' + i, TrangThai: 'Đang làm' } }]));
  const effective = { ...config, adminOrigin: config.adminOrigin || config.storeOrigin || 'http://localhost:3001' };
  const repository = { async load(name) { return records.has(name) ? structuredClone(records.get(name)) : null; }, async close() {} };
  return { adminAuth: createAdminAuth({ config: effective, repository }), repository, records, names, password, origin: effective.adminOrigin };
}
export async function loginMemoryAdmin(base, fixture, index = 0) {
  const bootstrap = await fetch(base + '/admin-auth/session'); const initial = await bootstrap.json();
  const cookie = bootstrap.headers.get('set-cookie').split(';')[0];
  const response = await fetch(base + '/admin-auth/dang-nhap', { method: 'POST', headers: { Cookie: cookie, Origin: fixture.origin, 'X-CSRF-Token': initial.data.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tenDangNhap: fixture.names[index], matKhau: fixture.password }) });
  assert.equal(response.status, 200); const json = await response.json();
  return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: json.data.csrfToken, user: json.data.user, oldCookie: cookie, oldCsrf: initial.data.csrfToken };
}
