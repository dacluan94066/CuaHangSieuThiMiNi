import { dateRange, TIMEZONE } from '../utils/dates.js';
import { searchFilter, pagination } from '../utils/query.js';

export const meta = query => ({ updatedAt: new Date().toISOString(), timezone: TIMEZONE, range: { from: query.from || null, to: query.to || null } });
export const pageStages = query => [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }];
export async function pagedAggregate(db, collection, pipeline, query, extra = {}) {
  const [result] = await (await db.collection(collection)).aggregate([...pipeline, { $facet: { items: pageStages(query), total: [{ $count: 'value' }] } }]).toArray();
  return { data: result?.items || [], pagination: pagination(query.page, query.limit, result?.total[0]?.value || 0), meta: { ...meta(query), ...extra } };
}

// 05 bài 3–4; start at employees to retain employees with zero invoices.
export function employeePipeline(query) {
  return [
    { $match: searchFilter(query.q, ['MaNV', 'HoTen']) },
    { $project: { _id: 0, MaNV: 1, HoTen: 1, ChucVu: 1, TrangThai: 1 } },
    { $lookup: { from: 'HoaDon', let: { code: '$MaNV' }, pipeline: [
      { $match: { ...dateRange(query.from, query.to), $expr: { $eq: ['$MaNV', '$$code'] } } },
      { $group: { _id: null, DoanhThu: { $sum: '$ThanhTien' }, SoHoaDon: { $sum: 1 } } }
    ], as: 'Stats' } },
    { $set: { DoanhThu: { $ifNull: [{ $arrayElemAt: ['$Stats.DoanhThu', 0] }, 0] }, SoHoaDon: { $ifNull: [{ $arrayElemAt: ['$Stats.SoHoaDon', 0] }, 0] },
      LaNhanVienHeThong: { $eq: ['$MaNV', 'NV_ONLINE'] } } },
    { $project: { Stats: 0 } }, { $sort: { MaNV: 1 } }
  ];
}
export const listEmployees = (db, query) => pagedAggregate(db, 'NhanVien', employeePipeline(query), query);

export function promotionPipeline(query, now = new Date()) {
  const labels = { 'sap-dien-ra': 'Sắp diễn ra', 'dang-ap-dung': 'Đang áp dụng', 'da-ket-thuc': 'Đã kết thúc' };
  return [
    { $match: searchFilter(query.q, ['MaKM', 'TenKM']) },
    { $project: { _id: 0, MaKM: 1, TenKM: 1, LoaiKhuyenMai: 1, GiaTri: 1, NgayBatDau: 1, NgayKetThuc: 1, TrangThai: 1,
      'DieuKien.DonHangToiThieu': 1, 'DieuKien.DiemToiThieu': 1, 'DieuKien.GiamToiDa': 1, 'DieuKien.MaDM': 1, 'DieuKien.SoLuongToiThieu': 1,
      CoDieuKienChuaHoTro: { $gt: [{ $size: { $setDifference: [
        { $map: { input: { $objectToArray: { $ifNull: ['$DieuKien', {}] } }, as: 'item', in: '$$item.k' } },
        ['DonHangToiThieu', 'DiemToiThieu', 'GiamToiDa', 'MaDM', 'SoLuongToiThieu']
      ] } }, 0] } } },
    { $set: { TrangThaiTinhToan: { $switch: { branches: [
      { case: { $or: [{ $ne: [{ $type: '$NgayBatDau' }, 'date'] }, { $ne: [{ $type: '$NgayKetThuc' }, 'date'] }, { $gt: ['$NgayBatDau', '$NgayKetThuc'] }] }, then: 'Chưa xác định' },
      { case: { $lt: [now, '$NgayBatDau'] }, then: 'Sắp diễn ra' },
      { case: { $gt: [now, '$NgayKetThuc'] }, then: 'Đã kết thúc' }
    ], default: 'Đang áp dụng' } } } },
    ...(query.trangThai ? [{ $match: { TrangThaiTinhToan: labels[query.trangThai] } }] : []), { $sort: { MaKM: 1 } }
  ];
}
export const listPromotions = (db, query) => pagedAggregate(db, 'KhuyenMai', promotionPipeline(query), query, { promotionEndDisplayTimezone: 'UTC' });

// 05 bài 1, 12 (sales only in the reduced report scope).
export const overviewPipeline = query => [
  { $match: dateRange(query.from, query.to) },
  { $group: { _id: null, DoanhThu: { $sum: '$ThanhTien' }, TienHang: { $sum: '$TongTien' }, GiamGia: { $sum: '$GiamGia' }, SoHoaDon: { $sum: 1 }, TrungBinhHoaDon: { $avg: '$ThanhTien' }, ThapNhat: { $min: '$ThanhTien' }, CaoNhat: { $max: '$ThanhTien' } } },
  { $project: { _id: 0 } }
];
export async function salesOverview(db, query) {
  const [row] = await (await db.collection('HoaDon')).aggregate(overviewPipeline(query)).toArray();
  return { data: row || { DoanhThu: 0, TienHang: 0, GiamGia: 0, SoHoaDon: 0, TrungBinhHoaDon: 0, ThapNhat: 0, CaoNhat: 0 }, meta: meta(query) };
}
// 05 bài 2/22, explicit Vietnam timezone and server pagination.
export function revenuePipeline(query) {
  return [
    { $match: dateRange(query.from, query.to) },
    { $group: { _id: { $dateToString: { format: query.nhom === 'ngay' ? '%Y-%m-%d' : '%Y-%m', date: '$NgayLap', timezone: TIMEZONE } }, DoanhThu: { $sum: '$ThanhTien' }, SoHoaDon: { $sum: 1 }, TrungBinhHoaDon: { $avg: '$ThanhTien' } } },
    { $sort: { _id: 1 } }, { $project: { _id: 0, Moc: '$_id', DoanhThu: 1, SoHoaDon: 1, TrungBinhHoaDon: 1 } }
  ];
}
export const revenueReport = (db, query) => pagedAggregate(db, 'HoaDon', revenuePipeline(query), query, { group: query.nhom });

// 05 bài 5–8: line names/prices are snapshots; current product only for category filter.
export function productReportPipeline(query) {
  return [
    { $match: dateRange(query.from, query.to) }, { $sort: { NgayLap: 1, MaHD: 1 } }, { $unwind: '$ChiTiet' },
    ...(query.maDM ? [{ $lookup: { from: 'SanPham', localField: 'ChiTiet.MaSP', foreignField: 'MaSP', pipeline: [{ $project: { _id: 0, MaDM: 1 } }], as: 'Current' } }, { $match: { 'Current.MaDM': query.maDM } }] : []),
    { $group: { _id: '$ChiTiet.MaSP', TenSP: { $first: '$ChiTiet.TenSP' }, SoLuongBan: { $sum: '$ChiTiet.SoLuong' }, TienHang: { $sum: { $multiply: ['$ChiTiet.SoLuong', '$ChiTiet.DonGia'] } } } },
    { $sort: { [query.sapXep === 'tien-hang' ? 'TienHang' : 'SoLuongBan']: -1, _id: 1 } }, { $project: { _id: 0, MaSP: '$_id', TenSP: 1, SoLuongBan: 1, TienHang: 1 } }
  ];
}
export const productReport = (db, query) => pagedAggregate(db, 'HoaDon', productReportPipeline(query), query, { amountBasis: 'Tiền hàng trước giảm giá', categoryBasis: 'Danh mục hiện tại của sản phẩm' });

// 05 bài 9–11: preserve missing customer references for the audit page.
export function customerReportPipeline(query) {
  return [
    { $match: dateRange(query.from, query.to) },
    { $group: { _id: '$MaKH', TongChiTieu: { $sum: '$ThanhTien' }, SoLanMua: { $sum: 1 } } },
    { $sort: { [query.sapXep === 'so-lan-mua' ? 'SoLanMua' : 'TongChiTieu']: -1, _id: 1 } },
    { $lookup: { from: 'KhachHang', localField: '_id', foreignField: 'MaKH', pipeline: [{ $project: { _id: 0, HoTen: 1 } }], as: 'Customer' } },
    { $project: { _id: 0, MaKH: '$_id', HoTen: { $ifNull: [{ $arrayElemAt: ['$Customer.HoTen', 0] }, 'Không tìm thấy khách hàng'] }, ThamChieuThieu: { $eq: [{ $size: '$Customer' }, 0] }, TongChiTieu: 1, SoLanMua: 1 } }
  ];
}
export const customerReport = (db, query) => pagedAggregate(db, 'HoaDon', customerReportPipeline(query), query);
