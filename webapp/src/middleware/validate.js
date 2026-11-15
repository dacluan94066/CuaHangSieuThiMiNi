import { parseCalendarDate } from '../utils/dates.js';
import { queryError } from '../utils/query.js';

const integer = (fallback, max) => (value, name) => {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw queryError(`${name} phải là số nguyên từ 1 đến ${max}.`, name);
  return Number(value);
};
const day = (value, name) => {
  if (value === undefined) return undefined;
  try { parseCalendarDate(value); } catch { throw queryError(`${name} phải là ngày hợp lệ dạng yyyy-MM-dd.`, name); }
  return value;
};

export function codeValue(value, name = 'maSP') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(value)) throw queryError(`${name} phải có 1–50 ký tự chữ, số, gạch ngang hoặc gạch dưới.`, name);
  return value;
}
const optionalCode = (value, name) => value === undefined ? undefined : codeValue(value, name);
const choice = (values, fallback) => (value, name) => {
  if (value === undefined) return fallback;
  if (!values.includes(value)) throw queryError(`${name} không nằm trong danh sách lựa chọn được hỗ trợ.`, name);
  return value;
};
const price = (value, name) => {
  if (value === undefined) return undefined;
  if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw queryError(`${name} phải là số hữu hạn không âm ở dạng thập phân.`, name);
  return Number(value);
};
const payment = (value, name) => {
  if (value === undefined) return undefined;
  if (!value.trim() || value.length > 50 || /[\u0000-\u001f]/.test(value)) throw queryError(`${name} phải là chuỗi 1–50 ký tự hợp lệ.`, name);
  return value.trim();
};

export const schemas = Object.freeze({
  pagination: { page: integer(1, 10000), limit: integer(20, 100) },
  search: {
    q(value) {
      if (value === undefined) return '';
      const result = value.trim().replace(/\s+/g, ' ');
      if (value.length > 100 || /[\u0000-\u001f]/.test(value)) throw queryError('Từ khóa tối đa 100 ký tự, không chứa ký tự điều khiển.', 'q');
      return result;
    }
  },
  dates: { from: day, to: day },
  products: {
    maDM: optionalCode, maNCC: optionalCode, giaTu: price, giaDen: price,
    tonKho: choice(['con-hang', 'ton-thap', 'het-hang']),
    sort: choice(['ma-tang', 'gia-tang', 'gia-giam', 'ton-tang', 'ton-giam'], 'ma-tang')
  },
  inventory: { loai: choice(['tat-ca', 'het-hang', 'ton-thap', 'het-han', 'sap-het-han'], 'tat-ca') },
  invoices: { maKH: optionalCode, maNV: optionalCode, thanhToan: payment, thucThuTren: price },
  purchases: { maNCC: optionalCode, maNV: optionalCode },
  promotions: { trangThai: choice(['sap-dien-ra', 'dang-ap-dung', 'da-ket-thuc']) },
  revenueReport: { nhom: choice(['ngay', 'thang'], 'thang') },
  productReport: { maDM: optionalCode, sapXep: choice(['so-luong', 'tien-hang'], 'so-luong') },
  customerReport: { sapXep: choice(['chi-tieu', 'so-lan-mua'], 'chi-tieu') },
  integrity: { loai: choice(['tat-ca', 'tong-tien', 'khuyen-mai', 'tham-chieu'], 'tat-ca'), collection: choice(['SanPham', 'HoaDon', 'PhieuNhap', 'TaiKhoan', 'KhuyenMai']) }
});

export function parseQuery(searchParams, schema) {
  const seen = new Set();
  for (const [key] of searchParams) {
    if (!Object.hasOwn(schema, key) || seen.has(key)) throw queryError('Có tham số không được hỗ trợ hoặc bị lặp.');
    seen.add(key);
  }
  const query = Object.create(null);
  for (const [key, parser] of Object.entries(schema)) query[key] = parser(searchParams.has(key) ? searchParams.get(key) : undefined, key);
  if (query.from && query.to && query.from > query.to) throw queryError('Từ ngày phải nhỏ hơn hoặc bằng đến ngày.', 'to');
  if (query.giaTu !== undefined && query.giaDen !== undefined && query.giaTu > query.giaDen) throw queryError('Giá từ phải nhỏ hơn hoặc bằng giá đến.', 'giaDen');
  if (['tong-tien', 'khuyen-mai'].includes(query.loai) && query.collection && query.collection !== 'HoaDon') throw queryError('Loại kiểm tra này chỉ áp dụng collection HoaDon.', 'collection');
  return query;
}

export function validate(schema = {}) {
  return (req, res, next) => {
    try {
      const params = new URL(req.originalUrl, 'http://request.local').searchParams;
      res.locals.query = parseQuery(params, schema);
      next();
    } catch (error) { next(error); }
  };
}
