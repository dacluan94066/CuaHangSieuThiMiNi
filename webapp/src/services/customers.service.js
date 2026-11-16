import { projections } from '../utils/projections.js';
import { searchFilter, pagination } from '../utils/query.js';
import { TIMEZONE } from '../utils/dates.js';

export const customerFilter = query => searchFilter(query.q, ['MaKH', 'HoTen', 'SDT']);

export function customerStatistics() {
  return [
    { $lookup: {
      from: 'HoaDon', localField: 'MaKH', foreignField: 'MaKH',
      pipeline: [{ $group: { _id: null, SoLanMua: { $sum: 1 }, TongChiTieu: { $sum: '$ThanhTien' } } }, { $project: { _id: 0, SoLanMua: 1, TongChiTieu: 1 } }], as: '_thongKe'
    } },
    { $set: { ThongKe: { $ifNull: [{ $arrayElemAt: ['$_thongKe', 0] }, { SoLanMua: 0, TongChiTieu: 0 }] } } },
    { $project: { ...projections.KhachHang, ThongKe: 1 } }
  ];
}

export async function listCustomers(db, query) {
  const collection = await db.collection('KhachHang');
  const filter = customerFilter(query);
  const [data, total] = await Promise.all([
    collection.find(filter, { projection: projections.KhachHang }).sort({ MaKH: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
    collection.countDocuments(filter)
  ]);
  return { data, pagination: pagination(query.page, query.limit, total), meta: { updatedAt: new Date().toISOString(), timezone: TIMEZONE } };
}

export async function customerDetail(db, code) {
  const [data] = await (await db.collection('KhachHang')).aggregate([{ $match: { MaKH: code } }, { $limit: 1 }, ...customerStatistics()]).toArray();
  return data ? { data, meta: { updatedAt: new Date().toISOString(), timezone: TIMEZONE } } : null;
}

export async function createCustomer(db, body) {
  const collection = await db.collection('KhachHang');

  let maKH = (body.MaKH || '').trim().toUpperCase();
  if (!maKH) {
    const all = await collection.find({}, { projection: { MaKH: 1 } }).toArray();
    let maxNum = 0;
    for (const c of all) {
      const match = (c.MaKH || '').match(/^KH(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    maKH = `KH${String(maxNum + 1).padStart(3, '0')}`;
  }

  const hoTen = (body.HoTen || '').trim();
  const sdt = (body.SDT || '').trim();

  if (!hoTen) throw new Error('Họ tên khách hàng không được để trống.');
  if (!/^0\d{9}$/.test(sdt)) throw new Error('Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0 (VD: 0901234567).');

  const [existingCode, existingPhone] = await Promise.all([
    collection.findOne({ MaKH: maKH }),
    collection.findOne({ SDT: sdt })
  ]);

  if (existingCode) throw new Error(`Mã khách hàng "${maKH}" đã tồn tại.`);
  if (existingPhone) throw new Error(`Số điện thoại "${sdt}" đã được đăng ký bởi khách hàng khác.`);

  const diem = Math.max(0, parseInt(body.DiemTichLuy, 10) || 0);
  const ngayDangKy = body.NgayDangKy ? new Date(body.NgayDangKy) : new Date();

  const newDoc = {
    MaKH: maKH,
    HoTen: hoTen,
    SDT: sdt,
    DiemTichLuy: diem,
    NgayDangKy: ngayDangKy
  };

  const email = (body.Email || '').trim();
  const diaChi = (body.DiaChi || '').trim();
  if (email) newDoc.Email = email;
  if (diaChi) newDoc.DiaChi = diaChi;

  await collection.insertOne(newDoc);
  return { data: newDoc, message: 'Thêm khách hàng mới thành công!' };
}

export async function updateCustomer(db, maKH, body, isAdmin = false) {
  const collection = await db.collection('KhachHang');
  const existing = await collection.findOne({ MaKH: maKH });
  if (!existing) throw new Error(`Không tìm thấy khách hàng với mã "${maKH}".`);

  const hoTen = (body.HoTen || '').trim();
  const sdt = (body.SDT || '').trim();

  if (!hoTen) throw new Error('Họ tên khách hàng không được để trống.');
  if (!/^0\d{9}$/.test(sdt)) throw new Error('Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0 (VD: 0901234567).');

  if (sdt !== existing.SDT) {
    const dupPhone = await collection.findOne({ SDT: sdt, MaKH: { $ne: maKH } });
    if (dupPhone) throw new Error(`Số điện thoại "${sdt}" đã được đăng ký bởi khách hàng khác.`);
  }

  const setFields = {
    HoTen: hoTen,
    SDT: sdt
  };
  const unsetFields = {};

  const email = (body.Email || '').trim();
  const diaChi = (body.DiaChi || '').trim();

  if (email) setFields.Email = email; else unsetFields.Email = '';
  if (diaChi) setFields.DiaChi = diaChi; else unsetFields.DiaChi = '';

  if (isAdmin && body.DiemTichLuy !== undefined && body.DiemTichLuy !== '') {
    const points = parseInt(body.DiemTichLuy, 10);
    if (isNaN(points) || points < 0) throw new Error('Điểm tích lũy phải là số nguyên không âm.');
    setFields.DiemTichLuy = points;
  }

  const updateOp = { $set: setFields };
  if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;

  await collection.updateOne({ MaKH: maKH }, updateOp);

  // If phone changed, sync with TaiKhoanKhachHang if exists
  if (sdt !== existing.SDT) {
    try {
      await (await db.collection('TaiKhoanKhachHang')).updateOne(
        { MaKH: maKH },
        { $set: { SDT: sdt, NgayCapNhat: new Date() } }
      );
    } catch (_) {}
  }

  return { data: { ...existing, ...setFields }, message: 'Cập nhật thông tin khách hàng thành công!' };
}

export async function deleteCustomer(db, maKH) {
  const collection = await db.collection('KhachHang');
  const existing = await collection.findOne({ MaKH: maKH });
  if (!existing) throw new Error(`Không tìm thấy khách hàng với mã "${maKH}".`);

  const invoiceCount = await (await db.collection('HoaDon')).countDocuments({ MaKH: maKH });
  if (invoiceCount > 0) {
    throw new Error(`Không thể xóa khách hàng "${maKH}" vì đã phát sinh ${invoiceCount} hóa đơn mua hàng. Hãy giữ lại hồ sơ để bảo toàn số liệu kế toán và doanh thu.`);
  }

  await collection.deleteOne({ MaKH: maKH });
  try {
    await (await db.collection('TaiKhoanKhachHang')).deleteOne({ MaKH: maKH });
  } catch (_) {}

  return { ok: true, message: `Đã xóa khách hàng "${maKH}" (${existing.HoTen}) thành công.` };
}
