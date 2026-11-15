import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, schemas } from '../src/middleware/validate.js';
import { employeePipeline, promotionPipeline, revenuePipeline, productReportPipeline, customerReportPipeline } from '../src/services/analytics.service.js';
import { referenceRules, integrityBranches, promotionTimePipeline } from '../src/services/integrity.service.js';
import { promotionEndDate } from '../public/js/format.js';

test('Admin: whitelist, lặp, ngày sai, limit, loại/collection không tương thích', () => {
  for (const value of ['limit=101', 'limit=2&limit=3', 'x=1', 'page=0']) assert.throws(() => parseQuery(new URLSearchParams(value), schemas.pagination));
  assert.throws(() => parseQuery(new URLSearchParams('loai=tong-tien&collection=SanPham'), schemas.integrity));
  assert.throws(() => parseQuery(new URLSearchParams('from=2026-02-30'), schemas.dates));
  assert.throws(() => parseQuery(new URLSearchParams('nhom=tuan'), schemas.revenueReport));
  assert.equal(parseQuery(new URLSearchParams(), schemas.revenueReport).nhom, 'thang');
});
test('Báo cáo dùng timezone VN, tiền snapshot, giữ tham chiếu khách thiếu và mã phụ', () => {
  const pipeline = revenuePipeline({ nhom: 'ngay' });
  assert.equal(pipeline[1].$group._id.$dateToString.timezone, 'Asia/Ho_Chi_Minh');
  assert.deepEqual(productReportPipeline({ sapXep: 'tien-hang' }).find(stage => stage.$group).$group.TienHang, { $sum: { $multiply: ['$ChiTiet.SoLuong', '$ChiTiet.DonGia'] } });
  assert.deepEqual(customerReportPipeline({}).find(stage => stage.$sort).$sort, { TongChiTieu: -1, _id: 1 });
  assert.ok(!customerReportPipeline({}).some(stage => stage.$unwind));
});
test('Nhân viên bắt đầu từ hồ sơ, lookup hóa đơn có ngày, không lấy mật khẩu', () => {
  const stages = employeePipeline({ q: '(', from: '2026-09-05', to: '2026-09-05' });
  assert.equal(stages[0].$match.$or[0].MaNV.$regex, '\\(');
  assert.equal(stages.find(stage => stage.$lookup).$lookup.pipeline[0].$match.NgayLap.$lt.toISOString(), '2026-09-05T17:00:00.000Z');
  assert.equal(stages.find(stage => stage.$project).$project.Luong, undefined);
});
test('Đủ 11 quan hệ; MaKM và DieuKien.MaDM tùy chọn; chỉ so sánh > ở ngày kết thúc', () => {
  assert.equal(referenceRules.length, 11); assert.equal(referenceRules.filter(rule => rule[5]).length, 2);
  assert.equal(integrityBranches({ loai: 'tat-ca' }).length, 13);
  assert.equal(integrityBranches({ loai: 'tham-chieu', collection: 'TaiKhoan' }).length, 1);
  assert.deepEqual(promotionTimePipeline().find(stage => stage.$match?.$expr).$match.$expr.$or[1], { $gt: ['$NgayLap', '$KM.NgayKetThuc'] });
  const end = new Date('2026-09-30T23:59:59Z'); assert.equal(promotionEndDate(end), '30/09/2026');
  assert.ok(JSON.stringify(promotionPipeline({}, end)).includes('Chưa xác định'));
});
