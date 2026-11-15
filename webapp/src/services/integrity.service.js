import { pagination } from '../utils/query.js';
import { meta, pageStages } from './analytics.service.js';

export const referenceRules = Object.freeze([
  ['SanPham', 'MaSP', 'MaDM', 'DanhMuc', 'MaDM'], ['SanPham', 'MaSP', 'MaNCC', 'NhaCungCap', 'MaNCC'],
  ['HoaDon', 'MaHD', 'MaKH', 'KhachHang', 'MaKH'], ['HoaDon', 'MaHD', 'MaNV', 'NhanVien', 'MaNV'], ['HoaDon', 'MaHD', 'MaKM', 'KhuyenMai', 'MaKM', true],
  ['HoaDon', 'MaHD', 'ChiTiet.MaSP', 'SanPham', 'MaSP'],
  ['PhieuNhap', 'MaPN', 'MaNCC', 'NhaCungCap', 'MaNCC'], ['PhieuNhap', 'MaPN', 'MaNV', 'NhanVien', 'MaNV'], ['PhieuNhap', 'MaPN', 'ChiTiet.MaSP', 'SanPham', 'MaSP'],
  ['TaiKhoan', 'TenDangNhap', 'MaNV', 'NhanVien', 'MaNV'], ['KhuyenMai', 'MaKM', 'DieuKien.MaDM', 'DanhMuc', 'MaDM', true]
]);
const literal = value => ({ $literal: value });
export const wrongTotalPipeline = () => [
  { $project: { _id: 0, MaDocument: '$MaHD', TongKhaiBao: '$TongTien', TongChiTiet: { $sum: '$ChiTiet.ThanhTien' } } },
  { $match: { $expr: { $ne: ['$TongKhaiBao', '$TongChiTiet'] } } },
  { $project: { _id: 0, Loai: literal('tong-tien'), Collection: literal('HoaDon'), MaDocument: 1, Field: literal('TongTien'), TongKhaiBao: 1, TongChiTiet: 1, ChenhLech: { $subtract: ['$TongKhaiBao', '$TongChiTiet'] }, LyDo: literal('Tổng tiền hàng lệch tổng thành tiền chi tiết.') } }
];
export const promotionTimePipeline = () => [
  { $match: { MaKM: { $exists: true } } }, { $project: { _id: 0, MaHD: 1, MaKM: 1, NgayLap: 1 } },
  { $lookup: { from: 'KhuyenMai', localField: 'MaKM', foreignField: 'MaKM', pipeline: [{ $project: { _id: 0, NgayBatDau: 1, NgayKetThuc: 1 } }], as: 'KM' } },
  { $unwind: '$KM' },
  { $match: { $expr: { $or: [{ $lt: ['$NgayLap', '$KM.NgayBatDau'] }, { $gt: ['$NgayLap', '$KM.NgayKetThuc'] }] } } },
  { $project: { _id: 0, Loai: literal('khuyen-mai'), Collection: literal('HoaDon'), MaDocument: '$MaHD', Field: literal('MaKM'), GiaTri: '$MaKM', NgayLap: 1, NgayBatDau: '$KM.NgayBatDau', NgayKetThuc: '$KM.NgayKetThuc', LyDo: literal('Ngày lập hóa đơn ngoài khoảng hiệu lực BSON của khuyến mãi.') } }
];
export function referencePipeline([source, key, field, target, targetKey, optional]) {
  const nested = field.startsWith('ChiTiet.');
  return [
    ...(optional ? [{ $match: { [field]: { $exists: true } } }] : []),
    { $project: { _id: 0, [key]: 1, [field]: 1 } },
    ...(nested ? [{ $unwind: { path: '$ChiTiet', includeArrayIndex: 'DongChiTiet' } }] : []),
    { $lookup: { from: target, localField: field, foreignField: targetKey, pipeline: [{ $project: { _id: 1 } }], as: 'Target' } },
    { $match: { 'Target.0': { $exists: false } } },
    { $project: { _id: 0, Loai: literal('tham-chieu'), Collection: literal(source), MaDocument: `$${key}`, Field: literal(field), GiaTri: { $ifNull: [`$${field}`, null] }, CollectionDich: literal(target), ...(nested ? { DongChiTiet: 1 } : {}), LyDo: literal('Mã tham chiếu không tồn tại trong collection đích.') } }
  ];
}
export function integrityBranches(query) {
  const branches = [];
  if (['tat-ca', 'tong-tien'].includes(query.loai) && (!query.collection || query.collection === 'HoaDon')) branches.push({ collection: 'HoaDon', pipeline: wrongTotalPipeline() });
  if (['tat-ca', 'khuyen-mai'].includes(query.loai) && (!query.collection || query.collection === 'HoaDon')) branches.push({ collection: 'HoaDon', pipeline: promotionTimePipeline() });
  if (['tat-ca', 'tham-chieu'].includes(query.loai)) for (const rule of referenceRules) if (!query.collection || query.collection === rule[0]) branches.push({ collection: rule[0], pipeline: referencePipeline(rule) });
  return branches;
}
export async function checkIntegrity(db, query) {
  const [first, ...rest] = integrityBranches(query);
  const [result] = await (await db.collection(first.collection)).aggregate([
    ...first.pipeline, ...rest.map(branch => ({ $unionWith: { coll: branch.collection, pipeline: branch.pipeline } })),
    { $facet: {
      items: [{ $sort: { Loai: 1, Collection: 1, MaDocument: 1, Field: 1, DongChiTiet: 1 } }, ...pageStages(query)],
      total: [{ $count: 'value' }], groups: [{ $group: { _id: '$Loai', SoLoi: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, Loai: '$_id', SoLoi: 1 } }]
    } }
  ]).toArray();
  return { data: result?.items || [], pagination: pagination(query.page, query.limit, result?.total[0]?.value || 0), summary: { 'tong-tien': 0, 'khuyen-mai': 0, 'tham-chieu': 0, ...Object.fromEntries((result?.groups || []).map(row => [row.Loai, row.SoLoi])) }, meta: { ...meta(query), totalBasis: 'Số lỗi, một document có thể có nhiều lỗi', referenceRelations: 11 } };
}
