import { StoreError } from './errors.js';
import { exactBody, normalizePhone } from './validation.js';
import { storeCode } from './query.js';

export const PAYMENT_METHODS = Object.freeze([
  'Thanh toán khi nhận hàng (COD)',
  'Thanh toán khi nhận hàng',
  'Chuyển khoản',
  'Thẻ ngân hàng',
  'Ví điện tử'
]);
const fail = code => { throw new StoreError(409, code); };
export function bsonNumber(value) {
  return typeof value === 'number' ? value : ['Long', 'Decimal128', 'Int32', 'Double'].includes(value?._bsontype) ? Number(value.toString()) : NaN;
}
export function safeMoney(value) { if (!Number.isSafeInteger(value) || value < 0) fail('PRODUCT_DATA_INVALID'); return value; }
export function uuid(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new StoreError(400, 'VALIDATION_ERROR');
  return value.toLowerCase();
}
function text(value, min, max) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value) || [...value.trim()].length < min || [...value.trim()].length > max) throw new StoreError(400, 'VALIDATION_ERROR');
  return value.trim();
}
export function quoteInput(body) {
  exactBody(body, ['diaChiGiao', 'phuongThuc'], ['maKM']);
  exactBody(body.diaChiGiao, ['hoTenNguoiNhan', 'sdtNguoiNhan', 'diaChi']);
  if (!PAYMENT_METHODS.includes(body.phuongThuc)) throw new StoreError(400, 'VALIDATION_ERROR');
  if (body.maKM !== undefined && typeof body.maKM !== 'string') throw new StoreError(400, 'VALIDATION_ERROR');
  return { address: { HoTenNguoiNhan: text(body.diaChiGiao.hoTenNguoiNhan, 2, 100), SDTNguoiNhan: normalizePhone(body.diaChiGiao.sdtNguoiNhan), DiaChi: text(body.diaChiGiao.diaChi, 3, 500) },
    method: body.phuongThuc, ...(body.maKM ? { code: storeCode(text(body.maKM, 1, 50).toUpperCase()) } : {}) };
}
export function orderInput(body, key) {
  exactBody(body, ['maBaoGia']);
  if (!key) throw new StoreError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  return { quoteId: uuid(body.maBaoGia), key: uuid(key) };
}
export function calculateBill(lines, coupon, points, now) {
  let total = 0n;
  for (const line of lines) {
    safeMoney(line.DonGia);
    if (!Number.isInteger(line.SoLuong) || line.SoLuong < 1 || line.SoLuong > 99) fail('PRODUCT_DATA_INVALID');
    total += BigInt(line.DonGia) * BigInt(line.SoLuong);
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) fail('PRODUCT_DATA_INVALID');
  const TongTien = Number(total); let discount = 0n;
  if (coupon) {
    if (!(coupon.NgayBatDau instanceof Date) || !(coupon.NgayKetThuc instanceof Date) || coupon.NgayBatDau > coupon.NgayKetThuc) fail('PROMOTION_UNSUPPORTED');
    if (now < coupon.NgayBatDau) fail('PROMOTION_NOT_STARTED');
    if (now > coupon.NgayKetThuc) fail('PROMOTION_EXPIRED');
    const conditions = coupon.DieuKien;
    const allowed = ['DonHangToiThieu', 'DiemToiThieu', 'GiamToiDa', 'MaDM', 'SoLuongToiThieu'];
    if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions) || Object.keys(conditions).some(key => !allowed.includes(key))) fail('PROMOTION_UNSUPPORTED');
    for (const key of allowed.filter(key => key !== 'MaDM')) if (conditions[key] !== undefined && (!Number.isSafeInteger(bsonNumber(conditions[key])) || bsonNumber(conditions[key]) < 0)) fail('PROMOTION_UNSUPPORTED');
    if (conditions.MaDM !== undefined && (typeof conditions.MaDM !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(conditions.MaDM))) fail('PROMOTION_UNSUPPORTED');
    const eligible = conditions.MaDM ? lines.filter(line => line.MaDM === conditions.MaDM) : lines;
    const quantity = eligible.reduce((sum, line) => sum + line.SoLuong, 0);
    if (!eligible.length || TongTien < bsonNumber(conditions.DonHangToiThieu ?? 0) || points < bsonNumber(conditions.DiemToiThieu ?? 0) || quantity < bsonNumber(conditions.SoLuongToiThieu ?? 0)) fail('PROMOTION_NOT_ELIGIBLE');
    const base = eligible.reduce((sum, line) => sum + BigInt(line.DonGia) * BigInt(line.SoLuong), 0n);
    const value = bsonNumber(coupon.GiaTri);
    if (!Number.isFinite(value) || value < 0) fail('PROMOTION_UNSUPPORTED');
    if (coupon.LoaiKhuyenMai === 'Phần trăm') {
      const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(value));
      if (!match || value > 100) fail('PROMOTION_UNSUPPORTED');
      discount = base * BigInt(match[1] + (match[2] || '')) / (100n * 10n ** BigInt((match[2] || '').length));
    } else if (coupon.LoaiKhuyenMai === 'Số tiền' && Number.isSafeInteger(value)) discount = BigInt(value);
    else fail('PROMOTION_UNSUPPORTED');
    if (conditions.GiamToiDa !== undefined && discount > BigInt(bsonNumber(conditions.GiamToiDa))) discount = BigInt(bsonNumber(conditions.GiamToiDa));
    if (discount > base) discount = base;
  }
  const GiamGia = Number(discount); const ThanhTien = TongTien - GiamGia;
  return { TongTien, GiamGia, ThanhTien, DiemDuocCong: Math.floor(ThanhTien / 10000) };
}
export function orderDto(order) {
  if (!order) return undefined;
  return { MaHD: order.MaHD, NgayLap: order.NgayLap, TrangThaiDon: order.TrangThaiDon,
    ChiTiet: order.ChiTiet.map(line => Object.fromEntries(['MaSP', 'TenSP', 'SoLuong', 'DonGia', 'ThanhTien'].map(key => [key, line[key]]))),
    TongTien: order.TongTien, GiamGia: order.GiamGia, ThanhTien: order.ThanhTien,
    ...(order.MaKM ? { MaKM: order.MaKM } : {}), PhuongThucThanhToan: order.PhuongThucThanhToan,
    DiaChiGiao: { HoTenNguoiNhan: order.DiaChiGiao.HoTenNguoiNhan, SDTNguoiNhan: order.DiaChiGiao.SDTNguoiNhan, DiaChi: order.DiaChiGiao.DiaChi },
    ThanhToanGiaLap: true, TrangThaiThanhToan: order.TrangThaiThanhToan, DiemDuocCong: order.DiemDuocCong, TrangThaiTichDiem: order.TrangThaiTichDiem };
}
