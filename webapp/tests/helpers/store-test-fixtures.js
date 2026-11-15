import { randomInt, randomUUID } from 'node:crypto';
import { assertStoreWriteTarget } from '../../src/store/guards.js';
import { createPasswordService } from '../../src/store/passwords.js';

export async function createTestActor(db, config, tag) {
  assertStoreWriteTarget(config, db.databaseName);
  const operation = randomUUID(); const maKH = 'KH_ONL_' + randomUUID().replaceAll('-', ''); const maTKKH = 'TKKH_' + randomUUID().replaceAll('-', '');
  let phone;
  for (let i = 0; i < 20; i++) {
    const candidate = '09' + String(randomInt(100000000)).padStart(8, '0');
    if (!await db.collection('KhachHang').countDocuments({ SDT: candidate }) && !await db.collection('TaiKhoanKhachHang').countDocuments({ SDT: candidate })) { phone = candidate; break; }
  }
  if (!phone) throw new Error('Cannot allocate Test phone');
  const password = 'Test-private-' + randomUUID(); const secret = await createPasswordService().hash(password); const now = new Date();
  await db.collection('YeuCauCuaHang').insertOne({ MaYeuCau: operation, Loai: 'DANG_KY', MaKH: maKH, MaTKKH: maTKKH, TrangThai: 'HOAN_TAT', Buoc: 'TEST_FIXTURE', NgayTao: now, NgayCapNhat: now });
  await db.collection('KhachHang').insertOne({ MaKH: maKH, HoTen: `[TEST] ${tag}`, SDT: phone, DiemTichLuy: 0, NgayDangKy: now, NguonTao: 'ONLINE', MaYeuCauDangKy: operation });
  await db.collection('TaiKhoanKhachHang').insertOne({ MaTKKH: maTKKH, MaKH: maKH, SDT: phone, ...secret, TrangThai: 'HoatDong', MaYeuCauDangKy: operation, NgayTao: now, NgayCapNhat: now });
  return { maKH, phone, password };
}
export async function createTestProduct(db, config, tag, { price = 10000, stock = 10 } = {}) {
  assertStoreWriteTarget(config, db.databaseName);
  const code = 'S4_' + randomUUID().replaceAll('-', '');
  await db.collection('SanPham').insertOne({ MaSP: code, TenSP: `[TEST] ${tag}`, MaDM: 'DM01', MaNCC: 'NCC01', DonGiaNhap: 0, DonGiaBan: price, SoLuongTon: stock, DonViTinh: 'Cái', TrangThai: 'Đang bán', HanSuDung: new Date('2099-12-31T00:00:00Z') });
  return code;
}
