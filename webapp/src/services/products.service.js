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

export async function createProduct(db, body) {
  const collection = await db.collection('SanPham');
  const maSP = (body.MaSP || '').trim().toUpperCase();
  if (!maSP || !/^[A-Za-z0-9_-]{1,50}$/.test(maSP)) {
    throw new Error('Mã sản phẩm không hợp lệ (1-50 ký tự, không chứa ký tự đặc biệt).');
  }

  const existing = await collection.findOne({ MaSP: maSP });
  if (existing) {
    throw new Error(`Mã sản phẩm ${maSP} đã tồn tại trong hệ thống.`);
  }

  const tenSP = (body.TenSP || '').trim();
  if (!tenSP) throw new Error('Tên sản phẩm không được để trống.');

  const maDM = (body.MaDM || '').trim();
  const dmColl = await db.collection('DanhMuc');
  const dm = await dmColl.findOne({ MaDM: maDM });
  if (!dm) throw new Error(`Mã danh mục ${maDM} không tồn tại.`);

  const maNCC = (body.MaNCC || '').trim();
  const nccColl = await db.collection('NhaCungCap');
  const ncc = await nccColl.findOne({ MaNCC: maNCC });
  if (!ncc) throw new Error(`Mã nhà cung cấp ${maNCC} không tồn tại.`);

  const donGiaNhap = Math.max(0, Number(body.DonGiaNhap) || 0);
  const donGiaBan = Math.max(0, Number(body.DonGiaBan) || 0);
  const soLuongTon = Math.max(0, Math.floor(Number(body.SoLuongTon) || 0));
  const donViTinh = (body.DonViTinh || 'Cái').trim();
  const trangThai = body.TrangThai || 'Đang bán';

  let hanSuDung = null;
  if (body.HanSuDung) {
    const d = new Date(body.HanSuDung);
    if (!isNaN(d.getTime())) hanSuDung = d;
  }

  const hinhAnh = body.HinhAnh?.trim() || `/images/products/${maSP}.jpg`;

  const newProduct = {
    MaSP: maSP,
    TenSP: tenSP,
    MaDM: maDM,
    MaNCC: maNCC,
    DonGiaNhap: donGiaNhap,
    DonGiaBan: donGiaBan,
    SoLuongTon: soLuongTon,
    DonViTinh: donViTinh,
    TrangThai: trangThai,
    HinhAnh: hinhAnh,
    MoTa: (body.MoTa || '').trim(),
    NgayCapNhat: new Date()
  };

  if (hanSuDung) newProduct.HanSuDung = hanSuDung;

  await collection.insertOne(newProduct);
  return productDetail(db, maSP);
}

export async function updateProduct(db, maSP, body) {
  const collection = await db.collection('SanPham');
  const existing = await collection.findOne({ MaSP: maSP });
  if (!existing) throw new Error(`Không tìm thấy sản phẩm ${maSP}.`);

  const update = { NgayCapNhat: new Date() };

  if (body.TenSP !== undefined) {
    const ten = (body.TenSP || '').trim();
    if (!ten) throw new Error('Tên sản phẩm không được để trống.');
    update.TenSP = ten;
  }
  if (body.MaDM !== undefined) {
    const dmColl = await db.collection('DanhMuc');
    const dm = await dmColl.findOne({ MaDM: body.MaDM });
    if (!dm) throw new Error(`Danh mục ${body.MaDM} không tồn tại.`);
    update.MaDM = body.MaDM;
  }
  if (body.MaNCC !== undefined) {
    const nccColl = await db.collection('NhaCungCap');
    const ncc = await nccColl.findOne({ MaNCC: body.MaNCC });
    if (!ncc) throw new Error(`Nhà cung cấp ${body.MaNCC} không tồn tại.`);
    update.MaNCC = body.MaNCC;
  }
  if (body.DonGiaNhap !== undefined) update.DonGiaNhap = Math.max(0, Number(body.DonGiaNhap) || 0);
  if (body.DonGiaBan !== undefined) update.DonGiaBan = Math.max(0, Number(body.DonGiaBan) || 0);
  if (body.SoLuongTon !== undefined) update.SoLuongTon = Math.max(0, Math.floor(Number(body.SoLuongTon) || 0));
  if (body.DonViTinh !== undefined) update.DonViTinh = (body.DonViTinh || 'Cái').trim();
  if (body.TrangThai !== undefined) update.TrangThai = body.TrangThai;
  if (body.HinhAnh !== undefined) update.HinhAnh = body.HinhAnh.trim();
  if (body.MoTa !== undefined) update.MoTa = body.MoTa.trim();
  if (body.HanSuDung !== undefined) {
    if (!body.HanSuDung) {
      // If unset
    } else {
      const d = new Date(body.HanSuDung);
      if (!isNaN(d.getTime())) update.HanSuDung = d;
    }
  }

  await collection.updateOne({ MaSP: maSP }, { $set: update });
  return productDetail(db, maSP);
}

export async function deleteProduct(db, maSP) {
  const collection = await db.collection('SanPham');
  const existing = await collection.findOne({ MaSP: maSP });
  if (!existing) throw new Error(`Không tìm thấy sản phẩm ${maSP}.`);

  const hoadonColl = await db.collection('HoaDon');
  const phieunhapColl = await db.collection('PhieuNhap');
  const inOrders = await hoadonColl.countDocuments({ 'ChiTiet.MaSP': maSP }, { limit: 1 });
  const inPurchases = await phieunhapColl.countDocuments({ 'ChiTiet.MaSP': maSP }, { limit: 1 });

  if (inOrders > 0 || inPurchases > 0) {
    // Soft delete to maintain referential integrity
    await collection.updateOne({ MaSP: maSP }, { $set: { TrangThai: 'Ngưng kinh doanh', NgayCapNhat: new Date() } });
    return {
      deleted: false,
      softDeleted: true,
      status: 'Ngưng kinh doanh',
      message: `Sản phẩm ${maSP} đã có lịch sử giao dịch nên hệ thống chuyển trạng thái sang "Ngưng kinh doanh" để bảo đảm toàn vẹn dữ liệu.`
    };
  }

  await collection.deleteOne({ MaSP: maSP });
  return { deleted: true, message: `Đã xóa sản phẩm ${maSP} thành công.` };
}
