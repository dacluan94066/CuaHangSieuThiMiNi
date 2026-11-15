import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { createStoreDatabase } from '../src/store/database.js';
import { createAccounts } from '../src/store/accounts.js';
import { createCatalog } from '../src/store/catalog.js';
import { createCartService } from '../src/store/cart.js';
import { createCheckout } from '../src/store/checkout.js';
import { createOrders } from '../src/store/orders.js';
import { inspectStore } from '../src/store/preflight.js';
import { assertStoreWriteTarget } from '../src/store/guards.js';
import { createTestActor, createTestProduct } from './helpers/store-test-fixtures.js';

test('S4 HTTP thật: chủ sở hữu, ONLINE, phân trang và snapshot sau đổi giá', async t => {
  let phase = 'GUARD';
  try {
    const config = { ...loadConfig({ testMode: true }), checkoutTestHarness: true };
    assertStoreWriteTarget(config, config.dbName); assert.equal(process.env.STORE_S4_API_TESTS, 'ALLOW_TEST_FIXTURES'); assert.equal(process.env.STORE_CHECKOUT_API_TESTS, 'ALLOW_TEST_CHECKOUT');
    const probe = new MongoClient(config.mongoUri, { family: 4, retryWrites: false, serverSelectionTimeoutMS: 3000 }); t.after(() => probe.close()); await probe.connect();
    const db = probe.db(config.dbName); assertStoreWriteTarget(config, db.databaseName); assert.equal((await inspectStore(db)).ready, true);
    const a = await createTestActor(db, config, 'S4 history A'); const b = await createTestActor(db, config, 'S4 history B'); const product = await createTestProduct(db, config, 'S4 snapshot');
    const database = createStoreDatabase(config); const admin = createDatabase(config); t.after(async () => { await database.close(); await admin.close(); });
    const catalog = createCatalog(database);
    const server = createApp({ config, db: admin, store: { accounts: createAccounts({ config, database }), catalog, carts: createCartService(catalog), orders: createOrders(database),
      checkout: createCheckout({ config, database, testHooks: { clock: () => new Date('2026-11-15T12:00:00Z') } }) } }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`; let checks = 0;
    function client() {
      let cookie = ''; let csrf;
      return { async call(path, method = 'GET', body, key) {
        const response = await fetch(base + path, { method, headers: { Cookie: cookie, Origin: config.storeOrigin, ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]; const result = await response.json(); checks++;
        assert.doesNotMatch(JSON.stringify(result), /"(?:MatKhau[^"\s]*|Salt|SID|Snapshot|GiuChoOnline|DiemDaCongOnline|journal|DauVanTay)"|mongodb(?:\+srv)?:\/\//i);
        if (result.data?.csrfToken) csrf = result.data.csrfToken;
        return { status: response.status, ...result };
      }, async login(actor) { await this.call('/store-api/session'); assert.equal((await this.call('/store-api/auth/dang-nhap', 'POST', { sdt: actor.phone, matKhau: actor.password })).status, 200); } };
    }
    const ca = client(); const cb = client(); const anonymous = client(); await ca.login(a); await cb.login(b);
    phase = 'ORDERS'; const created = [];
    for (const current of [ca, ca, ca, cb]) {
      assert.equal((await current.call('/store-api/gio-hang/items', 'POST', { maSP: product, soLuong: 1 })).status, 200);
      const quote = await current.call('/store-api/thanh-toan/xem-truoc', 'POST', { diaChiGiao: { hoTenNguoiNhan: 'Người nhận snapshot', sdtNguoiNhan: '0901234567', diaChi: 'Địa chỉ giao snapshot trên DB Test' }, phuongThuc: 'Ví điện tử' });
      const placed = await current.call('/store-api/don-hang', 'POST', { maBaoGia: quote.data.maBaoGia }, randomUUID()); assert.equal(placed.status, 201); created.push(placed.data.hoaDon);
    }
    // Legacy visibility fixture: deliberately not ONLINE, no inventory/loyalty operation.
    const offlineCode = 'HD_S4_POS_' + randomUUID().replaceAll('-', '');
    assertStoreWriteTarget(config, db.databaseName);
    await db.collection('HoaDon').insertOne({ MaHD: offlineCode, MaKH: a.maKH, MaNV: 'NV_ONLINE', NgayLap: new Date(),
      ChiTiet: [{ MaSP: product, TenSP: '[TEST] S4 non-online visibility', SoLuong: 1, DonGia: 5000, ThanhTien: 5000 }], TongTien: 5000, GiamGia: 0, ThanhTien: 5000, PhuongThucThanhToan: 'Tiền mặt', NguonDon: 'POS' });
    await db.collection('SanPham').updateOne({ MaSP: product }, { $set: { TenSP: '[TEST] Tên hiện tại đã đổi', DonGiaBan: 99000 } });
    await db.collection('HoaDon').updateOne({ MaHD: created[0].MaHD }, { $set: { SID: 'fake-private-test', Salt: 'fake-private-test', journal: 'fake-private-test', 'ChiTiet.0.Salt': 'fake-private-test' } });
    phase = 'OWNERSHIP';
    assert.equal((await anonymous.call('/store-api/don-hang')).status, 401); assert.equal((await anonymous.call(`/store-api/don-hang/${created[0].MaHD}`)).status, 401);
    const other = await ca.call(`/store-api/don-hang/${created[3].MaHD}`); const missing = await ca.call('/store-api/don-hang/NOT_EXISTS');
    assert.equal(other.status, 404); assert.equal(missing.status, 404); assert.equal(other.error.code, missing.error.code); assert.equal(other.error.message, missing.error.message);
    assert.equal((await cb.call(`/store-api/don-hang/${created[0].MaHD}`)).status, 404); assert.equal((await ca.call(`/store-api/don-hang/${offlineCode}`)).status, 404);
    phase = 'PAGINATION_SNAPSHOT';
    const first = await ca.call('/store-api/don-hang?page=1&limit=2'); const second = await ca.call('/store-api/don-hang?page=2&limit=2');
    assert.equal(first.status, 200); assert.equal(first.pagination.total, 3); assert.equal(first.pagination.totalPages, 2);
    const expected = created.slice(0, 3).map(order => order.MaHD).sort();
    assert.deepEqual([...first.data, ...second.data].map(order => order.MaHD), expected);
    assert.equal((await cb.call('/store-api/don-hang')).pagination.total, 1);
    assert.equal((await ca.call('/store-api/don-hang?page=100&limit=2')).data.length, 0);
    for (const order of created.slice(0, 3)) {
      const detail = await ca.call(`/store-api/don-hang/${order.MaHD}`); assert.equal(detail.status, 200);
      assert.equal(detail.data.ChiTiet[0].DonGia, 10000); assert.equal(detail.data.ChiTiet[0].TenSP, order.ChiTiet[0].TenSP);
      assert.equal(detail.data.DiaChiGiao.DiaChi, order.DiaChiGiao.DiaChi); assert.equal(detail.data.ThanhTien, 10000); assert.equal(detail.data.DiemDuocCong, 1);
    }
    for (const path of ['/store-api/don-hang?limit=101', '/store-api/don-hang?page=1&page=2', '/store-api/don-hang?MaKH=other', `/store-api/don-hang/${created[0].MaHD}?x=1`]) assert.equal((await ca.call(path)).status, 400);
    for (const method of ['POST', 'PUT', 'DELETE']) for (const path of ['/api', '/api/health']) assert.equal((await ca.call(path, method)).status, 405);
    assert.equal((await inspectStore(db)).ready, true); assert.equal((await db.collection('SanPham').findOne({ MaSP: product })).SoLuongTon, 6);
    t.diagnostic(JSON.stringify({ passed: true, database: db.databaseName, httpChecks: checks, onlineOrders: 4, offlineVisibilityFixture: 1, snapshotPrice: 10000, currentPrice: 99000, product, customers: [a.maKH, b.maKH] }));
  } catch { throw new Error(`S4 history test failed at ${phase}; no raw driver/credential output.`); }
});
