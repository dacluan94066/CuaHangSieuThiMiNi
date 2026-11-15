import { StoreError } from './errors.js';
import { orderDto } from './checkout-rules.js';
import { pagination } from '../utils/query.js';

// Inclusion projection prevents accidental exposure of any future journal/marker fields.
export const orderProjection = Object.freeze({ _id: 0, MaHD: 1, NgayLap: 1, TrangThaiDon: 1,
  'ChiTiet.MaSP': 1, 'ChiTiet.TenSP': 1, 'ChiTiet.SoLuong': 1, 'ChiTiet.DonGia': 1, 'ChiTiet.ThanhTien': 1,
  TongTien: 1, GiamGia: 1, ThanhTien: 1, MaKM: 1, PhuongThucThanhToan: 1,
  'DiaChiGiao.HoTenNguoiNhan': 1, 'DiaChiGiao.SDTNguoiNhan': 1, 'DiaChiGiao.DiaChi': 1,
  ThanhToanGiaLap: 1, TrangThaiThanhToan: 1, DiemDuocCong: 1, TrangThaiTichDiem: 1 });
export const orderSort = Object.freeze({ NgayLap: -1, MaHD: 1 });
export const ownerFilter = maKH => ({ MaKH: maKH, NguonDon: 'ONLINE' });
export function createOrders(database) {
  async function read(operation) {
    try { return await operation(await database.read()); }
    catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(503, 'DATABASE_UNAVAILABLE'); }
  }
  return Object.freeze({
    list(maKH, query) {
      return read(async db => {
        const collection = db.collection('HoaDon'); const filter = ownerFilter(maKH);
        const total = await collection.countDocuments(filter, { maxTimeMS: 5000 });
        const rows = await collection.find(filter, { projection: orderProjection, maxTimeMS: 5000 }).sort(orderSort).skip((query.page - 1) * query.limit).limit(query.limit).toArray();
        return { data: rows.map(orderDto), pagination: pagination(query.page, query.limit, total) };
      });
    },
    detail(maKH, maHD) {
      return read(async db => {
        const order = await db.collection('HoaDon').findOne({ ...ownerFilter(maKH), MaHD: maHD }, { projection: orderProjection, maxTimeMS: 5000 });
        if (!order) throw new StoreError(404, 'ORDER_NOT_FOUND');
        return { data: orderDto(order) };
      });
    }
  });
}
