import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBill, quoteInput, orderInput } from '../src/store/checkout-rules.js';
import { createCheckout } from '../src/store/checkout.js';
import { createCart, createCartService } from '../src/store/cart.js';

const now = new Date('2026-11-15T12:00:00Z');
const line = (price = 10000, quantity = 1, category = 'DM01') => ({ MaSP: 'SP_A', TenSP: 'Test', MaDM: category, DonGia: price, SoLuong: quantity, ThanhTien: price * quantity });
const coupon = patch => ({ MaKM: 'KM_TEST', GiaTri: 10, LoaiKhuyenMai: 'Phần trăm', DieuKien: {}, NgayBatDau: new Date('2026-01-01T00:00:00Z'), NgayKetThuc: new Date('2026-12-31T23:59:59Z'), ...patch });
for (const [price, points] of [[9999, 0], [10000, 1], [19999, 1]]) test(`ST-14 điểm thực thu ${price} = ${points}`, () => assert.equal(calculateBill([line(price)], null, 0, now).DiemDuocCong, points));
test('Giảm phần trăm làm tròn xuống, trần và tiền thực thu đúng', () => {
  assert.deepEqual(calculateBill([line(19999)], coupon({ DieuKien: { GiamToiDa: 1000 } }), 0, now), { TongTien: 19999, GiamGia: 1000, ThanhTien: 18999, DiemDuocCong: 1 });
  assert.equal(calculateBill([line(9999)], coupon(), 0, now).GiamGia, 999);
  assert.equal(calculateBill([line(10000)], coupon({ GiaTri: 0.01 }), 0, now).GiamGia, 1);
});
test('Phạm vi MaDM, lượng tối thiểu và fixed discount không vượt phần đủ điều kiện', () => {
  const lines = [line(10000, 3), { ...line(20000, 1, 'DM02'), MaSP: 'SP_B' }];
  assert.equal(calculateBill(lines, coupon({ DieuKien: { MaDM: 'DM01', SoLuongToiThieu: 3 } }), 0, now).GiamGia, 3000);
  assert.equal(calculateBill(lines, coupon({ LoaiKhuyenMai: 'Số tiền', GiaTri: 99999, DieuKien: { MaDM: 'DM01' } }), 0, now).GiamGia, 30000);
  assert.throws(() => calculateBill(lines, coupon({ DieuKien: { MaDM: 'DM02', SoLuongToiThieu: 2 } }), 0, now), { code: 'PROMOTION_NOT_ELIGIBLE' });
});
test('ST-05 đủ điều kiện điểm/tiền và từ chối điều kiện/loại không hỗ trợ', () => {
  for (const conditions of [{ DiemToiThieu: 100 }, { DonHangToiThieu: 20000 }, { MaDM: 'DM02' }]) assert.throws(() => calculateBill([line()], coupon({ DieuKien: conditions }), 0, now), { code: 'PROMOTION_NOT_ELIGIBLE' });
  for (const patch of [{ DieuKien: { unknown: 1 } }, { LoaiKhuyenMai: 'Unknown' }, { GiaTri: 101 }, { DieuKien: { DiemToiThieu: -1 } }]) assert.throws(() => calculateBill([line()], coupon(patch), 100, now), { code: 'PROMOTION_UNSUPPORTED' });
});
test('ST-06 mốc BSON bao gồm hai đầu, +1 ms và ngày tiếp theo hết hiệu lực', () => {
  const value = coupon();
  assert.doesNotThrow(() => calculateBill([line()], value, 0, value.NgayBatDau));
  assert.doesNotThrow(() => calculateBill([line()], value, 0, value.NgayKetThuc));
  for (const time of ['2026-12-31T23:59:59.001Z', '2027-01-01T00:00:00.000Z']) assert.throws(() => calculateBill([line()], value, 0, new Date(time)), { code: 'PROMOTION_EXPIRED' });
  assert.throws(() => calculateBill([line()], value, 0, new Date('2025-12-31T23:59:59.999Z')), { code: 'PROMOTION_NOT_STARTED' });
});
test('ST-13 body allowlist từ chối tiền/điểm/MaKH giả, địa chỉ sai, thiếu key', () => {
  const body = { diaChiGiao: { hoTenNguoiNhan: 'Test User', sdtNguoiNhan: '0901234567', diaChi: 'Địa chỉ giao hàng Test' }, phuongThuc: 'Ví điện tử' };
  assert.equal(quoteInput(body).method, 'Ví điện tử');
  for (const key of ['ThanhTien', 'gia', 'MaKH', 'DiemTichLuy']) assert.throws(() => quoteInput({ ...body, [key]: 1 }));
  assert.throws(() => quoteInput({ ...body, maKM: 0 }));
  assert.throws(() => quoteInput({ ...body, phuongThuc: 'Tiền mặt' }));
  assert.throws(() => orderInput({ maBaoGia: 'x' }, ''), { code: 'IDEMPOTENCY_KEY_REQUIRED' });
});
test('Guard chặn hook test ở runtime và main trước truy cập writer', () => {
  assert.throws(() => createCheckout({ config: { dbName: 'QLSieuThiMini' }, database: {}, testHooks: {} }));
});
test('Giỏ đang checkout không cho xóa hoặc cập nhật', async () => {
  const cart = createCart(); cart.items.set('SP_A', 1); cart.lockedBy = 'owned-operation';
  const service = createCartService({ forCart: async () => [] });
  await assert.rejects(service.clear({ cart }), { code: 'CART_BUSY' }); assert.equal(cart.items.size, 1);
});
