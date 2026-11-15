import test from 'node:test';
import assert from 'node:assert/strict';
import { dateRange } from '../src/utils/dates.js';
import { invoiceFilter, invoiceSort, decorateInvoice } from '../src/services/invoices.service.js';
import { purchaseFilter, purchaseSort } from '../src/services/purchases.service.js';
import { customerFilter, customerStatistics } from '../src/services/customers.service.js';
import { invoiceJoins, purchaseJoins } from '../src/pipelines/joins.js';
import { parseQuery, schemas } from '../src/middleware/validate.js';
import { SEARCH_HINTS, searchEmptyMessage } from '../public/js/ui.js';
import { promotionEndDate } from '../public/js/format.js';

test('BR-06: khoảng ngày Việt Nam gồm đầu ngày và loại đầu ngày kế tiếp', () => {
  const range = dateRange('2026-09-05', '2026-09-05').NgayLap;
  assert.equal(range.$gte.toISOString(), '2026-09-04T17:00:00.000Z');
  assert.equal(range.$lt.toISOString(), '2026-09-05T17:00:00.000Z');
  const includes = value => new Date(value) >= range.$gte && new Date(value) < range.$lt;
  assert.equal(includes('2026-09-04T16:59:59.999Z'), false);
  assert.equal(includes('2026-09-04T17:00:00.000Z'), true);
  assert.equal(includes('2026-09-05T16:59:59.999Z'), true);
  assert.equal(includes('2026-09-05T17:00:00.000Z'), false);
});
test('Hóa đơn kết hợp ngày, khách, nhân viên, thanh toán và ngưỡng >', () => {
  const query = parseQuery(new URLSearchParams('q=HD009&from=2026-09-01&to=2026-09-30&maKH=KH009&maNV=NV002&thanhToan=Thẻ+ngân+hàng&thucThuTren=309000'), { ...schemas.search, ...schemas.dates, ...schemas.invoices });
  const filter = invoiceFilter(query);
  assert.equal(filter.MaKH, 'KH009'); assert.equal(filter.MaNV, 'NV002'); assert.equal(filter.PhuongThucThanhToan, 'Thẻ ngân hàng');
  assert.deepEqual(filter.ThanhTien, { $gt: 309000 });
  assert.ok(!(309000 > filter.ThanhTien.$gt)); assert.ok(309001 > filter.ThanhTien.$gt);
});
test('Ngưỡng 0 vẫn tạo điều kiện lớn hơn, không bị coi là thiếu', () => assert.deepEqual(invoiceFilter({ thucThuTren: 0 }).ThanhTien, { $gt: 0 }));
test('Ngày phiếu nhập sử dụng NgayNhap, không phải NgayLap', () => {
  const filter = purchaseFilter({ from: '2026-09-05', to: '2026-09-05', maNCC: 'NCC06', maNV: 'NV004' });
  assert.equal(filter.NgayNhap.$lt.toISOString(), '2026-09-05T17:00:00.000Z'); assert.equal(filter.NgayLap, undefined);
  assert.equal(filter.MaNCC, 'NCC06'); assert.equal(filter.MaNV, 'NV004');
});
for (const keyword of ['.*', '(']) test(`Regex literal trong cả ba danh sách: ${keyword}`, () => {
  for (const filter of [invoiceFilter({ q: keyword }), purchaseFilter({ q: keyword }), customerFilter({ q: keyword })]) {
    const text = Object.values(filter.$or[0])[0].$regex;
    assert.ok(new RegExp(`^${text}$`, 'i').test(keyword)); assert.ok(!new RegExp(`^${text}$`, 'i').test('anything'));
  }
});
test('Hóa đơn/phiếu chỉ tìm mã; khách tìm mã, tên và SDT', () => {
  assert.deepEqual(invoiceFilter({ q: 'x' }).$or.map(value => Object.keys(value)[0]), ['MaHD']);
  assert.deepEqual(purchaseFilter({ q: 'x' }).$or.map(value => Object.keys(value)[0]), ['MaPN']);
  assert.deepEqual(customerFilter({ q: 'x' }).$or.map(value => Object.keys(value)[0]), ['MaKH', 'HoTen', 'SDT']);
});
test('Mặc định ngày mới trước, mã phụ tăng dần', () => {
  assert.deepEqual(invoiceSort, { NgayLap: -1, MaHD: 1, _id: 1 });
  assert.deepEqual(purchaseSort, { NgayNhap: -1, MaPN: 1, _id: 1 });
});
test('Không lookup SanPham hoặc unwind giao dịch; giữ bản lưu ChiTiet', () => {
  for (const stages of [invoiceJoins(true), purchaseJoins(true)]) {
    assert.ok(stages.every(stage => !stage.$unwind && stage.$lookup?.from !== 'SanPham'));
    const projection = stages.at(-1).$project;
    assert.equal(projection['ChiTiet.TenSP'], 1); assert.equal(projection['ChiTiet.ThanhTien'], 1);
  }
  assert.equal(invoiceJoins(true).at(-1).$project['ChiTiet.DonGia'], 1);
  assert.equal(purchaseJoins(true).at(-1).$project['ChiTiet.DonGiaNhap'], 1);
});
test('KM dùng thời điểm BSON, hiển thị cuối ngày theo UTC, không kéo dài', () => {
  const promotion = { MaKM: 'KM001', NgayBatDau: new Date('2026-09-01T00:00:00Z'), NgayKetThuc: new Date('2026-09-30T23:59:59Z'), TrangThai: 'Đang áp dụng' };
  const data = { NgayLap: promotion.NgayKetThuc, KhuyenMai: promotion, ChiTiet: [{ TenSP: 'Tên đã lưu', DonGia: 111 }] };
  const output = decorateInvoice(data, new Date('2026-10-01T00:00:00Z'));
  assert.equal(output.KhuyenMai.TrangThaiTinhToan, 'Đã kết thúc'); assert.equal(output.KhuyenMai.TrangThaiTaiNgayLap, 'Đang áp dụng');
  assert.equal(output.KhuyenMai.TrangThai, 'Đang áp dụng'); assert.equal(promotionEndDate(output.KhuyenMai.NgayKetThuc), '30/09/2026');
  assert.deepEqual(output.ChiTiet, data.ChiTiet);
});
test('Không có MaKM hoặc không tìm thấy KM trả null, không làm mất hóa đơn', () => {
  const output = decorateInvoice({ MaHD: 'MEM_HD', ChiTiet: [] }, new Date('2026-11-15T00:00:00Z'));
  assert.equal(output.MaHD, 'MEM_HD'); assert.equal(output.KhuyenMai, null);
});
test('Thống kê khách cộng ThanhTien và đếm số hóa đơn, không tính lại điểm', () => {
  const stages = customerStatistics();
  const group = stages[0].$lookup.pipeline[0].$group;
  assert.deepEqual(group.TongChiTieu, { $sum: '$ThanhTien' }); assert.deepEqual(group.SoLanMua, { $sum: 1 });
  assert.equal(stages.at(-1).$project.DiemTichLuy, 1);
});
test('Validation ngày/giá/nhân viên/thanh toán và tham số lạ', () => {
  const schema = { ...schemas.pagination, ...schemas.search, ...schemas.dates, ...schemas.invoices };
  for (const query of ['from=2026-02-30', 'from=2026-09-06&to=2026-09-05', 'thucThuTren=-1', 'thucThuTren=Infinity', 'maNV[$ne]=x', 'thanhToan=', 'sort=NgayLap', 'unknown=1', 'limit=101']) assert.throws(() => parseQuery(new URLSearchParams(query), schema));
});
for (const kind of ['products', 'invoices', 'purchases', 'customers']) test(`Gợi ý tìm kiếm và kết quả rỗng: ${kind}`, () => {
  assert.ok(SEARCH_HINTS[kind]);
  assert.ok(searchEmptyMessage(kind, '(', 'Không có kết quả.').includes(SEARCH_HINTS[kind]));
  assert.equal(searchEmptyMessage(kind, '', 'Không có kết quả.'), 'Không có kết quả.');
});
