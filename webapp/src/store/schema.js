// Shared reviewable contract. Runtime imports this manifest, never the setup scripts.
const str = { bsonType: 'string', minLength: 1, maxLength: 500 };
const code = { bsonType: 'string', minLength: 1, maxLength: 50 };
const date = { bsonType: 'date' };
const integer = { bsonType: ['int', 'long'], minimum: 0 };
const phone = { bsonType: 'string', pattern: '^0[0-9]{9}$' };
const kdf = { bsonType: 'object', additionalProperties: false,
  required: ['algorithm', 'version', 'N', 'r', 'p', 'keylen'], properties: {
    algorithm: { enum: ['scrypt'] }, version: { enum: [1] }, N: { enum: [131072] },
    r: { enum: [8] }, p: { enum: [1] }, keylen: { enum: [64] }
  } };
const hold = { bsonType: 'object', required: ['MaYeuCau', 'SoLuong'], additionalProperties: false,
  properties: { MaYeuCau: code, SoLuong: { bsonType: ['int', 'long'], minimum: 1, maximum: 99 } } };
const address = { bsonType: 'object', additionalProperties: false,
  required: ['HoTenNguoiNhan', 'SDTNguoiNhan', 'DiaChi'],
  properties: { HoTenNguoiNhan: { ...str, maxLength: 100 }, SDTNguoiNhan: phone, DiaChi: str } };
export const storeValidators = {
  TaiKhoanKhachHang: { $jsonSchema: { bsonType: 'object', additionalProperties: false,
    required: ['MaTKKH', 'MaKH', 'SDT', 'MatKhauBam', 'Salt', 'ThamSoBam', 'TrangThai', 'MaYeuCauDangKy', 'NgayTao', 'NgayCapNhat'],
    properties: { _id: { bsonType: 'objectId' }, MaTKKH: code, MaKH: code, SDT: phone,
      MatKhauBam: { bsonType: 'string', pattern: '^[A-Za-z0-9+/]{86}==$' }, Salt: { bsonType: 'string', pattern: '^[A-Za-z0-9+/]{22}==$' },
      ThamSoBam: kdf, TrangThai: { enum: ['DangTao', 'HoatDong'] }, MaYeuCauDangKy: code, NgayTao: date, NgayCapNhat: date }
  } },
  YeuCauCuaHang: { $jsonSchema: { bsonType: 'object', additionalProperties: false,
    required: ['MaYeuCau', 'Loai', 'MaKH', 'TrangThai', 'Buoc', 'NgayTao', 'NgayCapNhat'],
    properties: { _id: { bsonType: 'objectId' }, MaYeuCau: code, Loai: { enum: ['DANG_KY', 'DAT_HANG'] }, MaKH: code, MaTKKH: code,
      TrangThai: { enum: ['DANG_XU_LY', 'HOAN_TAT', 'THAT_BAI', 'CAN_PHUC_HOI'] }, Buoc: code,
      NgayTao: date, NgayCapNhat: date, MaChongGuiTrung: code, MaBaoGia: code, MaHD: code,
      DauVanTay: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' }, Loi: code,
      GiuHang: { bsonType: 'array', items: hold }, Snapshot: { bsonType: 'object' }
    }
  } }
};
export const storeExtensions = {
  SanPham: { $jsonSchema: { bsonType: 'object', properties: { GiuChoOnline: { bsonType: 'array', items: hold } } } },
  KhachHang: { $jsonSchema: { bsonType: 'object', properties: {
    NguonTao: { enum: ['ONLINE'] }, MaYeuCauDangKy: code, DiemDaCongOnline: { bsonType: 'array', uniqueItems: true, items: code }
  } } },
  HoaDon: { $or: [{ NguonDon: { $ne: 'ONLINE' } }, { $jsonSchema: { bsonType: 'object',
    required: ['NguonDon', 'TrangThaiDon', 'DiaChiGiao', 'MaChongGuiTrung', 'MaBaoGia', 'ThanhToanGiaLap', 'TrangThaiThanhToan', 'MaGiaoDichGiaLap', 'DiemDuocCong', 'TrangThaiTichDiem'],
    properties: { NguonDon: { enum: ['ONLINE'] }, TrangThaiDon: { enum: ['Đã xác nhận'] }, DiaChiGiao: address,
      MaChongGuiTrung: code, MaBaoGia: code, ThanhToanGiaLap: { bsonType: 'bool' }, TrangThaiThanhToan: { enum: ['Đã thanh toán giả lập', 'Đã thanh toán', 'Đã thanh toán (SePay)', 'Chờ thanh toán (QR Code)'] },
      MaGiaoDichGiaLap: code, DiemDuocCong: integer, TrangThaiTichDiem: { enum: ['ChoXuLy', 'DaCong'] } }
  } }] }
};
const uq = (collection, field) => ({ collection, key: { [field]: 1 }, options: { name: `uq_${collection}_${field}`, unique: true } });
const requestPartial = field => ({ Loai: 'DAT_HANG', [field]: { $type: 'string' } });
const orderPartial = field => ({ NguonDon: 'ONLINE', [field]: { $type: 'string' } });
export const storeIndexes = [
  ...['MaTKKH', 'MaKH', 'SDT'].map(field => uq('TaiKhoanKhachHang', field)), uq('YeuCauCuaHang', 'MaYeuCau'),
  ...['MaChongGuiTrung', 'MaBaoGia'].flatMap(field => [
    { collection: 'YeuCauCuaHang', key: { MaKH: 1, [field]: 1 }, options: { name: `uq_YeuCauCuaHang_MaKH_${field}`, unique: true, partialFilterExpression: requestPartial(field) } },
    { collection: 'HoaDon', key: { MaKH: 1, [field]: 1 }, options: { name: `uq_HoaDonOnline_MaKH_${field}`, unique: true, partialFilterExpression: orderPartial(field) } }
  ]),
  { collection: 'YeuCauCuaHang', key: { TrangThai: 1, NgayTao: 1 }, options: { name: 'idx_YeuCauCuaHang_PhucHoi' } }
];
export const baseCollections = ['DanhMuc', 'NhaCungCap', 'SanPham', 'KhachHang', 'NhanVien', 'TaiKhoan', 'KhuyenMai', 'HoaDon', 'PhieuNhap'];
export const baseUniqueIndexes = [uq('KhachHang', 'MaKH'), uq('KhachHang', 'SDT'), uq('HoaDon', 'MaHD'), uq('NhanVien', 'MaNV')];
export const onlineEmployee = Object.freeze({ MaNV: 'NV_ONLINE', HoTen: 'Bán hàng online', ChucVu: 'Nhân viên hệ thống', Luong: 0, TrangThai: 'Đang làm' });
export function canonical(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(item => JSON.parse(canonical(item))));
  if (value && typeof value === 'object') return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])));
  return JSON.stringify(value);
}
export function indexMatches(actual, expected) {
  return Boolean(actual && JSON.stringify(actual.key) === JSON.stringify(expected.key)
    && Boolean(actual.unique) === Boolean(expected.options.unique)
    && canonical(actual.partialFilterExpression || {}) === canonical(expected.options.partialFilterExpression || {})
    && !actual.sparse && !actual.hidden && actual.expireAfterSeconds === undefined && !actual.collation);
}
export function extensionPresent(validator, extension) {
  return Array.isArray(validator?.$and) && validator.$and.some(part => canonical(part) === canonical(extension))
    && validator.$and.some(part => canonical(part) !== canonical(extension) && part && Object.keys(part).length);
}
