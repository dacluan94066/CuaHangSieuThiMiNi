export const projections = Object.freeze({
  DanhMuc: { _id: 0, MaDM: 1, TenDM: 1, MoTa: 1, TrangThai: 1 },
  NhaCungCap: { _id: 0, MaNCC: 1, TenNCC: 1, SDT: 1, Email: 1, DiaChi: 1, TrangThai: 1 },
  KhachHang: { _id: 0, MaKH: 1, HoTen: 1, SDT: 1, Email: 1, DiaChi: 1, DiemTichLuy: 1, NgayDangKy: 1 },
  KhachHangLienKet: { _id: 0, MaKH: 1, HoTen: 1, SDT: 1 },
  NhanVienLienKet: { _id: 0, MaNV: 1, HoTen: 1, ChucVu: 1 },
  KhuyenMaiLienKet: { _id: 0, MaKM: 1, TenKM: 1, LoaiKhuyenMai: 1, GiaTri: 1, NgayBatDau: 1, NgayKetThuc: 1, DieuKien: 1, TrangThai: 1 },
  HoaDon: {
    _id: 0, MaHD: 1, MaKH: 1, MaNV: 1, MaKM: 1, NgayLap: 1, TongTien: 1, GiamGia: 1, ThanhTien: 1, PhuongThucThanhToan: 1,
    TenKH: 1, TenNV: 1, KhachHang: 1, NhanVien: 1, ThamChieuThieu: 1
  },
  PhieuNhap: { _id: 0, MaPN: 1, MaNCC: 1, MaNV: 1, NgayNhap: 1, TongTien: 1, TenNCC: 1, TenNV: 1, NhaCungCap: 1, NhanVien: 1, ThamChieuThieu: 1 },
  SanPham: {
    _id: 0, MaSP: 1, TenSP: 1, MaDM: 1, MaNCC: 1, DonGiaNhap: 1, DonGiaBan: 1,
    SoLuongTon: 1, DonViTinh: 1, HanSuDung: 1, TrangThai: 1, NgayCapNhat: 1,
    TenDM: 1, TenNCC: 1, NhaCungCap: 1, ThamChieuThieu: 1, HinhAnh: 1
  }
});

export function safeJsonReplacer(secret) {
  return function (key, value) {
    if (/matkhau|mongo_uri/i.test(key)) return undefined;
    if (typeof value === 'string') {
      const redacted = secret ? value.split(secret).join('[đã ẩn]') : value;
      return redacted.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[đã ẩn]');
    }
    return value;
  };
}
