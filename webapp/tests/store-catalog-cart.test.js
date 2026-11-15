import test from 'node:test';
import assert from 'node:assert/strict';
import { productDto, publicProductJoin, publicProductFilter } from '../src/store/catalog.js';
import { createCart, createCartService, cartSnapshot, cartView } from '../src/store/cart.js';
import { SessionStore } from '../src/store/sessions.js';
import { storeQuery, quantity, cartInput } from '../src/store/query.js';
import { date } from '../public/shop/js/format.js';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const now = new Date('2026-11-15T05:00:00Z');
const source = { MaSP: 'SP_MEM', TenSP: 'Sản phẩm bộ nhớ', MaDM: 'DM01', TenDM: 'Danh mục', DonGiaBan: 10000, SoLuongTon: 150, DonViTinh: 'Cái', TrangThai: 'Đang bán' };
const product = patch => productDto({ ...source, ...patch }, now);
for (const [stock, expected] of [[0, 'Hết hàng'], [1, 'Tồn thấp'], [19, 'Tồn thấp'], [20, 'Còn hàng']]) test(`Shop: tồn ${stock}`, () => {
  const value = product({ SoLuongTon: stock }); assert.equal(value.TrangThaiTonKho, expected); assert.equal(value.CoTheMua, stock > 0);
});
for (const [expiry, expected, allowed] of [['2026-11-14T00:00:00Z', 'Hết hạn', false], ['2026-11-15T00:00:00Z', 'Sắp hết hạn', true], ['2026-12-15T00:00:00Z', 'Sắp hết hạn', true], ['2026-12-16T00:00:00Z', 'Còn hạn', true], [undefined, 'Chưa có hạn sử dụng', true]]) test(`Shop: hạn ${String(expiry)}`, () => {
  const value = product({ HanSuDung: expiry }); assert.equal(value.TrangThaiHanSuDung, expected); assert.equal(value.CoTheMua, allowed);
});
test('Shop: ranh giới ngày Việt Nam, không dùng ngày UTC để chặn hạn', () => {
  assert.equal(product({ HanSuDung: '2026-11-14T16:59:59.999Z' }).CoTheMua, false);
  assert.equal(product({ HanSuDung: '2026-11-14T17:00:00Z' }).CoTheMua, true);
  assert.equal(date('2026-09-30T23:59:59Z', true), '30/09/2026');
});
test('DTO public: field lạ/NCC/giá nhập/marker không lọt ra, thiếu danh mục vẫn giữ SP', () => {
  const value = product({ TenDM: undefined, DonGiaNhap: 5, MaNCC: 'NCC_SECRET', NhaCungCap: { secret: true }, GiuChoOnline: [{ secret: true }], MatKhau: 'secret' });
  assert.equal(value.MaSP, source.MaSP); assert.equal(value.ThamChieuThieu, true);
  for (const key of ['DonGiaNhap', 'MaNCC', 'NhaCungCap', 'GiuChoOnline', 'MatKhau']) assert.equal(Object.hasOwn(value, key), false);
  const join = publicProductJoin(); assert.ok(join.every(stage => !stage.$unwind));
  assert.equal(join.find(stage => stage.$lookup).$lookup.from, 'DanhMuc');
});
test('Ngừng bán/trạng thái lạ/giá sai bị chặn, trạng thái Hết hàng cũ có tồn dương được xét bằng số tồn', () => {
  assert.equal(product({ TrangThai: 'Ngừng bán' }).CoTheMua, false);
  assert.equal(product({ TrangThai: 'Unknown' }).CoTheMua, false);
  assert.equal(product({ DonGiaBan: 1.5 }).CoTheMua, false);
  assert.equal(product({ TrangThai: 'Hết hàng', SoLuongTon: 1 }).CoTheMua, true);
});
for (const keyword of ['.*', '(']) test(`Shop regex literal: ${keyword}`, () => {
  const filter = publicProductFilter({ q: keyword });
  const regex = new RegExp(`^${filter.$or[0].MaSP.$regex}$`);
  assert.equal(regex.test(keyword), true); assert.equal(regex.test('SP001'), false);
});
test('Shop query: từ chối lạ/lặp/object/limit101/giá ngược/sort sai', () => {
  for (const text of ['foo=1', 'q=a&q=b', 'page=1&page=2', 'maDM[$ne]=x', 'limit=101', 'page=0', 'giaTu=-1', 'giaTu=11&giaDen=10', 'sort=ton-giam', 'giaTu=Infinity']) assert.throws(() => storeQuery(new URLSearchParams(text), 'products'));
  assert.throws(() => storeQuery(new URLSearchParams('limit=1'), 'none'));
  assert.equal(storeQuery(new URLSearchParams('limit=100&giaTu=0'), 'products').limit, 100);
});
test('Giỏ input không ép chuỗi/số thực và không nhận giá client', () => {
  for (const value of [0, -1, 100, 1.5, '2', {}, null]) assert.throws(() => quantity(value));
  assert.throws(() => cartInput({ maSP: 'SP001', soLuong: 1, gia: 1 }, true));
});
function memoryCatalog() {
  const rows = new Map(Array.from({ length: 51 }, (_, i) => { const code = `SP${i}`; return [code, product({ MaSP: code })]; }));
  return { rows, detail: async code => { const row = rows.get(code); if (!row) throw new Error('missing memory fixture'); return row; }, forCart: async codes => codes.map(code => rows.get(code)).filter(Boolean) };
}
test('Giỏ gộp cùng mã; revision chỉ tăng khi thay đổi, lỗi không tăng', async () => {
  const catalog = memoryCatalog(); const service = createCartService(catalog); const session = { cart: createCart() };
  assert.equal((await service.view(session)).revision, 0);
  await service.add(session, 'SP0', 1); const merged = await service.add(session, 'SP0', 2);
  assert.equal(merged.soMa, 1); assert.equal(merged.items[0].SoLuong, 3); assert.equal(merged.revision, 2);
  assert.equal((await service.set(session, 'SP0', 3)).revision, 2);
  assert.equal((await service.set(session, 'SP0', 2)).revision, 3);
  await assert.rejects(service.add(session, 'SP0', 98), { status: 400 }); assert.equal(session.cart.revision, 3);
  assert.equal((await service.remove(session, 'SP0')).revision, 4);
  assert.equal((await service.clear(session)).revision, 4);
});
test('Giỏ giới hạn 50 mã, gộp 99, không mất cập nhật khi POST song song', async () => {
  const catalog = memoryCatalog(); const service = createCartService(catalog); const session = { cart: createCart() };
  for (let i = 0; i < 50; i++) await service.add(session, `SP${i}`, 1);
  await assert.rejects(service.add(session, 'SP50', 1), { status: 400 });
  assert.equal((await service.add(session, 'SP0', 98)).items.find(row => row.MaSP === 'SP0').SoLuong, 99);
  const other = { cart: createCart() };
  await Promise.all(Array.from({ length: 10 }, () => service.add(other, 'SP0', 1)));
  assert.equal(other.cart.items.get('SP0'), 10); assert.equal(other.cart.revision, 10);
});
test('Giỏ đọc lại tên/giá/tồn, cảnh báo hết hàng/thiếu tồn/hết hạn/ngừng bán và mã bị mất', async () => {
  const catalog = memoryCatalog(); const service = createCartService(catalog); const session = { cart: createCart() };
  await service.add(session, 'SP0', 3);
  catalog.rows.set('SP0', product({ MaSP: 'SP0', TenSP: 'Tên mới', DonGiaBan: 20000, SoLuongTon: 2 }));
  let view = await service.view(session); assert.equal(view.items[0].SanPham.TenSP, 'Tên mới'); assert.equal(view.tongTamTinh, 60000); assert.equal(view.coCanhBao, true);
  for (const patch of [{ SoLuongTon: 0 }, { HanSuDung: '2026-11-14T00:00:00Z' }, { TrangThai: 'Ngừng bán' }]) {
    catalog.rows.set('SP0', product({ MaSP: 'SP0', ...patch })); view = await service.view(session); assert.equal(view.items[0].HopLe, false);
    await assert.rejects(service.add(session, 'SP0', 1), { status: 409 });
  }
  catalog.rows.delete('SP0'); assert.equal((await service.view(session)).items[0].SanPham, null);
  assert.equal(session.cart.revision, 1);
});
test('Giỏ chuyển sang SID mới khi login, giữ revision; SID cũ không dùng lại được', async () => {
  const sessions = new SessionStore(); const old = sessions.create(); const service = createCartService(memoryCatalog());
  await service.add(old.session, 'SP0', 2);
  const next = sessions.rotate(old.sid, 'KH_TEST');
  assert.equal(sessions.get(old.sid), null); assert.equal(next.session.cart.items.get('SP0'), 2); assert.equal(next.session.cart.revision, 1);
  assert.notEqual(next.session.csrfToken, old.session.csrfToken);
});
test('Giỏ không trả tổng tiền sai khi vượt miền số nguyên an toàn', () => {
  const snapshot = { revision: 0, items: [{ maSP: 'A', soLuong: 1 }, { maSP: 'B', soLuong: 1 }] };
  const view = cartView(snapshot, ['A', 'B'].map(code => product({ MaSP: code, DonGiaBan: Number.MAX_SAFE_INTEGER })));
  assert.equal(view.tongTamTinh, null); assert.equal(view.coCanhBao, true);
  assert.equal(cartView(snapshot, [product({ MaSP: 'A', DonGiaBan: null })]).tongTamTinh, null);
  assert.equal(cartSnapshot({ cart: createCart() }).revision, 0);
});
test('start:test cấu hình đúng Test, từ chối biến môi trường trỏ Main trước kết nối', () => {
  for (const [dbName, expected] of [['QLSieuThiMini', 'CONFIG_ERROR'], ['QLSieuThiMini_Test', 'QLSieuThiMini_Test:3001']]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import {loadConfig} from './src/config.js'; try {const c=loadConfig({testMode:true}); console.log(c.dbName+':'+c.port);} catch(e) {console.log(e.code);}"],
      { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', windowsHide: true,
        env: { ...process.env, DB_NAME: dbName, PORT: '3001', STORE_WRITE_ENABLED: 'false', STORE_ORIGIN: 'http://localhost:3001' } });
    assert.equal(result.status, 0); assert.equal(result.stdout.trim(), expected);
  }
});
