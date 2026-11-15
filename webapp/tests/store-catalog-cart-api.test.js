import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { createStoreDatabase } from '../src/store/database.js';
import { createAccounts } from '../src/store/accounts.js';
import { createCatalog } from '../src/store/catalog.js';
import { createCartService } from '../src/store/cart.js';
import { assertTestDatabase } from '../src/store/guards.js';
import { inspectStore } from '../src/store/preflight.js';
import { escapeRegex } from '../src/utils/query.js';
import { memoryAdmin, loginMemoryAdmin } from './helpers/admin-memory.js';

test('S2 HTTP Test — catalog public, giỏ, CSRF, chuyển giỏ khi login và static shop', async t => {
  let phase = 'GUARD';
  try {
    const config = loadConfig({ testMode: true });
    assertTestDatabase(config, config.dbName);
    assert.equal(process.env.STORE_SHOP_API_TESTS, 'ALLOW_TEST_ACCOUNT', 'Cần opt-in tạo một tài khoản trên Test');
    const probe = new MongoClient(config.mongoUri, { family: 4, serverSelectionTimeoutMS: 3000, retryWrites: false });
    t.after(() => probe.close()); await probe.connect();
    const db = probe.db(config.dbName); assertTestDatabase(config, db.databaseName);
    assert.equal((await inspectStore(db)).ready, true);
    const before = await db.collection('KhachHang').countDocuments({});
    const database = createStoreDatabase(config); const admin = createDatabase(config);
    t.after(async () => { await database.close(); await admin.close(); });
    const catalog = createCatalog(database);
    const adminFixture = await memoryAdmin(config);
    const server = createApp({ config, db: admin, adminAuth: adminFixture.adminAuth, store: { accounts: createAccounts({ config, database }), catalog, carts: createCartService(catalog) } }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie = ''; let csrf;
    const checks = [];
    async function call(path, method = 'GET', body, extra = {}) {
      const token = Object.hasOwn(extra, 'csrf') ? extra.csrf : csrf;
      const response = await fetch(base + path, { method, headers: { Cookie: extra.cookie ?? cookie, Origin: extra.origin ?? config.storeOrigin,
        ...(token != null ? { 'X-CSRF-Token': token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const result = await response.json();
      assert.doesNotMatch(JSON.stringify(result), /"(?:MatKhau[^"\s]*|Salt|ThamSoBam|DonGiaNhap|MaNCC|NhaCungCap|GiuChoOnline|DiemDaCongOnline)"|mongodb(?:\+srv)?:\/\//i);
      if (result.data?.csrfToken) csrf = result.data.csrfToken;
      checks.push({ method, path, status: response.status, ...(result.pagination ? { total: result.pagination.total } : {}) });
      return { status: response.status, body: result };
    }
    phase = 'CATALOG';
    const categories = await call('/store-api/danh-muc?limit=100'); assert.equal(categories.status, 200); assert.equal(categories.body.pagination.total, 6);
    const list = await call('/store-api/san-pham?limit=100'); assert.equal(list.status, 200); assert.equal(list.body.pagination.total, await db.collection('SanPham').countDocuments({}));
    assert.equal(list.body.data.length, 21);
    const second = await call('/store-api/san-pham?page=2&limit=20'); assert.equal(second.body.data.length, 1);
    for (const code of list.body.data.map(item => item.MaSP)) assert.equal((await call(`/store-api/san-pham/${code}`)).status, 200);
    assert.equal((await call('/store-api/san-pham/NOT_EXISTS')).status, 404);
    for (const q of ['.*', '(']) {
      const found = await call(`/store-api/san-pham?${new URLSearchParams({ q, limit: '100' })}`);
      assert.equal(found.status, 200);
      assert.equal(found.body.pagination.total, await db.collection('SanPham').countDocuments({ $or: ['MaSP', 'TenSP'].map(field => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } })) }));
    }
    const filtered = await call('/store-api/san-pham?maDM=DM01&giaTu=5000&giaDen=10000&sort=gia-giam');
    assert.equal(filtered.body.pagination.total, await db.collection('SanPham').countDocuments({ MaDM: 'DM01', DonGiaBan: { $gte: 5000, $lte: 10000 } }));
    for (let i = 1; i < filtered.body.data.length; i++) assert.ok(filtered.body.data[i - 1].DonGiaBan >= filtered.body.data[i].DonGiaBan);
    const promotions = await call('/store-api/khuyen-mai'); assert.equal(promotions.status, 200);
    assert.ok(promotions.body.data.some(item => item.MaKM === 'KM003'));
    assert.ok(promotions.body.data.every(item => item.TrangThaiTinhToan === 'Đang áp dụng'));
    for (const path of ['/store-api/san-pham?limit=101', '/store-api/san-pham?q=a&q=b', '/store-api/san-pham?unknown=1', '/store-api/danh-muc?page=1&page=2', '/store-api/khuyen-mai?unknown=1', '/store-api/gio-hang?x=1', '/store-api/san-pham/SP001?x=1', '/store-api/san-pham?maDM[$ne]=x']) assert.equal((await call(path)).status, 400);

    phase = 'CART_CSRF';
    await call('/store-api/session');
    const empty = await call('/store-api/gio-hang'); assert.equal(empty.status, 200); assert.equal(empty.body.data.revision, 0);
    for (const [method, path, body] of [['POST', '/store-api/gio-hang/items', { maSP: 'SP001', soLuong: 1 }], ['PATCH', '/store-api/gio-hang/items/SP001', { soLuong: 1 }], ['DELETE', '/store-api/gio-hang/items/SP001'], ['DELETE', '/store-api/gio-hang']]) {
      assert.equal((await call(path, method, body, { csrf: null })).status, 403);
      assert.equal((await call(path, method, body, { csrf: '0'.repeat(64) })).status, 403);
      assert.equal((await call(path, method, body, { origin: 'http://evil.local' })).status, 403);
    }
    phase = 'CART';
    const stock = await db.collection('SanPham').findOne({ MaSP: 'SP001' }, { projection: { _id: 0, SoLuongTon: 1 } });
    assert.equal((await call('/store-api/gio-hang/items', 'POST', { maSP: 'SP020', soLuong: 1 })).status, 409);
    assert.equal((await call('/store-api/gio-hang/items', 'POST', { maSP: 'TEST_SP_LAST', soLuong: 2 })).status, 409);
    assert.equal((await call('/store-api/gio-hang/items', 'POST', { maSP: 'SP001', soLuong: 1, gia: 1 })).status, 400);
    assert.equal((await call('/store-api/gio-hang/items', 'POST', { maSP: 'SP001', soLuong: 100 })).status, 400);
    assert.equal((await call('/store-api/gio-hang/items', 'POST', { maSP: 'SP001', soLuong: 1 })).body.data.revision, 1);
    let cart = await call('/store-api/gio-hang/items', 'POST', { maSP: 'SP001', soLuong: 2 });
    assert.equal(cart.body.data.soMa, 1); assert.equal(cart.body.data.items[0].SoLuong, 3); assert.equal(cart.body.data.revision, 2);
    cart = await call('/store-api/gio-hang/items/SP001', 'PATCH', { soLuong: 2 }); assert.equal(cart.status, 200); assert.equal(cart.body.data.revision, 3);
    assert.equal((await call('/store-api/gio-hang/items/SP001', 'PATCH', { soLuong: 2 })).body.data.revision, 3);
    const current = await db.collection('SanPham').findOne({ MaSP: 'SP001' }, { projection: { _id: 0, DonGiaBan: 1, TenSP: 1 } });
    cart = await call('/store-api/gio-hang'); assert.equal(cart.body.data.tongTamTinh, current.DonGiaBan * 2); assert.equal(cart.body.data.items[0].SanPham.TenSP, current.TenSP);

    phase = 'LOGIN_CART_TRANSFER';
    const oldCookie = cookie; const oldCsrf = csrf;
    let phone;
    for (let i = 0; i < 10; i++) { const candidate = '09' + String(randomInt(100000000)).padStart(8, '0'); if (!await db.collection('KhachHang').countDocuments({ SDT: candidate })) { phone = candidate; break; } }
    assert.ok(phone);
    const password = 'S2-Test-' + randomUUID();
    assert.equal((await call('/store-api/auth/dang-ky', 'POST', { hoTen: '[TEST] S2 cart transfer', sdt: phone, matKhau: password })).status, 201);
    assert.equal((await call('/store-api/auth/dang-nhap', 'POST', { sdt: phone, matKhau: password })).status, 200);
    assert.notEqual(cookie, oldCookie); assert.notEqual(csrf, oldCsrf);
    cart = await call('/store-api/gio-hang'); assert.equal(cart.body.data.items[0].SoLuong, 2); assert.equal(cart.body.data.revision, 3);
    assert.equal((await call('/store-api/tai-khoan')).status, 200);
    assert.equal((await call('/store-api/gio-hang', 'DELETE', undefined, { cookie: oldCookie, csrf: oldCsrf })).status, 403);
    assert.equal((await call('/store-api/gio-hang/items/SP001', 'DELETE')).body.data.revision, 4);
    assert.equal((await call('/store-api/gio-hang/items/SP001', 'DELETE')).status, 404);
    await call('/store-api/gio-hang/items', 'POST', { maSP: 'SP001', soLuong: 1 });
    assert.equal((await call('/store-api/gio-hang', 'DELETE')).body.data.revision, 6);
    assert.equal((await call('/store-api/gio-hang', 'DELETE')).body.data.revision, 6);
    assert.equal((await call('/store-api/auth/dang-xuat', 'POST', {})).status, 200);
    assert.equal(await db.collection('KhachHang').countDocuments({}), before + 1);
    assert.equal((await db.collection('SanPham').findOne({ MaSP: 'SP001' })).SoLuongTon, stock.SoLuongTon);

    phase = 'ADMIN_AND_STATIC';
    assert.equal((await call('/api/health')).status, 401); // Customer session cannot authenticate an employee.
    const employee = await loginMemoryAdmin(base, adminFixture);
    assert.equal((await call('/api/health', 'GET', undefined, { cookie: employee.cookie })).status, 200);
    for (const method of ['POST', 'PUT', 'DELETE']) for (const path of ['/api', '/api/health', '/api/san-pham']) assert.equal((await call(path, method)).status, 405);
    for (const path of ['/store-api/don-hang', '/store-api/thanh-toan/xem-truoc']) assert.equal((await call(path)).status, 404);
    const assets = ['/shop/', '/shop/shop.css', ...['app', 'api', 'dom', 'format', 'catalog', 'cart', 'account'].map(name => `/shop/js/${name}.js`)];
    for (const path of assets) {
      const response = await fetch(base + path); assert.equal(response.status, 200);
      const text = await response.text(); assert.ok(text.length > 0);
      if (path.endsWith('.js')) assert.ok(!text.includes('innerHTML'));
      checks.push({ method: 'GET', path, status: response.status });
    }
    assert.equal((await fetch(base + '/.env.test')).status, 404);
    t.diagnostic(JSON.stringify({ database: db.databaseName, checksPassed: checks.length, checks, newCustomers: 1, stockUnchanged: true, browserVisualVerified: false }));
  } catch (error) {
    throw new Error(`S2 HTTP verification failed at ${phase} (${error?.code === 'ERR_ASSERTION' ? 'assertion' : 'safe error'}); no raw input/driver output.`);
  }
});
