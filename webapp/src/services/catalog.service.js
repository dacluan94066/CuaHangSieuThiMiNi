import { projections } from '../utils/projections.js';
import { pagination, searchFilter } from '../utils/query.js';

export async function listCatalog(db, name, query) {
  const field = name === 'DanhMuc' ? 'MaDM' : 'MaNCC';
  const title = name === 'DanhMuc' ? 'TenDM' : 'TenNCC';
  const collection = await db.collection(name);
  const filter = searchFilter(query.q, [field, title]);
  const [data, total] = await Promise.all([
    collection.find(filter, { projection: projections[name] }).sort({ [field]: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
    collection.countDocuments(filter)
  ]);
  return { data, pagination: pagination(query.page, query.limit, total) };
}

export async function paymentOptions(db, query) {
  const collection = await db.collection('HoaDon');
  const [result] = await collection.aggregate([
    { $group: { _id: '$PhuongThucThanhToan' } },
    { $sort: { _id: 1 } },
    { $facet: {
      data: [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }, { $project: { _id: 0, phuongThuc: '$_id' } }],
      total: [{ $count: 'value' }]
    } }
  ]).toArray();
  return { data: result.data, pagination: pagination(query.page, query.limit, result.total[0]?.value || 0) };
}
