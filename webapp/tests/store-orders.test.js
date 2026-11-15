import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerFilter, orderSort, orderProjection } from '../src/store/orders.js';
import { storeQuery } from '../src/store/query.js';
import { orderDto } from '../src/store/checkout-rules.js';

test('S4 filter luôn gắn chủ sở hữu và ONLINE, sort ngày giảm + mã tăng', () => {
  assert.deepEqual(ownerFilter('KH_A'), { MaKH: 'KH_A', NguonDon: 'ONLINE' });
  assert.deepEqual(orderSort, { NgayLap: -1, MaHD: 1 });
});
test('S4 query chỉ nhận page/limit, chặn lạ/lặp và limit101', () => {
  assert.deepEqual(storeQuery(new URLSearchParams('page=2&limit=100'), 'orders'), { page: 2, limit: 100 });
  for (const query of ['maKH=other', 'NguonDon=POS', 'page=1&page=2', 'limit=101', 'limit=-1', 'sort=MaHD']) assert.throws(() => storeQuery(new URLSearchParams(query), 'orders'));
});
test('S4 projection và DTO giữ snapshot, không đưa marker/secret lồng nhau ra ngoài', () => {
  const order = { MaHD: 'HD_TEST', ChiTiet: [{ MaSP: 'SP_X', TenSP: 'Tên tại lúc mua', SoLuong: 1, DonGia: 10000, ThanhTien: 10000, Salt: 'fake-secret' }],
    DiaChiGiao: { HoTenNguoiNhan: 'Test', SDTNguoiNhan: '0901234567', DiaChi: 'Địa chỉ đã lưu', SID: 'fake-secret' }, Snapshot: {}, GiuChoOnline: [], MatKhauBam: 'fake' };
  const result = orderDto(order);
  assert.equal(result.ChiTiet[0].TenSP, 'Tên tại lúc mua'); assert.equal(result.ChiTiet[0].DonGia, 10000);
  assert.doesNotMatch(JSON.stringify(result), /Salt|SID|Snapshot|MatKhau|GiuChoOnline/);
  assert.equal(orderProjection['ChiTiet.TenSP'], 1); assert.equal(orderProjection['DiaChiGiao.DiaChi'], 1); assert.equal(orderProjection.Snapshot, undefined);
});
