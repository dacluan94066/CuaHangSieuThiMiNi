import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { StoreError } from '../src/store/errors.js';
import { memoryAdmin, loginMemoryAdmin } from './helpers/admin-memory.js';

test('HTTP trong bộ nhớ: session/login/logout/profile, CSRF, DTO và /api 405', async t => {
  const origin = 'http://localhost:3001';
  const config = { storeOrigin: origin, storeCookieSecure: false };
  let calls = 0;
  const profile = { MaKH: 'KH_ONL_memory', HoTen: 'Khách bộ nhớ', SDT: '0901234567', DiemTichLuy: 0, MatKhauBam: 'secret', Salt: 'secret', ThamSoBam: {} };
  const accounts = {
    profile: async maKH => { calls++; assert.equal(maKH, profile.MaKH); return profile; },
    login: async input => {
      calls++;
      if (input.sdt === '0900000000') throw new Error('MatKhau=private Salt=private mongodb://do-not-expose');
      if (input.matKhau === 'Wrong password 2026!') throw new StoreError(401, 'INVALID_CREDENTIALS'); return profile;
    },
    register: async () => { calls++; return profile; }
  };
  const db = { collection: async () => ({ countDocuments: async () => 6 }) };
  const admin = await memoryAdmin(config);
  const server = createApp({ config, db, store: { accounts }, adminAuth: admin.adminAuth }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = ''; let csrf = '';
  async function request(path, options = {}) {
    const response = await fetch(base + path, { ...options, headers: { Cookie: cookie, ...options.headers } });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const body = await response.json();
    assert.doesNotMatch(JSON.stringify(body), /MatKhau|"Salt"|ThamSoBam|mongodb:\/\//i);
    return { response, body };
  }
  let result = await request('/store-api/session');
  assert.equal(result.response.status, 200); assert.equal(result.body.data.authenticated, false); csrf = result.body.data.csrfToken;
  assert.match(result.response.headers.get('set-cookie'), /HttpOnly/); assert.match(result.response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.match(result.response.headers.get('set-cookie'), /Path=\/store-api/);
  assert.equal((await request('/store-api/tai-khoan')).response.status, 401);
  for (const path of ['/store-api/auth/dang-ky', '/store-api/auth/dang-nhap', '/store-api/auth/dang-xuat']) {
    assert.equal((await request(path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' })).response.status, 403);
  }
  assert.equal(calls, 0);
  const write = (body, extra = {}) => ({ method: 'POST', headers: { Origin: origin, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  assert.equal((await request('/store-api/auth/dang-ky', write({ oversized: 'a'.repeat(17000) }))).response.status, 413);
  assert.equal((await request('/store-api/auth/dang-nhap', { ...write({}), body: '{broken' })).response.status, 400);
  assert.equal((await request('/store-api/auth/dang-nhap', write({}, { Origin: 'http://evil.local' }))).response.status, 403);
  const failure = await request('/store-api/auth/dang-nhap', write({ sdt: '0900000000', matKhau: 'Memory password 2026!' }));
  assert.equal(failure.response.status, 500); assert.equal(failure.body.error.code, 'INTERNAL_ERROR'); assert.doesNotMatch(JSON.stringify(failure.body), /private/);
  assert.equal((await request('/store-api/auth/dang-nhap', write({ sdt: '0901234567', matKhau: 'Wrong password 2026!' }))).response.status, 401);
  const oldCookie = cookie; const oldCsrf = csrf;
  result = await request('/store-api/auth/dang-nhap', write({ sdt: '0901234567', matKhau: 'Memory password 2026!' }));
  assert.equal(result.response.status, 200); assert.notEqual(cookie, oldCookie); csrf = result.body.data.csrfToken; assert.notEqual(csrf, oldCsrf);
  assert.equal((await request('/store-api/tai-khoan')).body.data.MaKH, profile.MaKH);
  assert.equal((await request('/store-api/session')).body.data.authenticated, true);
  assert.equal((await request('/store-api/tai-khoan?maKH=another')).response.status, 400);
  assert.equal((await request('/store-api/auth/dang-ky', write({ hoTen: 'Demo', sdt: '0901234567', matKhau: 'Memory password 2026!', DiemTichLuy: 999 }))).response.status, 400);
  assert.equal((await request('/store-api/auth/dang-xuat', write({}, { 'X-CSRF-Token': oldCsrf }))).response.status, 403);
  assert.equal((await request('/store-api/auth/dang-xuat', write({}))).response.status, 200);
  assert.equal((await request('/store-api/tai-khoan')).response.status, 401);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    for (const path of ['/api', '/api/health', '/api/san-pham']) assert.equal((await request(path, { method })).response.status, 405);
  }
  assert.equal((await request('/api/health')).response.status, 401);
  const adminLogin = await loginMemoryAdmin(base, admin);
  assert.equal((await request('/api/health', { headers: { Cookie: adminLogin.cookie } })).response.status, 200);
  assert.equal((await request('/store-api/session', { method: 'POST' })).response.status, 405);
  for (const method of ['HEAD', 'OPTIONS']) assert.equal((await fetch(base + '/store-api/session', { method })).status, 405);
  for (const path of ['/store-api/san-pham', '/store-api/gio-hang', '/store-api/don-hang']) assert.equal((await request(path)).response.status, 404);
});
