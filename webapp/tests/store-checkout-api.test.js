import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID, randomInt } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { createStoreDatabase } from '../src/store/database.js';
import { createAccounts } from '../src/store/accounts.js';
import { createPasswordService } from '../src/store/passwords.js';
import { createCatalog } from '../src/store/catalog.js';
import { createCartService } from '../src/store/cart.js';
import { createCheckout } from '../src/store/checkout.js';
import { assertTestDatabase } from '../src/store/guards.js';
import { inspectStore } from '../src/store/preflight.js';
import { checkoutLocked, lockCheckout } from '../src/store/checkout-safety.js';

test('S3 standalone: ST bắt buộc trên DB Test thật, khóa checkout nếu thất bại', async t => {
  let phase = 'GUARDS'; let authorized = false; let server;
  const evidence = { cases: [], checks: 0, crashCases: [], orders: [], stocks: [], customers: [] };
  try {
    const config = { ...loadConfig({ testMode: true }), storeCheckoutEnabled: true, checkoutTestHarness: true };
    assertTestDatabase(config, config.dbName);
    assert.equal(process.env.STORE_CHECKOUT_API_TESTS, 'ALLOW_TEST_CHECKOUT');
    assert.equal(checkoutLocked(), false, 'Checkout đang khóa; cần người dùng xem xét trước');
    const probe = new MongoClient(config.mongoUri, { family: 4, serverSelectionTimeoutMS: 3000, retryWrites: false });
    t.after(() => probe.close()); await probe.connect();
    const db = probe.db(config.dbName); assertTestDatabase(config, db.databaseName); authorized = true;
    const readiness = await inspectStore(db); assert.equal(readiness.ready, true); assert.equal(readiness.topology, 'standalone');
    const database = createStoreDatabase(config); const admin = createDatabase(config);
    t.after(async () => { await database.close(); await admin.close(); });
    const run = randomUUID().slice(0, 8).toUpperCase(); evidence.run = run;
    let now = new Date('2026-11-15T12:00:00Z'); let fault;
    let base; let productNumber = 0; let couponNumber = 0;
    const products = new Map();
    async function stop() { if (server) { const old = server; server = undefined; await new Promise(resolve => { old.close(resolve); old.closeAllConnections(); }); } }
    t.after(stop);
    async function start() {
      await stop();
      const catalog = createCatalog(database);
      const checkout = createCheckout({ config, database, testHooks: { clock: () => new Date(now), hit: async (stage, item) => { if (fault) await fault(stage, item); } } });
      server = createApp({ config, db: admin, store: { accounts: createAccounts({ config, database }), catalog, carts: createCartService(catalog), checkout } }).listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
    }
    function client(actor) {
      const state = { cookie: '', csrf: undefined };
      return {
        async call(path, method = 'GET', body, extra = {}) {
          const csrf = Object.hasOwn(extra, 'csrf') ? extra.csrf : state.csrf;
          const response = await fetch(base + path, { method, headers: { Cookie: state.cookie, Origin: extra.origin || config.storeOrigin,
            ...(csrf != null ? { 'X-CSRF-Token': csrf } : {}), ...(extra.key ? { 'Idempotency-Key': extra.key } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
          if (response.headers.get('set-cookie')) state.cookie = response.headers.get('set-cookie').split(';')[0];
          const result = await response.json(); evidence.checks++;
          assert.doesNotMatch(JSON.stringify(result), /"(?:MatKhau[^"\s]*|Salt|ThamSoBam|DonGiaNhap|MaNCC|GiuChoOnline|DiemDaCongOnline|Snapshot|DauVanTay)"|mongodb(?:\+srv)?:\/\//i);
          if (result.data?.csrfToken) state.csrf = result.data.csrfToken;
          return { status: response.status, data: result.data, error: result.error };
        },
        async login() { state.cookie = ''; state.csrf = undefined; await this.call('/store-api/session'); const result = await this.call('/store-api/auth/dang-nhap', 'POST', { sdt: actor.phone, matKhau: actor.password }); assert.equal(result.status, 200); },
        async cart(items) { assert.equal((await this.call('/store-api/gio-hang', 'DELETE')).status, 200); for (const [code, count] of items) assert.equal((await this.call('/store-api/gio-hang/items', 'POST', { maSP: code, soLuong: count })).status, 200); },
        async quote(coupon, method = 'Ví điện tử') {
          return this.call('/store-api/thanh-toan/xem-truoc', 'POST', { diaChiGiao: { hoTenNguoiNhan: 'Khách kiểm thử S3', sdtNguoiNhan: '0901234567', diaChi: 'Địa chỉ chỉ dùng kiểm thử DB Test' }, phuongThuc: method, ...(coupon ? { maKM: coupon } : {}) });
        },
        order(quoteId, key) { return this.call('/store-api/don-hang', 'POST', { maBaoGia: quoteId }, { key }); }
      };
    }
    async function actor(initialPoints) {
      assertTestDatabase(config, db.databaseName);
      const id = randomUUID(); const maKH = 'KH_ONL_' + randomUUID().replaceAll('-', ''); const maTKKH = 'TKKH_' + randomUUID().replaceAll('-', '');
      let phone; for (let i = 0; i < 20; i++) { const value = '09' + String(randomInt(100000000)).padStart(8, '0'); if (!await db.collection('KhachHang').countDocuments({ SDT: value })) { phone = value; break; } }
      assert.ok(phone); const password = 'S3-private-' + randomUUID(); const secret = await createPasswordService().hash(password); const time = new Date();
      await db.collection('YeuCauCuaHang').insertOne({ MaYeuCau: id, Loai: 'DANG_KY', MaKH: maKH, MaTKKH: maTKKH, TrangThai: 'HOAN_TAT', Buoc: 'TEST_FIXTURE', NgayTao: time, NgayCapNhat: time });
      await db.collection('KhachHang').insertOne({ MaKH: maKH, HoTen: `[TEST] S3 ${run}`, SDT: phone, DiemTichLuy: initialPoints, NgayDangKy: time, NguonTao: 'ONLINE', MaYeuCauDangKy: id });
      await db.collection('TaiKhoanKhachHang').insertOne({ MaTKKH: maTKKH, MaKH: maKH, SDT: phone, ...secret, TrangThai: 'HoatDong', MaYeuCauDangKy: id, NgayTao: time, NgayCapNhat: time });
      return { maKH, phone, password, initialPoints };
    }
    async function product(price, stock = 5, category = 'DM01') {
      assertTestDatabase(config, db.databaseName);
      const code = `S3_${run}_${String(++productNumber).padStart(3, '0')}`;
      await db.collection('SanPham').insertOne({ MaSP: code, TenSP: `[TEST] S3 ${run} ${productNumber}`, MaDM: category, MaNCC: 'NCC01', DonGiaNhap: 0, DonGiaBan: price,
        SoLuongTon: stock, DonViTinh: 'Cái', TrangThai: 'Đang bán', HanSuDung: new Date('2099-12-31T00:00:00Z') });
      products.set(code, { initial: stock, adjustment: 0 }); return code;
    }
    async function coupon(patch) {
      assertTestDatabase(config, db.databaseName);
      const code = `S3_${run}_KM${++couponNumber}`;
      await db.collection('KhuyenMai').insertOne({ MaKM: code, TenKM: `[TEST] S3 ${run}`, GiaTri: 10, LoaiKhuyenMai: 'Phần trăm', DieuKien: {}, NgayBatDau: new Date('2026-01-01T00:00:00Z'), NgayKetThuc: new Date('2026-12-31T23:59:59.000Z'), TrangThai: 'Sắp diễn ra', ...patch });
      return code;
    }
    const points = async who => (await db.collection('KhachHang').findOne({ MaKH: who.maKH }, { projection: { _id: 0, DiemTichLuy: 1 } })).DiemTichLuy;
    const stock = async code => (await db.collection('SanPham').findOne({ MaSP: code }, { projection: { _id: 0, SoLuongTon: 1 } })).SoLuongTon;
    phase = 'FIXTURES';
    const actors = [await actor(0), await actor(0), await actor(100)];
    await start();
    let a = client(actors[0]); let b = client(actors[1]); let c = client(actors[2]); await a.login(); await b.login(); await c.login();

    phase = 'ST-01';
    const last = await product(10000, 1); await a.cart([[last, 1]]); await b.cart([[last, 1]]);
    const qa = await a.quote(); const qb = await b.quote(); assert.equal(qa.status, 200); assert.equal(qb.status, 200);
    // Both fetches start before either is awaited: real concurrent HTTP requests.
    const race = await Promise.all([a.order(qa.data.maBaoGia, randomUUID()), b.order(qb.data.maBaoGia, randomUUID())]);
    assert.deepEqual(race.map(result => result.status).sort(), [201, 409]);
    assert.equal(await stock(last), 0); assert.equal(await db.collection('HoaDon').countDocuments({ 'ChiTiet.MaSP': last }), 1);
    evidence.cases.push({ id: 'ST-01', passed: true, concurrentRequests: 2, statuses: race.map(result => result.status) });

    phase = 'ST-02/03';
    const duplicated = await product(19999, 10); await a.cart([[duplicated, 1]]); const qd = await a.quote(); const duplicateKey = randomUUID(); const beforeDuplicate = await points(actors[0]);
    const duplicates = await Promise.all([a.order(qd.data.maBaoGia, duplicateKey), a.order(qd.data.maBaoGia, duplicateKey)]);
    assert.deepEqual(duplicates.map(result => result.status).sort(), [200, 201]); assert.equal(duplicates[0].data.hoaDon.MaHD, duplicates[1].data.hoaDon.MaHD);
    assert.equal(await stock(duplicated), 9); assert.equal(await points(actors[0]), beforeDuplicate + 1);
    await a.cart([[duplicated, 1]]); const different = await a.quote();
    assert.equal((await a.order(different.data.maBaoGia, duplicateKey)).error.code, 'IDEMPOTENCY_CONFLICT');
    assert.equal((await a.order(qd.data.maBaoGia, randomUUID())).error.code, 'QUOTE_ALREADY_USED');
    assert.equal((await a.order(qd.data.maBaoGia, duplicateKey)).data.hoaDon.MaHD, duplicates[0].data.hoaDon.MaHD);
    evidence.cases.push({ id: 'ST-02/03', passed: true });

    phase = 'ST-04';
    const first = await product(10000, 5); const second = await product(10000, 1); await a.cart([[first, 1], [second, 1]]); const partial = await a.quote(); const failedKey = randomUUID(); const beforeFailure = await points(actors[0]);
    let reduced = false;
    fault = async stage => { if (stage === 'after-hold:0' && !reduced) { reduced = true; assertTestDatabase(config, db.databaseName); await db.collection('SanPham').updateOne({ MaSP: second, SoLuongTon: 1 }, { $inc: { SoLuongTon: -1 } }); products.get(second).adjustment--; } };
    const failed = await a.order(partial.data.maBaoGia, failedKey); fault = undefined;
    assert.equal(failed.status, 409); assert.equal(failed.error.code, 'INSUFFICIENT_STOCK'); assert.equal(reduced, true);
    assert.equal(await stock(first), 5); assert.equal(await stock(second), 0); assert.equal(await points(actors[0]), beforeFailure);
    assert.equal(await db.collection('HoaDon').countDocuments({ MaKH: actors[0].maKH, MaChongGuiTrung: failedKey }), 0);
    const failedJournal = await db.collection('YeuCauCuaHang').findOne({ MaChongGuiTrung: failedKey });
    assert.equal(failedJournal.TrangThai, 'THAT_BAI'); assert.equal(await db.collection('SanPham').countDocuments({ 'GiuChoOnline.MaYeuCau': failedJournal.MaYeuCau }), 0);
    evidence.cases.push({ id: 'ST-04', passed: true, fixtureStockAdjustment: { MaSP: second, delta: -1 } });

    phase = 'ST-05';
    const eligible = await product(10000, 20); const otherCategory = await product(20000, 10, 'DM02');
    const expired = await coupon({ NgayKetThuc: new Date('2026-01-02T23:59:59Z') });
    const future = await coupon({ NgayBatDau: new Date('2026-12-01T00:00:00Z') });
    const minimum = await coupon({ DieuKien: { DonHangToiThieu: 1000000 } });
    const capped = await coupon({ DieuKien: { MaDM: 'DM01', SoLuongToiThieu: 3, DonHangToiThieu: 30000, DiemToiThieu: 100, GiamToiDa: 1000 } });
    const unsupported = await coupon({ DieuKien: { Unknown: 1 } });
    await b.cart([[eligible, 1]]);
    for (const [code, expected] of [[expired, 'PROMOTION_EXPIRED'], [future, 'PROMOTION_NOT_STARTED'], [minimum, 'PROMOTION_NOT_ELIGIBLE'], ['KM003', 'PROMOTION_NOT_ELIGIBLE'], [unsupported, 'PROMOTION_UNSUPPORTED']]) assert.equal((await b.quote(code)).error.code, expected);
    await c.cart([[otherCategory, 1]]); assert.equal((await c.quote(capped)).error.code, 'PROMOTION_NOT_ELIGIBLE');
    await c.cart([[eligible, 3]]); const discounted = await c.quote(capped, 'Chuyển khoản'); assert.equal(discounted.data.GiamGia, 1000);
    const discountedOrder = await c.order(discounted.data.maBaoGia, randomUUID()); assert.equal(discountedOrder.status, 201); assert.equal(discountedOrder.data.hoaDon.ThanhTien, 29000);
    evidence.cases.push({ id: 'ST-05', passed: true });

    phase = 'ST-06';
    const boundary = await product(10000, 2); const boundaryCoupon = await coupon({ LoaiKhuyenMai: 'Số tiền', GiaTri: 1000 });
    now = new Date('2026-12-31T23:59:59.000Z'); await a.cart([[boundary, 1]]); const atEnd = await a.quote(boundaryCoupon); assert.equal(atEnd.status, 200);
    assert.equal((await a.order(atEnd.data.maBaoGia, randomUUID())).status, 201);
    await b.cart([[boundary, 1]]); const beforeEnd = await b.quote(boundaryCoupon); assert.equal(beforeEnd.status, 200);
    now = new Date('2026-12-31T23:59:59.001Z'); assert.equal((await b.order(beforeEnd.data.maBaoGia, randomUUID())).error.code, 'PROMOTION_EXPIRED');
    now = new Date('2027-01-01T00:00:00.000Z'); assert.equal((await b.quote(boundaryCoupon)).error.code, 'PROMOTION_EXPIRED');
    now = new Date('2026-11-15T12:00:00Z'); evidence.cases.push({ id: 'ST-06', passed: true, inclusiveEnd: true, plusOneMsRejected: true });

    phase = 'ST-13/14';
    const changed = await product(10000, 5); await a.cart([[changed, 1]]); const oldPrice = await a.quote();
    assertTestDatabase(config, db.databaseName); await db.collection('SanPham').updateOne({ MaSP: changed }, { $set: { DonGiaBan: 12000 } });
    assert.equal((await a.order(oldPrice.data.maBaoGia, randomUUID())).error.code, 'QUOTE_CHANGED');
    const badPrice = await a.call('/store-api/thanh-toan/xem-truoc', 'POST', { diaChiGiao: {}, phuongThuc: 'Ví điện tử', ThanhTien: 1 }); assert.equal(badPrice.status, 400);
    for (const [price, expected] of [[9999, 0], [10000, 1], [19999, 1]]) {
      const code = await product(price, 5); await a.cart([[code, 1]]); const quote = await a.quote(undefined, 'Thẻ ngân hàng'); const before = await points(actors[0]);
      const order = await a.order(quote.data.maBaoGia, randomUUID()); assert.equal(order.status, 201); assert.equal(order.data.hoaDon.DiemDuocCong, expected); assert.equal(await points(actors[0]), before + expected);
    }
    evidence.cases.push({ id: 'ST-13/14', passed: true });

    phase = 'ST-07/08/17';
    const anonymous = client(actors[0]); await anonymous.call('/store-api/session');
    assert.equal((await anonymous.call(`/store-api/yeu-cau-dat-hang/${duplicateKey}`)).status, 401);
    assert.equal((await b.call(`/store-api/yeu-cau-dat-hang/${duplicateKey}`)).status, 404);
    assert.equal((await b.call(`/store-api/yeu-cau-dat-hang/${randomUUID()}`)).status, 404);
    assert.equal((await a.call(`/store-api/yeu-cau-dat-hang/${duplicateKey}`)).data.hoaDon.MaHD, duplicates[0].data.hoaDon.MaHD);
    for (const path of ['/store-api/thanh-toan/xem-truoc', '/store-api/don-hang']) {
      assert.equal((await a.call(path, 'POST', {}, { csrf: null })).status, 403);
      assert.equal((await a.call(path, 'POST', {}, { csrf: '0'.repeat(64) })).status, 403);
      assert.equal((await a.call(path, 'POST', {}, { origin: 'http://evil.local' })).status, 403);
    }
    assert.equal((await a.call('/store-api/don-hang', 'POST', { maBaoGia: randomUUID() })).error.code, 'IDEMPOTENCY_KEY_REQUIRED');
    assert.equal((await a.call(`/store-api/yeu-cau-dat-hang/${duplicateKey}?MaKH=other`)).status, 400);
    for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await a.call('/api/health', method)).status, 405);
    evidence.cases.push({ id: 'ST-07/08/17', passed: true });

    const stages = ['after-journal', 'before-hold:0', 'after-hold:0', 'before-hold:1', 'after-hold:1', 'before-insert', 'after-insert', 'after-points', 'after-complete'];
    for (const stage of stages) {
      phase = `ST-11/12:${stage}`;
      const x = await product(10000, 5); const y = await product(20000, 5); await a.cart([[x, 1], [y, 1]]); const quote = await a.quote(); const key = randomUUID(); const before = await points(actors[0]); let fired = false;
      fault = async at => { if (!fired && at === stage) { fired = true; throw Object.assign(new Error('Test-only simulated crash'), { code: 'SIMULATED_TEST_CRASH' }); } };
      assert.equal((await a.order(quote.data.maBaoGia, key)).status, 202); assert.equal(fired, true);
      assert.equal((await a.call('/store-api/gio-hang', 'DELETE')).error.code, 'CART_BUSY');
      fault = undefined; await start(); a = client(actors[0]); await a.login();
      const hasPublished = ['after-insert', 'after-points', 'after-complete'].includes(stage);
      const resumed = await a.order(quote.data.maBaoGia, key); assert.equal(resumed.status, hasPublished ? 200 : 409);
      const state = await a.call(`/store-api/yeu-cau-dat-hang/${key}`); assert.equal(state.data.trangThai, hasPublished ? 'HOAN_TAT' : 'THAT_BAI');
      assert.equal(await stock(x), hasPublished ? 4 : 5); assert.equal(await stock(y), hasPublished ? 4 : 5); assert.equal(await points(actors[0]), before + (hasPublished ? 3 : 0));
      await a.order(quote.data.maBaoGia, key); await a.order(quote.data.maBaoGia, key);
      assert.equal(await stock(x), hasPublished ? 4 : 5); assert.equal(await points(actors[0]), before + (hasPublished ? 3 : 0));
      assert.equal(await db.collection('HoaDon').countDocuments({ MaKH: actors[0].maKH, MaChongGuiTrung: key }), hasPublished ? 1 : 0);
      assert.equal((await inspectStore(db)).ready, true);
      evidence.crashCases.push({ stage, passed: true, published: hasPublished });
    }
    evidence.cases.push({ id: 'ST-11/12', passed: true, crashStages: stages.length });

    phase = 'AUDIT';
    const orders = await db.collection('HoaDon').find({ NguonDon: 'ONLINE', MaKH: { $in: actors.map(value => value.maKH) } }).toArray();
    for (const order of orders) {
      assert.equal(order.TongTien, order.ChiTiet.reduce((sum, line) => sum + line.SoLuong * line.DonGia, 0));
      assert.equal(order.ThanhTien, order.TongTien - order.GiamGia); assert.equal(order.DiemDuocCong, Math.floor(order.ThanhTien / 10000));
      assert.equal(order.TrangThaiTichDiem, 'DaCong'); assert.equal(order.MaNV, 'NV_ONLINE');
      evidence.orders.push({ MaHD: order.MaHD, MaKH: order.MaKH, ThanhTien: order.ThanhTien, points: order.DiemDuocCong, lines: order.ChiTiet.map(line => ({ MaSP: line.MaSP, quantity: line.SoLuong })) });
    }
    for (const [code, baseline] of products) {
      const sold = orders.flatMap(order => order.ChiTiet).filter(line => line.MaSP === code).reduce((sum, line) => sum + line.SoLuong, 0);
      const actual = await stock(code); assert.equal(actual, baseline.initial + baseline.adjustment - sold); assert.ok(actual >= 0);
      evidence.stocks.push({ MaSP: code, initial: baseline.initial, testAdjustment: baseline.adjustment, sold, final: actual });
    }
    for (const who of actors) {
      const earned = orders.filter(order => order.MaKH === who.maKH).reduce((sum, order) => sum + order.DiemDuocCong, 0);
      const actual = await points(who); assert.equal(actual, who.initialPoints + earned);
      evidence.customers.push({ MaKH: who.maKH, initialPoints: who.initialPoints, earned, finalPoints: actual });
    }
    assert.equal(await db.collection('YeuCauCuaHang').countDocuments({ Loai: 'DAT_HANG', TrangThai: { $in: ['DANG_XU_LY', 'CAN_PHUC_HOI'] } }), 0);
    evidence.passed = true; evidence.orderCount = orders.length; evidence.netRevenue = orders.reduce((sum, order) => sum + order.ThanhTien, 0);
    fs.mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
    fs.writeFileSync(new URL(`./results/checkout-${run}.json`, import.meta.url), JSON.stringify(evidence, null, 2));
    t.diagnostic(JSON.stringify({ run, cases: evidence.cases, httpChecks: evidence.checks, orders: evidence.orderCount, netRevenue: evidence.netRevenue, stockAuditRows: evidence.stocks.length, customers: evidence.customers, passed: true }));
  } catch {
    if (authorized) lockCheckout();
    throw new Error(`Checkout verification failed at ${phase}. Checkout locked; user review required. No raw driver/credential output.`);
  }
});
