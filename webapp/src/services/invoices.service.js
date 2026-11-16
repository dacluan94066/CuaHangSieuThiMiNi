import { dateRange, promotionStatus, TIMEZONE } from '../utils/dates.js';
import { searchFilter, pagination } from '../utils/query.js';
import { invoiceJoins } from '../pipelines/joins.js';

export const invoiceSort = Object.freeze({ NgayLap: -1, MaHD: 1, _id: 1 });

export function invoiceFilter(query) {
  const filter = { ...searchFilter(query.q, ['MaHD']), ...dateRange(query.from, query.to) };
  if (query.maKH) filter.MaKH = query.maKH;
  if (query.maNV) filter.MaNV = query.maNV;
  if (query.thanhToan) filter.PhuongThucThanhToan = query.thanhToan;
  if (query.thucThuTren !== undefined) filter.ThanhTien = { $gt: query.thucThuTren };
  if (query.nguonDon === 'ONLINE') filter.NguonDon = 'ONLINE';
  else if (query.nguonDon === 'POS') filter.NguonDon = { $ne: 'ONLINE' };
  if (query.trangThaiDon) filter.TrangThaiDon = query.trangThaiDon;
  return filter;
}

export function decorateInvoice(document, now = new Date()) {
  const promotion = document.KhuyenMai;
  return { ...document, KhuyenMai: promotion ? {
    ...promotion,
    TrangThaiTinhToan: promotionStatus(promotion.NgayBatDau, promotion.NgayKetThuc, now),
    TrangThaiTaiNgayLap: promotionStatus(promotion.NgayBatDau, promotion.NgayKetThuc, document.NgayLap)
  } : null };
}

export async function listInvoices(db, query) {
  const collection = await db.collection('HoaDon');
  const filter = invoiceFilter(query);
  const [data, total] = await Promise.all([
    collection.aggregate([{ $match: filter }, { $sort: invoiceSort }, { $skip: (query.page - 1) * query.limit }, { $limit: query.limit }, ...invoiceJoins()]).toArray(),
    collection.countDocuments(filter)
  ]);
  return { data, pagination: pagination(query.page, query.limit, total), meta: { updatedAt: new Date().toISOString(), timezone: TIMEZONE } };
}

export async function invoiceDetail(db, code) {
  const now = new Date();
  const [document] = await (await db.collection('HoaDon')).aggregate([{ $match: { MaHD: code } }, { $limit: 1 }, ...invoiceJoins(true)]).toArray();
  return document ? { data: decorateInvoice(document, now), meta: { updatedAt: now.toISOString(), timezone: TIMEZONE } } : null;
}

export async function updateOrderStatus(db, maHD, trangThaiDon) {
  const allowed = ['Đã xác nhận', 'Đang giao hàng', 'Hoàn tất', 'Đã hủy'];
  if (!allowed.includes(trangThaiDon)) {
    throw new Error(`Trạng thái không hợp lệ: ${trangThaiDon}`);
  }
  const hoadonColl = await db.collection('HoaDon');
  const order = await hoadonColl.findOne({ MaHD: maHD });
  if (!order) {
    return { ok: false, message: 'Không tìm thấy hóa đơn.' };
  }

  const updateFields = { TrangThaiDon: trangThaiDon };

  // Nếu hoàn tất đơn: Tự động cộng điểm tích lũy cho khách nếu chưa cộng
  if (trangThaiDon === 'Hoàn tất') {
    if (order.TrangThaiTichDiem !== 'DaCong' && order.DiemDuocCong > 0 && order.MaKH) {
      const khachHangColl = await db.collection('KhachHang');
      await khachHangColl.updateOne(
        { MaKH: order.MaKH },
        { $inc: { DiemTichLuy: order.DiemDuocCong } }
      );
      updateFields.TrangThaiTichDiem = 'DaCong';
    }
  }

  // Nếu hủy đơn: Hoàn trả số lượng tồn kho
  if (trangThaiDon === 'Đã hủy' && order.TrangThaiDon !== 'Đã hủy') {
    if (Array.isArray(order.ChiTiet)) {
      const sanPhamColl = await db.collection('SanPham');
      for (const item of order.ChiTiet) {
        if (item.MaSP && item.SoLuong > 0) {
          await sanPhamColl.updateOne(
            { MaSP: item.MaSP },
            { $inc: { SoLuongTon: item.SoLuong } }
          );
        }
      }
    }
  }

  await hoadonColl.updateOne({ MaHD: maHD }, { $set: updateFields });
  const updated = await invoiceDetail(db, maHD);
  return { ok: true, data: updated?.data };
}
