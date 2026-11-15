// REAL WRITES: manual opt-in only AFTER the user restores and sets up the Test DB.
// This harness starts its own ephemeral server; never targets the server on :3000.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { createStoreDatabase } from '../src/store/database.js';
import { createAccounts } from '../src/store/accounts.js';
import { assertTestDatabase } from '../src/store/guards.js';
import { inspectStore } from '../src/store/preflight.js';
import { createPasswordService } from '../src/store/passwords.js';

test('S1 integration — bản sao đã restore/setup, có xác nhận cho phép ghi Test', async t => {
  let phase = 'GUARDS';
  try {
  // Fail before connection, server creation or any possible write. No dotenv fallback.
  const config = { dbName: process.env.DB_NAME, mongoUri: process.env.MONGO_URI, storeWriteEnabled: true, storeCookieSecure: false, storeOrigin: 'http://localhost:3001' };
  assertTestDatabase(config, config.dbName);
  assert.equal(process.env.STORE_API_WRITE_TESTS, 'I_RESTORED_QLSieuThiMini_Test', 'Chưa có xác nhận thủ công DB Test');
  assert.ok(config.mongoUri, 'Thiếu MONGO_URI; không dùng URI mặc định');
  const uri = new URL(config.mongoUri);
  assert.equal(uri.protocol, 'mongodb:'); assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname));
  phase = 'PREFLIGHT';
  const probe = new MongoClient(config.mongoUri, { family: 4, serverSelectionTimeoutMS: 3000, retryWrites: false });
  t.after(() => probe.close()); await probe.connect();
  const target = probe.db(config.dbName); assertTestDatabase(config, target.databaseName);
  const readiness = await inspectStore(target); assert.equal(readiness.ready, true, 'Chưa setup/phục hồi đầy đủ Test'); assert.equal(readiness.topology, 'standalone');
  const database = createStoreDatabase(config); const admin = createDatabase(config);
  t.after(async () => { await database.close(); await admin.close(); });
  const server = createApp({ config, db: admin, store: { accounts: createAccounts({ config, database }) } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie; let csrf;
  const checks = [];
  async function call(path, method = 'GET', body) {
    const response = await fetch(base + path, { method, headers: { Cookie: cookie || '', Origin: config.storeOrigin, 'X-CSRF-Token': csrf || '', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const data = await response.json(); assert.doesNotMatch(JSON.stringify(data), /matkhau|"salt"|thamSoBam|mongodb:\/\//i);
    if (data.data?.csrfToken) csrf = data.data.csrfToken;
    checks.push({ phase, path, method, status: response.status, ...(data.error ? { code: data.error.code } : {}) });
    return { status: response.status, body: data, retryAfter: response.headers.get('retry-after') };
  }
  async function freshPhone() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const phone = '09' + String(randomInt(100000000)).padStart(8, '0');
      if (!await target.collection('KhachHang').countDocuments({ SDT: phone }) && !await target.collection('TaiKhoanKhachHang').countDocuments({ SDT: phone })) return phone;
    }
    throw new Error('No fresh Test phone');
  }
  phase = 'SESSION_AND_CSRF';
  assert.equal((await call('/store-api/session')).status, 200);
  assert.equal((await call('/store-api/tai-khoan')).status, 401);
  const initialCsrf = csrf;
  csrf = '';
  for (const path of ['/store-api/auth/dang-ky', '/store-api/auth/dang-nhap', '/store-api/auth/dang-xuat']) {
    const rejected = await call(path, 'POST', {});
    assert.equal(rejected.status, 403); assert.equal(rejected.body.error.code, 'CSRF_INVALID');
  }
  csrf = initialCsrf;
  const sdt = await freshPhone();
  const body = { hoTen: '[TEST] S1 API', sdt, matKhau: 'Test-only-' + randomUUID() };
  const before = await target.collection('KhachHang').countDocuments({});
  phase = 'REGISTRATION_AND_LOGIN';
  const registered = await call('/store-api/auth/dang-ky', 'POST', body); assert.equal(registered.status, 201);
  const maKH = registered.body.data.MaKH;
  assert.equal((await target.collection('KhachHang').findOne({ MaKH: maKH })).DiemTichLuy, 0);
  assert.equal((await call('/store-api/auth/dang-ky', 'POST', body)).status, 409);
  assert.equal((await call('/store-api/auth/dang-nhap', 'POST', { sdt, matKhau: 'Wrong password 2026!' })).status, 401);
  assert.equal((await call('/store-api/auth/dang-nhap', 'POST', { sdt, matKhau: body.matKhau })).status, 200);
  assert.equal((await call('/store-api/tai-khoan')).body.data.MaKH, maKH);
  const valid = csrf; csrf = '0'.repeat(64);
  assert.equal((await call('/store-api/auth/dang-xuat', 'POST', {})).status, 403); csrf = valid;
  assert.equal((await call('/store-api/auth/dang-xuat', 'POST', {})).status, 200);
  assert.equal((await call('/store-api/tai-khoan')).status, 401);
  assert.equal(await target.collection('KhachHang').countDocuments({}), before + 1);

  phase = 'RATE_LIMIT';
  await call('/store-api/session');
  const unknownPhone = await freshPhone();
  for (let i = 0; i < 5; i++) {
    const rejected = await call('/store-api/auth/dang-nhap', 'POST', { sdt: unknownPhone, matKhau: 'Unknown-password-2026!' });
    assert.equal(rejected.status, 401); assert.equal(rejected.body.error.code, 'INVALID_CREDENTIALS');
  }
  const limited = await call('/store-api/auth/dang-nhap', 'POST', { sdt: unknownPhone, matKhau: 'Unknown-password-2026!' });
  assert.equal(limited.status, 429); assert.equal(limited.body.error.code, 'TOO_MANY_ATTEMPTS'); assert.ok(Number(limited.retryAfter) > 0);

  // Explicitly authorized Test-only fixtures model crashes at two persisted stages.
  // No failpoint is added to the public API or the production application.
  async function seedInterruptedRegistration(active) {
    assertTestDatabase(config, target.databaseName);
    const now = new Date();
    const maKH = 'KH_ONL_' + randomUUID().replaceAll('-', '');
    const maTKKH = 'TKKH_' + randomUUID().replaceAll('-', '');
    const operation = randomUUID();
    const phone = await freshPhone();
    const password = 'Recovery-Test-' + randomUUID();
    const secret = await createPasswordService().hash(password);
    const owned = { MaKH: maKH, MaYeuCauDangKy: operation };
    await target.collection('YeuCauCuaHang').insertOne({ MaYeuCau: operation, MaKH: maKH, MaTKKH: maTKKH,
      Loai: 'DANG_KY', TrangThai: 'DANG_XU_LY', Buoc: 'TEST_INTERRUPTED', NgayTao: now, NgayCapNhat: now });
    await target.collection('TaiKhoanKhachHang').insertOne({ ...owned, MaTKKH: maTKKH, SDT: phone, ...secret,
      TrangThai: active ? 'HoatDong' : 'DangTao', NgayTao: now, NgayCapNhat: now });
    await target.collection('KhachHang').insertOne({ ...owned, HoTen: '[TEST] S1 recovery', SDT: phone, DiemTichLuy: 0, NgayDangKy: now, NguonTao: 'ONLINE' });
    return { maKH, maTKKH, operation, phone, password };
  }
  async function triggerRecovery() {
    const registration = { hoTen: '[TEST] S1 recovery trigger', sdt: await freshPhone(), matKhau: 'Trigger-Test-' + randomUUID() };
    const result = await call('/store-api/auth/dang-ky', 'POST', registration);
    assert.equal(result.status, 201);
    assert.equal(result.body.data.DiemTichLuy, 0);
  }

  phase = 'RECOVERY_ROLLBACK';
  const pending = await seedInterruptedRegistration(false);
  assert.equal((await inspectStore(target)).pendingRegistrations, 1);
  const blocked = await call('/store-api/auth/dang-nhap', 'POST', { sdt, matKhau: body.matKhau });
  assert.equal(blocked.status, 503); assert.equal(blocked.body.error.code, 'RECOVERY_PENDING');
  await triggerRecovery();
  assert.equal(await target.collection('TaiKhoanKhachHang').countDocuments({ MaTKKH: pending.maTKKH }), 0);
  assert.equal(await target.collection('KhachHang').countDocuments({ MaKH: pending.maKH }), 0);
  assert.equal((await target.collection('YeuCauCuaHang').findOne({ MaYeuCau: pending.operation })).TrangThai, 'THAT_BAI');
  assert.equal((await inspectStore(target)).ready, true);

  phase = 'RECOVERY_FORWARD';
  const active = await seedInterruptedRegistration(true);
  assert.equal((await inspectStore(target)).pendingRegistrations, 1);
  await triggerRecovery();
  assert.equal(await target.collection('TaiKhoanKhachHang').countDocuments({ MaTKKH: active.maTKKH, TrangThai: 'HoatDong' }), 1);
  assert.equal(await target.collection('KhachHang').countDocuments({ MaKH: active.maKH }), 1);
  assert.equal((await target.collection('YeuCauCuaHang').findOne({ MaYeuCau: active.operation })).TrangThai, 'HOAN_TAT');
  assert.equal((await call('/store-api/auth/dang-nhap', 'POST', { sdt: active.phone, matKhau: active.password })).status, 200);
  assert.equal((await call('/store-api/tai-khoan')).body.data.MaKH, active.maKH);
  assert.equal((await call('/store-api/auth/dang-xuat', 'POST', {})).status, 200);
  assert.equal((await inspectStore(target)).ready, true);
  assert.equal(await target.collection('KhachHang').countDocuments({}), before + 4);
  assert.equal(await target.collection('YeuCauCuaHang').countDocuments({ TrangThai: { $in: ['DANG_XU_LY', 'CAN_PHUC_HOI'] } }), 0);
  t.diagnostic(JSON.stringify({ target: target.databaseName, checks, checksPassed: checks.length, newCustomers: 4, recoveryRollback: true, recoveryForward: true }));
  // Keep the clearly marked Test registration as evidence; no automatic DB cleanup.
  } catch (error) {
    // node:test prints thrown errors. Never pass raw Mongo errors/config to it.
    if (error?.code === 'ERR_ASSERTION') throw new Error(`S1 integration assertion failed at ${phase}; kiểm tra DB Test/setup và HTTP contract.`);
    if (error?.code === 'STORE_WRITES_DISABLED') throw new Error('Guard: DB_NAME phải đúng QLSieuThiMini_Test; chưa kết nối hoặc ghi.');
    throw new Error(`S1 integration failed safely at ${phase}; không in lỗi driver, body, hash hoặc URI.`);
  }
});
