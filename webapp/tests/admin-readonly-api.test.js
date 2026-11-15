import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { dateRange, promotionStatus, TIMEZONE } from '../src/utils/dates.js';
import { promotionPipeline, revenuePipeline } from '../src/services/analytics.service.js';
import { wrongTotalPipeline, promotionTimePipeline, referenceRules, referencePipeline } from '../src/services/integrity.service.js';
import { createAdminAuth } from '../src/admin-auth/index.js';
import { salesOverview } from '../src/services/analytics.service.js';

const evidence = {};
for (const dbName of ['QLSieuThiMini', 'QLSieuThiMini_Test']) test(`API quản trị chỉ đọc + dữ liệu giả lập RAM: ${dbName}`, async t => {
  const port = dbName.endsWith('_Test') ? 3001 : 3000;
  const config = { ...loadConfig(), dbName, port, adminOrigin: `http://localhost:${port}` }; const client = new MongoClient(config.mongoUri, { family: 4, serverSelectionTimeoutMS: 3000 });
  await client.connect(); t.after(() => client.close()); const raw = client.db(dbName);
  const database = createDatabase(config); t.after(() => database.close());
  const adminAuth = createAdminAuth({ config }); t.after(() => adminAuth.close());
  const server = createApp({ config, db: database, adminAuth }).listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`; let requests = 0; let cookie = '';
  async function call(path, expected = 200, method = 'GET') {
    const response = await fetch(base + path, { method, headers: { Cookie: cookie } }); const json = await response.json(); requests++;
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
    assert.doesNotMatch(JSON.stringify(json), /"(?:MatKhau[^"\s]*|Salt|ThamSoBam|SID|Snapshot|GiuChoOnline|DiemDaCongOnline|journal|DauVanTay)"|mongodb(?:\+srv)?:\/\//i);
    return json;
  }
  async function all(path) {
    const rows = []; let page = 1;
    while (true) { const result = await call(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`); rows.push(...result.data); if (page++ >= result.pagination.totalPages) return rows; }
  }
  const invoices = await raw.collection('HoaDon').find({}, { projection: { _id: 0, MaHD: 1, MaKH: 1, MaNV: 1, NgayLap: 1, TongTien: 1, GiamGia: 1, ThanhTien: 1, MaKM: 1, NguonDon: 1, 'ChiTiet.MaSP': 1, 'ChiTiet.SoLuong': 1, 'ChiTiet.DonGia': 1, 'ChiTiet.ThanhTien': 1 } }).toArray();
  const counts = {};
  for (const name of ['DanhMuc', 'NhaCungCap', 'SanPham', 'KhachHang', 'NhanVien', 'TaiKhoan', 'KhuyenMai', 'HoaDon', 'PhieuNhap']) counts[name] = await raw.collection(name).countDocuments({});
  const expectedRevenue = invoices.reduce((sum, row) => sum + row.ThanhTien, 0);
  if (dbName === 'QLSieuThiMini') { assert.equal(expectedRevenue, 4400000); assert.deepEqual(Object.values(counts), [6, 6, 20, 10, 6, 6, 5, 20, 10]); }
  const serviceTotal = await salesOverview(database, {}); assert.equal(serviceTotal.data.DoanhThu, expectedRevenue); assert.equal(serviceTotal.data.SoHoaDon, invoices.length);
  await call('/api/health', 401); await call('/api/bao-cao/tong-quan', 401);
  for (const method of ['POST', 'PUT', 'DELETE']) await call('/api/health', 405, method);
  if (dbName === 'QLSieuThiMini') {
    evidence[dbName] = { dataServiceVerified: true, authenticatedApiEnabled: false, counts, totalRevenue: expectedRevenue, invoiceCount: invoices.length, httpRequests: requests, note: 'Main /api anonymous is 401; no migration or authenticated data API on Main.' };
    t.diagnostic(JSON.stringify(evidence[dbName])); return;
  }
  const setupExists = (await raw.listCollections({ name: 'TaiKhoanQuanTri' }, { nameOnly: true }).toArray()).length;
  if (!setupExists || !await raw.collection('TaiKhoanQuanTri').countDocuments({})) throw new Error('PREREQUISITE: người dùng cần review/chạy setup-admin-auth.js --test --apply thủ công trước API test; test không tự seed.');
  if (!process.env.ADMIN_TEST_USERNAME || !process.env.ADMIN_TEST_PASSWORD) throw new Error('PREREQUISITE: cung cấp ADMIN_TEST_USERNAME và ADMIN_TEST_PASSWORD qua biến môi trường, không in giá trị.');
  const bootstrap = await fetch(base + '/admin-auth/session'); const initial = await bootstrap.json(); cookie = bootstrap.headers.get('set-cookie').split(';')[0];
  const loggedIn = await fetch(base + '/admin-auth/dang-nhap', { method: 'POST', headers: { Cookie: cookie, Origin: config.adminOrigin, 'X-CSRF-Token': initial.data.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tenDangNhap: process.env.ADMIN_TEST_USERNAME, matKhau: process.env.ADMIN_TEST_PASSWORD }) });
  assert.equal(loggedIn.status, 200, 'Không đăng nhập được tài khoản Test; không in password.'); const loginBody = await loggedIn.json(); assert.equal(loginBody.data.user.role, 'Quản trị', 'Cần role Quản trị để kiểm đủ API dữ liệu.'); cookie = loggedIn.headers.get('set-cookie').split(';')[0];
  const overview = await call('/api/bao-cao/tong-quan'); assert.equal(overview.data.DoanhThu, expectedRevenue); assert.equal(overview.data.SoHoaDon, invoices.length);
  assert.equal(overview.data.TienHang, invoices.reduce((s, row) => s + row.TongTien, 0)); assert.equal(overview.data.GiamGia, invoices.reduce((s, row) => s + row.GiamGia, 0));
  const employees = await all('/api/nhan-vien'); assert.equal(employees.length, counts.NhanVien);
  for (const row of employees) { const own = invoices.filter(invoice => invoice.MaNV === row.MaNV); assert.equal(row.SoHoaDon, own.length); assert.equal(row.DoanhThu, own.reduce((sum, invoice) => sum + invoice.ThanhTien, 0)); }
  const noSales = await all('/api/nhan-vien?from=2099-01-01&to=2099-01-02'); assert.equal(noSales.length, counts.NhanVien); assert.ok(noSales.every(row => row.DoanhThu === 0 && row.SoHoaDon === 0));
  const promotions = await all('/api/khuyen-mai'); assert.equal(promotions.length, counts.KhuyenMai);
  for (const row of promotions) assert.equal(row.TrangThaiTinhToan, promotionStatus(row.NgayBatDau, row.NgayKetThuc));
  for (const [filter, status] of [['sap-dien-ra', 'Sắp diễn ra'], ['dang-ap-dung', 'Đang áp dụng'], ['da-ket-thuc', 'Đã kết thúc']]) assert.deepEqual((await all(`/api/khuyen-mai?trangThai=${filter}`)).map(row => row.MaKM), promotions.filter(row => row.TrangThaiTinhToan === status).map(row => row.MaKM));
  const vietnamDay = date => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  for (const group of ['ngay', 'thang']) {
    const rows = await all(`/api/bao-cao/doanh-thu?nhom=${group}`); const groups = new Map();
    for (const invoice of invoices) { const key = vietnamDay(invoice.NgayLap).slice(0, group === 'ngay' ? 10 : 7); const value = groups.get(key) || { revenue: 0, count: 0 }; value.revenue += invoice.ThanhTien; value.count++; groups.set(key, value); }
    assert.equal(rows.length, groups.size);
    for (const row of rows) { assert.equal(row.DoanhThu, groups.get(row.Moc).revenue); assert.equal(row.SoHoaDon, groups.get(row.Moc).count); }
  }
  const range = dateRange('2026-09-01', '2026-09-30').NgayLap;
  const ranged = await call('/api/bao-cao/tong-quan?from=2026-09-01&to=2026-09-30'); assert.equal(ranged.data.DoanhThu, invoices.filter(row => row.NgayLap >= range.$gte && row.NgayLap < range.$lt).reduce((sum, row) => sum + row.ThanhTien, 0));
  const products = await all('/api/bao-cao/san-pham'); const productExpected = new Map();
  for (const invoice of invoices) for (const line of invoice.ChiTiet) { const row = productExpected.get(line.MaSP) || { quantity: 0, amount: 0 }; row.quantity += line.SoLuong; row.amount += line.SoLuong * line.DonGia; productExpected.set(line.MaSP, row); }
  assert.equal(products.length, productExpected.size); for (const row of products) { assert.equal(row.SoLuongBan, productExpected.get(row.MaSP).quantity); assert.equal(row.TienHang, productExpected.get(row.MaSP).amount); }
  const sortedProducts = await all('/api/bao-cao/san-pham?sapXep=tien-hang'); for (let i = 1; i < sortedProducts.length; i++) assert.ok(sortedProducts[i - 1].TienHang >= sortedProducts[i].TienHang);
  const category = await raw.collection('SanPham').find({ MaDM: 'DM01' }, { projection: { _id: 0, MaSP: 1 } }).toArray(); const codes = new Set(category.map(row => row.MaSP)); assert.ok((await all('/api/bao-cao/san-pham?maDM=DM01')).every(row => codes.has(row.MaSP)));
  const customers = await all('/api/bao-cao/khach-hang'); assert.equal(customers.reduce((sum, row) => sum + row.TongChiTieu, 0), expectedRevenue); assert.equal(customers.reduce((sum, row) => sum + row.SoLanMua, 0), invoices.length);
  for (const customer of customers) { const own = invoices.filter(row => row.MaKH === customer.MaKH); assert.equal(customer.SoLanMua, own.length); assert.equal(customer.TongChiTieu, own.reduce((sum, row) => sum + row.ThanhTien, 0)); }
  const customerSorted = await all('/api/bao-cao/khach-hang?sapXep=so-lan-mua'); for (let i = 1; i < customerSorted.length; i++) assert.ok(customerSorted[i - 1].SoLanMua >= customerSorted[i].SoLanMua);
  const first = await call('/api/bao-cao/san-pham?page=1&limit=1'); const second = await call('/api/bao-cao/san-pham?page=2&limit=1'); assert.equal(first.pagination.total, products.length); assert.notEqual(first.data[0].MaSP, second.data[0].MaSP);
  const audit = await call('/api/kiem-tra-du-lieu?limit=100'); assert.equal(audit.pagination.total, Object.values(audit.summary).reduce((sum, value) => sum + value, 0)); assert.equal(audit.meta.referenceRelations, 11);
  assert.equal(audit.summary['tong-tien'], invoices.filter(row => row.TongTien !== row.ChiTiet.reduce((sum, line) => sum + line.ThanhTien, 0)).length);
  const rawPromos = new Map((await raw.collection('KhuyenMai').find({}, { projection: { _id: 0, MaKM: 1, NgayBatDau: 1, NgayKetThuc: 1 } }).toArray()).map(row => [row.MaKM, row]));
  const expectedInvalid = invoices.filter(invoice => invoice.MaKM && rawPromos.has(invoice.MaKM) && (invoice.NgayLap < rawPromos.get(invoice.MaKM).NgayBatDau || invoice.NgayLap > rawPromos.get(invoice.MaKM).NgayKetThuc)).map(row => row.MaHD).sort();
  const invalid = await all('/api/kiem-tra-du-lieu?loai=khuyen-mai'); assert.deepEqual(invalid.map(row => row.MaDocument).sort(), expectedInvalid);
  await call('/api/kiem-tra-du-lieu?loai=tong-tien');
  for (const source of ['SanPham', 'HoaDon', 'PhieuNhap', 'TaiKhoan', 'KhuyenMai']) { const result = await call(`/api/kiem-tra-du-lieu?loai=tham-chieu&collection=${source}`); assert.ok(result.data.every(row => row.Collection === source)); }
  for (const keyword of ['.*', '(']) for (const path of ['/api/nhan-vien', '/api/khuyen-mai']) assert.equal((await call(`${path}?q=${encodeURIComponent(keyword)}`)).data.length, 0);
  for (const path of ['/api/nhan-vien', '/api/khuyen-mai', '/api/bao-cao/doanh-thu', '/api/bao-cao/san-pham', '/api/bao-cao/khach-hang', '/api/kiem-tra-du-lieu']) {
    await call(path + '?limit=101', 400); await call(path + '?x=1', 400); await call(path + '?page=1&page=2', 400);
    for (const method of ['POST', 'PUT', 'DELETE']) await call(path, 405, method);
  }
  await call('/api/kiem-tra-du-lieu?loai=khuyen-mai&collection=SanPham', 400); await call('/api/bao-cao/doanh-thu?from=2026-10-01&to=2026-09-01', 400);
  for (const method of ['POST', 'PUT', 'DELETE']) await call('/api/bao-cao/tong-quan', 405, method);
  await call('/api/bao-cao/tong-quan?x=1', 400);
  // Existing admin HTTP routes: read-only regression including every detail.
  await call('/api/health'); const dashboard = await call('/api/dashboard'); assert.equal(dashboard.data.summary.doanhThu, expectedRevenue);
  for (const [path, collection, key, detail] of [['/api/danh-muc', 'DanhMuc'], ['/api/nha-cung-cap', 'NhaCungCap'], ['/api/san-pham', 'SanPham', 'MaSP', true], ['/api/hoa-don', 'HoaDon', 'MaHD', true], ['/api/phieu-nhap', 'PhieuNhap', 'MaPN', true], ['/api/khach-hang', 'KhachHang', 'MaKH', true]]) {
    const rows = await all(path); assert.equal(rows.length, counts[collection]); if (detail) for (const row of rows) await call(`${path}/${row[key]}`);
  }
  await all('/api/phuong-thuc-thanh-toan'); await all('/api/canh-bao-kho');

  // Literal fixtures are expressions in a READ aggregation; nothing is persisted.
  async function memory(collection, fixture, stages) { return raw.collection(collection).aggregate([{ $limit: 1 }, { $replaceWith: { $literal: fixture } }, ...stages]).toArray(); }
  const [unknownCondition] = await memory('KhuyenMai', { MaKM: 'RAM', DieuKien: { Unknown: 'private-fixture-value' } }, promotionPipeline({}));
  assert.equal(unknownCondition.CoDieuKienChuaHoTro, true); assert.ok(!JSON.stringify(unknownCondition).includes('private-fixture-value'));
  const coupon = rawPromos.get('KM001');
  for (const offset of [-1, 0, 1]) {
    const now = new Date(coupon.NgayKetThuc.getTime() + offset);
    const fixture = { MaKM: 'KM001', NgayBatDau: coupon.NgayBatDau, NgayKetThuc: coupon.NgayKetThuc };
    assert.equal((await memory('KhuyenMai', fixture, promotionPipeline({}, now)))[0].TrangThaiTinhToan, offset > 0 ? 'Đã kết thúc' : 'Đang áp dụng');
    assert.equal((await memory('HoaDon', { MaHD: 'RAM', MaKM: 'KM001', NgayLap: now }, promotionTimePipeline())).length, offset > 0 ? 1 : 0);
  }
  assert.equal((await memory('HoaDon', { MaHD: 'RAM', MaKM: 'KM001', NgayLap: new Date('2026-10-01T00:00:00Z') }, promotionTimePipeline())).length, 1);
  assert.equal((await memory('HoaDon', { MaHD: 'RAM', NgayLap: new Date() }, promotionTimePipeline())).length, 0);
  assert.equal((await memory('HoaDon', { MaHD: 'RAM', MaKM: 'NOT_EXISTS', NgayLap: new Date() }, promotionTimePipeline())).length, 0);
  assert.equal((await memory('HoaDon', { MaHD: 'RAM', TongTien: 12, ChiTiet: [{ ThanhTien: 10 }] }, wrongTotalPipeline()))[0].ChenhLech, 2);
  for (const rule of referenceRules) {
    const [source, key, field, target, targetKey, optional] = rule;
    const valid = (await raw.collection(target).find({}, { projection: { _id: 0, [targetKey]: 1 } }).limit(1).toArray())[0][targetKey];
    const fixture = value => { const row = { [key]: 'RAM_CODE' }; if (field.startsWith('ChiTiet.')) row.ChiTiet = [{ MaSP: value }]; else if (field.startsWith('DieuKien.')) row.DieuKien = { MaDM: value }; else row[field] = value; return row; };
    assert.equal((await memory(source, fixture(valid), referencePipeline(rule))).length, 0);
    assert.equal((await memory(source, fixture('RAM_MISSING_CODE'), referencePipeline(rule))).length, 1);
    if (optional) assert.equal((await memory(source, { [key]: 'RAM_CODE' }, referencePipeline(rule))).length, 0);
  }
  for (const [instant, day] of [['2026-09-05T16:59:59.999Z', '2026-09-05'], ['2026-09-05T17:00:00.000Z', '2026-09-06']]) {
    const result = await memory('HoaDon', { NgayLap: new Date(instant), ThanhTien: 1 }, revenuePipeline({ nhom: 'ngay' })); assert.equal(result[0].Moc, day);
  }
  const online = invoices.filter(row => row.NguonDon === 'ONLINE'); const onlineRevenue = online.reduce((sum, row) => sum + row.ThanhTien, 0);
  if (dbName.endsWith('_Test')) { const system = employees.find(row => row.MaNV === 'NV_ONLINE'); assert.equal(system.LaNhanVienHeThong, true); assert.ok(system.SoHoaDon >= online.length); assert.ok(system.DoanhThu >= onlineRevenue); assert.ok(online.length > 0); }
  evidence[dbName] = { httpRequests: requests, counts, totalRevenue: expectedRevenue, invoiceCount: invoices.length, employees: employees.length, promotions: promotions.length, onlineOrders: online.length, onlineRevenue, integrity: audit.summary, invalidPromotionInvoices: expectedInvalid, systemEmployee: employees.find(row => row.MaNV === 'NV_ONLINE') || null, memoryFixtures: 'KM boundary/end+1ms, VN midnight, wrong total, all 11 references valid/missing/optional' };
  t.diagnostic(JSON.stringify(evidence[dbName]));
});
test.after(async () => { await mkdir(new URL('./results/', import.meta.url), { recursive: true }); await writeFile(new URL('./results/admin-auth-readonly-api.json', import.meta.url), JSON.stringify(evidence, null, 2)); });
