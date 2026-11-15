import test from 'node:test';
import assert from 'node:assert/strict';
import { expiryStatus, expiryWindow, stockStatus } from '../src/utils/dates.js';
import { escapeRegex } from '../src/utils/query.js';
import { parseQuery, schemas, codeValue } from '../src/middleware/validate.js';
import { decorateProduct, productFilter, productSort } from '../src/services/products.service.js';
import { inventoryFilter } from '../src/services/inventory.service.js';
import { productJoins } from '../src/pipelines/joins.js';
import { publicError } from '../src/middleware/error-handler.js';

const now = new Date('2026-11-15T05:00:00.000Z');

for (const [value, expected] of [
  ['2026-11-14T00:00:00Z', 'Hết hạn'], ['2026-11-15T00:00:00Z', 'Sắp hết hạn'],
  ['2026-12-15T00:00:00Z', 'Sắp hết hạn'], ['2026-12-16T00:00:00Z', 'Còn hạn'],
  [undefined, 'Chưa có hạn sử dụng'], [null, 'Chưa có hạn sử dụng']
]) test(`Hạn dùng ${String(value)}: ${expected}`, () => assert.equal(expiryStatus(value, now), expected));

test('Hạn dùng tính ngày Việt Nam thay vì phần ngày UTC', () => {
  assert.equal(expiryStatus('2026-11-14T17:00:00.000Z', now), 'Sắp hết hạn');
  assert.equal(expiryStatus('2026-11-14T16:59:59.999Z', now), 'Hết hạn');
  assert.equal(expiryStatus('2026-12-15T16:59:59.999Z', now), 'Sắp hết hạn');
  assert.equal(expiryStatus('2026-12-15T17:00:00.000Z', now), 'Còn hạn');
});
test('Cửa sổ ngày gồm trọn hôm nay đến hết ngày +30', () => {
  const window = expiryWindow(now);
  assert.equal(window.today.toISOString(), '2026-11-14T17:00:00.000Z');
  assert.equal(window.upcomingEnd.toISOString(), '2026-12-15T17:00:00.000Z');
});
for (const [quantity, expected] of [[0, 'Hết hàng'], [1, 'Tồn thấp'], [19, 'Tồn thấp'], [20, 'Còn hàng']]) {
  test(`Tồn kho ${quantity}: ${expected}`, () => assert.equal(stockStatus(quantity), expected));
}
for (const keyword of ['.*', '(', ')', '[abc]', '^SP', 'a+b', '\\']) {
  test(`Escape regex giữ nghĩa văn bản: ${keyword}`, () => {
    const regex = new RegExp(`^${escapeRegex(keyword)}$`, 'i');
    assert.ok(regex.test(keyword)); assert.ok(!regex.test('unrelated'));
    const filter = productFilter({ q: keyword });
    assert.equal(filter.$or[0].MaSP.$regex, escapeRegex(keyword));
  });
}
test('Một sản phẩm có hai nhãn, không tách thành hai document', () => {
  const product = decorateProduct({ MaSP: 'MEMORY_ONLY', SoLuongTon: 1, HanSuDung: new Date('2026-11-15T00:00:00Z') }, now);
  assert.equal(product.MaSP, 'MEMORY_ONLY');
  assert.deepEqual(product.CanhBao, ['Tồn thấp', 'Sắp hết hạn']);
});
test('Thiếu hạn sử dụng vẫn có nhãn tồn kho và dòng thông tin hạn dùng', () => {
  const product = decorateProduct({ MaSP: 'MEMORY_ONLY', SoLuongTon: 0 }, now);
  assert.equal(product.HanSuDung, null); assert.equal(product.TrangThaiHanSuDung, 'Chưa có hạn sử dụng');
  assert.deepEqual(product.CanhBao, ['Hết hàng']);
});
test('Bộ lọc đầy đủ kết hợp q, mã, giá và tồn mà không ghi đè', () => {
  const query = parseQuery(new URLSearchParams('q=sữa&maDM=DM04&maNCC=NCC04&giaTu=0&giaDen=10000&tonKho=con-hang&sort=gia-tang'), { ...schemas.pagination, ...schemas.search, ...schemas.products });
  const filter = productFilter(query);
  assert.equal(filter.MaDM, 'DM04'); assert.equal(filter.MaNCC, 'NCC04');
  assert.deepEqual(filter.DonGiaBan, { $gte: 0, $lte: 10000 }); assert.deepEqual(filter.SoLuongTon, { $gt: 0 });
  assert.equal(filter.$or.length, 2);
});
test('Giá, mã, enum, object và tham số lạ được validation chặn', () => {
  for (const text of ['giaTu=-1', 'giaDen=Infinity', 'giaTu=100&giaDen=50', 'sort=unknown', 'tonKho=unknown', 'maDM[$ne]=x', 'maNCC=', 'foo=x', 'limit=101']) {
    assert.throws(() => parseQuery(new URLSearchParams(text), { ...schemas.pagination, ...schemas.search, ...schemas.products }));
  }
  assert.throws(() => codeValue('../SP001')); assert.throws(() => codeValue('SP001'.repeat(11)));
  assert.throws(() => parseQuery(new URLSearchParams('loai=unknown'), { ...schemas.inventory }));
});
test('Cả năm kiểu sort có mã phụ tăng dần và _id ổn định', () => {
  for (const sort of ['ma-tang', 'gia-tang', 'gia-giam', 'ton-tang', 'ton-giam']) {
    const result = productSort(sort); assert.equal(result.MaSP, 1); assert.equal(result._id, 1);
  }
  assert.equal(productSort('gia-giam').DonGiaBan, -1); assert.equal(productSort('ton-tang').SoLuongTon, 1);
});
test('Tất cả cảnh báo dùng OR dưới AND với tìm kiếm, không unwind', () => {
  const filter = inventoryFilter({ q: '(', loai: 'tat-ca' }, now);
  assert.equal(filter.$and[0].$or[0].MaSP.$regex, '\\(');
  assert.equal(filter.$and[1].$or.length, 4);
  assert.equal(inventoryFilter({ loai: 'het-han' }, now).$and[1].HanSuDung.$lt.toISOString(), '2026-11-14T17:00:00.000Z');
});
test('Lookup không unwind sản phẩm; foreign document chỉ lấy field cho phép', () => {
  const stages = productJoins();
  assert.equal(stages.filter(stage => stage.$lookup).length, 2);
  assert.ok(stages.every(stage => !stage.$unwind));
  for (const stage of stages.filter(stage => stage.$lookup)) {
    const projection = stage.$lookup.pipeline[0].$project;
    assert.equal(projection.MatKhau, undefined); assert.equal(projection._id, 0);
  }
});
test('Lỗi URL 400 ngoài validator không phản chiếu nội dung đầu vào', () => {
  const error = Object.assign(new URIError('private-input-MatKhau'), { status: 400 });
  assert.equal(publicError(error).status, 400);
  assert.ok(!JSON.stringify(publicError(error)).includes('private-input-MatKhau'));
});
