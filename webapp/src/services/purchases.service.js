import { dateRange, TIMEZONE } from '../utils/dates.js';
import { searchFilter, pagination } from '../utils/query.js';
import { purchaseJoins } from '../pipelines/joins.js';

export const purchaseSort = Object.freeze({ NgayNhap: -1, MaPN: 1, _id: 1 });

export function purchaseFilter(query) {
  const filter = { ...searchFilter(query.q, ['MaPN']), ...dateRange(query.from, query.to, 'NgayNhap') };
  if (query.maNCC) filter.MaNCC = query.maNCC;
  if (query.maNV) filter.MaNV = query.maNV;
  return filter;
}

export async function listPurchases(db, query) {
  const collection = await db.collection('PhieuNhap');
  const filter = purchaseFilter(query);
  const [data, total] = await Promise.all([
    collection.aggregate([{ $match: filter }, { $sort: purchaseSort }, { $skip: (query.page - 1) * query.limit }, { $limit: query.limit }, ...purchaseJoins()]).toArray(),
    collection.countDocuments(filter)
  ]);
  return { data, pagination: pagination(query.page, query.limit, total), meta: { updatedAt: new Date().toISOString(), timezone: TIMEZONE } };
}

export async function purchaseDetail(db, code) {
  const [data] = await (await db.collection('PhieuNhap')).aggregate([{ $match: { MaPN: code } }, { $limit: 1 }, ...purchaseJoins(true)]).toArray();
  return data ? { data, meta: { updatedAt: new Date().toISOString(), timezone: TIMEZONE } } : null;
}
