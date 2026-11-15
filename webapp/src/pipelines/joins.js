import { projections } from '../utils/projections.js';

// Không unwind: sản phẩm không có tham chiếu vẫn tồn tại, mỗi nguồn vẫn một dòng.
export function productJoins() {
  return [
    { $lookup: {
      from: 'DanhMuc', localField: 'MaDM', foreignField: 'MaDM',
      pipeline: [{ $project: { _id: 0, MaDM: 1, TenDM: 1 } }], as: '_danhMuc'
    } },
    { $lookup: {
      from: 'NhaCungCap', localField: 'MaNCC', foreignField: 'MaNCC',
      pipeline: [{ $project: projections.NhaCungCap }], as: '_nhaCungCap'
    } },
    { $set: {
      TenDM: { $ifNull: [{ $arrayElemAt: ['$_danhMuc.TenDM', 0] }, 'Không tìm thấy thông tin liên kết'] },
      TenNCC: { $ifNull: [{ $arrayElemAt: ['$_nhaCungCap.TenNCC', 0] }, 'Không tìm thấy thông tin liên kết'] },
      NhaCungCap: { $ifNull: [{ $arrayElemAt: ['$_nhaCungCap', 0] }, null] },
      ThamChieuThieu: { $concatArrays: [
        { $cond: [{ $eq: [{ $size: '$_danhMuc' }, 0] }, ['MaDM'], []] },
        { $cond: [{ $eq: [{ $size: '$_nhaCungCap' }, 0] }, ['MaNCC'], []] }
      ] }
    } },
    { $project: projections.SanPham }
  ];
}

const missingLabel = 'Không tìm thấy thông tin liên kết';
const firstOrNull = field => ({ $ifNull: [{ $arrayElemAt: [field, 0] }, null] });
const nameOrFallback = field => ({ $ifNull: [{ $arrayElemAt: [field, 0] }, missingLabel] });
const missingReference = (array, field) => ({ $cond: [{ $eq: [{ $size: array }, 0] }, [field], []] });
const referenceLookup = (from, field, as, projection) => ({ $lookup: { from, localField: field, foreignField: field, as, pipeline: [{ $project: projection }] } });

export function invoiceJoins(detail = false) {
  const stages = [
    referenceLookup('KhachHang', 'MaKH', '_khachHang', projections.KhachHangLienKet),
    referenceLookup('NhanVien', 'MaNV', '_nhanVien', projections.NhanVienLienKet),
    { $set: {
      TenKH: nameOrFallback('$_khachHang.HoTen'), TenNV: nameOrFallback('$_nhanVien.HoTen'),
      KhachHang: firstOrNull('$_khachHang'), NhanVien: firstOrNull('$_nhanVien'),
      ThamChieuThieu: { $concatArrays: [missingReference('$_khachHang', 'MaKH'), missingReference('$_nhanVien', 'MaNV')] }
    } }
  ];
  if (detail) {
    stages.push(referenceLookup('KhuyenMai', 'MaKM', '_khuyenMai', projections.KhuyenMaiLienKet), { $set: {
      KhuyenMai: firstOrNull('$_khuyenMai'),
      ThamChieuThieu: { $concatArrays: ['$ThamChieuThieu', { $cond: [
        { $and: [{ $ne: [{ $ifNull: ['$MaKM', ''] }, ''] }, { $eq: [{ $size: '$_khuyenMai' }, 0] }] }, ['MaKM'], []
      ] }] }
    } });
  }
  stages.push({ $project: {
    ...projections.HoaDon,
    ...(detail ? { KhuyenMai: 1, 'ChiTiet.MaSP': 1, 'ChiTiet.TenSP': 1, 'ChiTiet.SoLuong': 1, 'ChiTiet.DonGia': 1, 'ChiTiet.ThanhTien': 1 } : {})
  } });
  return stages;
}

export function purchaseJoins(detail = false) {
  return [
    referenceLookup('NhaCungCap', 'MaNCC', '_nhaCungCap', projections.NhaCungCap),
    referenceLookup('NhanVien', 'MaNV', '_nhanVien', projections.NhanVienLienKet),
    { $set: {
      TenNCC: nameOrFallback('$_nhaCungCap.TenNCC'), TenNV: nameOrFallback('$_nhanVien.HoTen'),
      NhaCungCap: firstOrNull('$_nhaCungCap'), NhanVien: firstOrNull('$_nhanVien'),
      ThamChieuThieu: { $concatArrays: [missingReference('$_nhaCungCap', 'MaNCC'), missingReference('$_nhanVien', 'MaNV')] }
    } },
    { $project: { ...projections.PhieuNhap, ...(detail ? { 'ChiTiet.MaSP': 1, 'ChiTiet.TenSP': 1, 'ChiTiet.SoLuong': 1, 'ChiTiet.DonGiaNhap': 1, 'ChiTiet.ThanhTien': 1 } : {}) } }
  ];
}
