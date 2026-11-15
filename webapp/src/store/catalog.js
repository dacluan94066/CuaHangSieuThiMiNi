import { StoreError } from './errors.js';
import { escapeRegex, pagination } from '../utils/query.js';
import { expiryStatus, promotionStatus, stockStatus } from '../utils/dates.js';

export const publicProductProjection = Object.freeze({ _id: 0, MaSP: 1, TenSP: 1, MaDM: 1, DonGiaBan: 1, SoLuongTon: 1, DonViTinh: 1, HanSuDung: 1, TrangThai: 1, HinhAnh: 1 });
function numeric(value) {
  if (typeof value === 'number') return value;
  if (['Decimal128', 'Long', 'Int32', 'Double'].includes(value?._bsontype)) return Number(value.toString());
  return NaN;
}
export function productDto(source, now = new Date()) {
  const price = numeric(source.DonGiaBan); const stock = numeric(source.SoLuongTon);
  const valid = Number.isSafeInteger(price) && price >= 0 && Number.isSafeInteger(stock) && stock >= 0;
  const expiry = expiryStatus(source.HanSuDung, now);
  const status = typeof source.TrangThai === 'string' ? source.TrangThai : 'Chưa xác định';
  const warnings = [];
  if (!valid) warnings.push('Dữ liệu giá hoặc tồn kho không hợp lệ');
  if (stock === 0) warnings.push('Hết hàng'); else if (stock > 0 && stock < 20) warnings.push('Tồn thấp');
  if (expiry === 'Hết hạn' || expiry === 'Sắp hết hạn' || expiry === 'Chưa xác định') warnings.push(expiry);
  const selling = ['Đang bán', 'Sắp hết hàng', 'Hết hàng'].includes(status);
  if (!selling) warnings.push('Ngừng bán hoặc trạng thái chưa được hỗ trợ');
  return {
    MaSP: source.MaSP, TenSP: source.TenSP, MaDM: source.MaDM,
    TenDM: typeof source.TenDM === 'string' ? source.TenDM : 'Không tìm thấy thông tin liên kết',
    ThamChieuThieu: typeof source.TenDM !== 'string',
    HinhAnh: typeof source.HinhAnh === 'string' ? source.HinhAnh : `/images/products/${source.MaSP}.jpg`,
    DonGiaBan: Number.isSafeInteger(price) && price >= 0 ? price : null,
    SoLuongTon: Number.isSafeInteger(stock) && stock >= 0 ? stock : null,
    DonViTinh: source.DonViTinh, HanSuDung: source.HanSuDung ?? null, TrangThai: status,
    TrangThaiTonKho: stockStatus(stock), TrangThaiHanSuDung: expiry, CanhBao: warnings,
    CoTheMua: valid && stock > 0 && selling && !['Hết hạn', 'Chưa xác định'].includes(expiry)
  };
}
export function publicProductJoin() {
  return [
    { $project: publicProductProjection },
    { $lookup: { from: 'DanhMuc', localField: 'MaDM', foreignField: 'MaDM', pipeline: [{ $project: { _id: 0, TenDM: 1 } }], as: '_DanhMuc' } },
    { $set: { TenDM: { $arrayElemAt: ['$_DanhMuc.TenDM', 0] } } },
    { $project: { ...publicProductProjection, TenDM: 1 } }
  ];
}
export function publicProductFilter(query) {
  return {
    ...(query.q ? { $or: ['MaSP', 'TenSP'].map(field => ({ [field]: { $regex: escapeRegex(query.q), $options: 'i' } })) } : {}),
    ...(query.maDM ? { MaDM: query.maDM } : {}),
    ...(query.giaTu !== undefined || query.giaDen !== undefined ? { DonGiaBan: { ...(query.giaTu !== undefined ? { $gte: query.giaTu } : {}), ...(query.giaDen !== undefined ? { $lte: query.giaDen } : {}) } } : {})
  };
}
export function createCatalog(database) {
  async function read(operation) {
    try { return await operation(await database.read()); }
    catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(503, 'DATABASE_UNAVAILABLE'); }
  }
  async function productsFor(filter, { skip = 0, limit = 50, sort = { MaSP: 1, _id: 1 } } = {}, now = new Date()) {
    return read(async db => (await db.collection('SanPham').aggregate([{ $match: filter }, { $sort: sort }, { $skip: skip }, { $limit: limit }, ...publicProductJoin()], { maxTimeMS: 5000 }).toArray()).map(item => productDto(item, now)));
  }
  return Object.freeze({
    async categories(query) {
      return read(async db => {
        const collection = db.collection('DanhMuc');
        const total = await collection.countDocuments({}, { maxTimeMS: 5000 });
        const data = await collection.find({}, { projection: { _id: 0, MaDM: 1, TenDM: 1, MoTa: 1 }, maxTimeMS: 5000 }).sort({ MaDM: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray();
        return { data, pagination: pagination(query.page, query.limit, total) };
      });
    },
    async list(query) {
      const filter = publicProductFilter(query);
      const total = await read(db => db.collection('SanPham').countDocuments(filter, { maxTimeMS: 5000 }));
      const sort = { ...(query.sort !== 'ma-tang' ? { DonGiaBan: query.sort === 'gia-giam' ? -1 : 1 } : {}), MaSP: 1, _id: 1 };
      return { data: await productsFor(filter, { sort, skip: (query.page - 1) * query.limit, limit: query.limit }), pagination: pagination(query.page, query.limit, total) };
    },
    async detail(maSP) {
      const [product] = await productsFor({ MaSP: maSP }, { limit: 1 });
      if (!product) throw new StoreError(404, 'PRODUCT_NOT_FOUND');
      return product;
    },
    async forCart(codes) { return codes.length ? productsFor({ MaSP: { $in: codes } }, { limit: 50 }) : []; },
    async promotions() {
      const now = new Date(); const filter = { NgayBatDau: { $lte: now }, NgayKetThuc: { $gte: now } };
      return read(async db => {
        const rows = await db.collection('KhuyenMai').find(filter, { maxTimeMS: 5000, projection: { _id: 0, MaKM: 1, TenKM: 1, LoaiKhuyenMai: 1, GiaTri: 1, NgayBatDau: 1, NgayKetThuc: 1, TrangThai: 1, DieuKien: 1 } }).sort({ MaKM: 1 }).limit(100).toArray();
        const data = rows.map(row => {
          const conditions = {};
          for (const key of ['DonHangToiThieu', 'GiamToiDa', 'DiemToiThieu', 'SoLuongToiThieu']) {
            const value = numeric(row.DieuKien?.[key]); if (Number.isSafeInteger(value) && value >= 0) conditions[key] = value;
          }
          if (typeof row.DieuKien?.MaDM === 'string') conditions.MaDM = row.DieuKien.MaDM;
          return { MaKM: row.MaKM, TenKM: row.TenKM, LoaiKhuyenMai: row.LoaiKhuyenMai, GiaTri: numeric(row.GiaTri), NgayBatDau: row.NgayBatDau, NgayKetThuc: row.NgayKetThuc,
            TrangThai: row.TrangThai, TrangThaiTinhToan: promotionStatus(row.NgayBatDau, row.NgayKetThuc, now), DieuKien: conditions,
            CoDieuKienChuaHoTro: Object.keys(row.DieuKien || {}).some(key => !Object.hasOwn(conditions, key)) };
        });
        return { data, meta: { serverTime: now.toISOString(), maximum: 100 } };
      });
    }
  });
}
