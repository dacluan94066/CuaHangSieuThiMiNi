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
