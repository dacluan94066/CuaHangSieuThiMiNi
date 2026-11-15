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
