import { searchFilter, pagination } from '../utils/query.js';
import { stockStatus, expiryStatus, TIMEZONE } from '../utils/dates.js';
import { productJoins } from '../pipelines/joins.js';

export function stockFilter(value) {
  if (value === 'con-hang') return { SoLuongTon: { $gt: 0 } };
  if (value === 'ton-thap') return { SoLuongTon: { $gte: 1, $lte: 19 } };
  if (value === 'het-hang') return { SoLuongTon: 0 };
  return {};
}

export function productFilter(query) {
  const filter = { ...searchFilter(query.q, ['MaSP', 'TenSP']), ...stockFilter(query.tonKho) };
  if (query.maDM) filter.MaDM = query.maDM;
  if (query.maNCC) filter.MaNCC = query.maNCC;
  if (query.giaTu !== undefined || query.giaDen !== undefined) {
    filter.DonGiaBan = {};
    if (query.giaTu !== undefined) filter.DonGiaBan.$gte = query.giaTu;
    if (query.giaDen !== undefined) filter.DonGiaBan.$lte = query.giaDen;
  }
  return filter;
}

export function productSort(value) {
  const fields = { 'gia-tang': { DonGiaBan: 1 }, 'gia-giam': { DonGiaBan: -1 }, 'ton-tang': { SoLuongTon: 1 }, 'ton-giam': { SoLuongTon: -1 } };
  return { ...(fields[value] || {}), MaSP: 1, _id: 1 };
}

export function decorateProduct(product, now) {
  const TrangThaiTon = stockStatus(product.SoLuongTon);
  const TrangThaiHanSuDung = expiryStatus(product.HanSuDung, now);
  const CanhBao = [];
  if (['Hết hàng', 'Tồn thấp'].includes(TrangThaiTon)) CanhBao.push(TrangThaiTon);
  if (['Hết hạn', 'Sắp hết hạn'].includes(TrangThaiHanSuDung)) CanhBao.push(TrangThaiHanSuDung);
  return { ...product, HanSuDung: product.HanSuDung ?? null, TrangThaiTon, TrangThaiHanSuDung, CanhBao };
}

export async function productPage(db, filter, query, now = new Date()) {
  const collection = await db.collection('SanPham');
  const [documents, total] = await Promise.all([
    collection.aggregate([
      { $match: filter }, { $sort: productSort(query.sort) },
      { $skip: (query.page - 1) * query.limit }, { $limit: query.limit }, ...productJoins()
    ]).toArray(),
    collection.countDocuments(filter)
  ]);
  return { data: documents.map(document => decorateProduct(document, now)), pagination: pagination(query.page, query.limit, total), meta: { updatedAt: now.toISOString(), timezone: TIMEZONE } };
}

export async function listProducts(db, query) { return productPage(db, productFilter(query), query); }

export async function productDetail(db, code) {
  const now = new Date();
  const [document] = await (await db.collection('SanPham')).aggregate([{ $match: { MaSP: code } }, { $limit: 1 }, ...productJoins()]).toArray();
  return document ? { data: decorateProduct(document, now), meta: { updatedAt: now.toISOString(), timezone: TIMEZONE } } : null;
}
