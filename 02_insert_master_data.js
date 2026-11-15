// ================================================================
// 02_insert_master_data.js
// Dữ liệu danh mục dùng chung (master data) cho siêu thị mini.
// Chạy sau 01_create_database.js.
// ================================================================

db = db.getSiblingDB("QLSieuThiMini");

// Chỉ thay thế các mã mẫu có trong file, không xóa dữ liệu ngoài phạm vi demo.
function chenLaiTheoMa(tenCollection, tenTruongMa, danhSach) {
    var cacMa = danhSach.map(function (x) { return x[tenTruongMa]; });
    db.getCollection(tenCollection).deleteMany((function () {
        var dieuKien = {};
        dieuKien[tenTruongMa] = { $in: cacMa };
        return dieuKien;
    })());
    db.getCollection(tenCollection).insertMany(danhSach);
    print(tenCollection + ": " + danhSach.length + " document");
}

var danhMuc = [
    { MaDM: "DM01", TenDM: "Đồ uống", MoTa: "Nước ngọt, nước suối và đồ uống đóng chai", TrangThai: "Đang kinh doanh" },
    { MaDM: "DM02", TenDM: "Thực phẩm tiện lợi", MoTa: "Mì gói, xúc xích và đồ ăn nhanh", TrangThai: "Đang kinh doanh" },
    { MaDM: "DM03", TenDM: "Bánh kẹo", MoTa: "Bánh quy, bánh ngọt và kẹo", TrangThai: "Đang kinh doanh" },
    { MaDM: "DM04", TenDM: "Sữa và sản phẩm từ sữa", MoTa: "Sữa tươi và sữa đặc", TrangThai: "Đang kinh doanh" },
    { MaDM: "DM05", TenDM: "Gia vị", MoTa: "Nước mắm, dầu ăn và bột ngọt", TrangThai: "Đang kinh doanh" },
    { MaDM: "DM06", TenDM: "Chăm sóc cá nhân", MoTa: "Kem đánh răng, xà phòng, dầu gội và khăn giấy", TrangThai: "Đang kinh doanh" }
];

var nhaCungCap = [
    { MaNCC: "NCC01", TenNCC: "Công ty Suntory PepsiCo Việt Nam", SDT: "02838219435", Email: "donhang@pepsico.vn", DiaChi: "Quận 1, TP. Hồ Chí Minh", TrangThai: "Đang hợp tác" },
    { MaNCC: "NCC02", TenNCC: "Công ty Coca-Cola Việt Nam", SDT: "02838961000", Email: "sales@coca-cola.vn", DiaChi: "Thủ Đức, TP. Hồ Chí Minh", TrangThai: "Đang hợp tác" },
    { MaNCC: "NCC03", TenNCC: "Công ty Acecook Việt Nam", SDT: "02838154064", Email: "kinhdoanh@acecookvietnam.com", DiaChi: "Tân Phú, TP. Hồ Chí Minh", TrangThai: "Đang hợp tác" },
    { MaNCC: "NCC04", TenNCC: "Công ty Cổ phần Sữa Việt Nam", SDT: "02854155555", Email: "vinamilk@vinamilk.com.vn", DiaChi: "Quận 7, TP. Hồ Chí Minh", TrangThai: "Đang hợp tác" },
    { MaNCC: "NCC05", TenNCC: "Công ty TNHH Quốc tế Unilever Việt Nam", SDT: "02854135686", Email: "contact@unilever.com", DiaChi: "Quận 7, TP. Hồ Chí Minh", TrangThai: "Đang hợp tác" },
    { MaNCC: "NCC06", TenNCC: "Nhà phân phối Bách Hóa Việt", SDT: "0909123456", Email: "bachhoaviet@gmail.com", DiaChi: "Ninh Kiều, Cần Thơ", TrangThai: "Đang hợp tác" }
];

// HanSuDung là dữ liệu minh họa theo lô hàng hiện tại.
var sanPham = [
    { MaSP: "SP001", TenSP: "Nước ngọt Coca-Cola 330ml", MaDM: "DM01", MaNCC: "NCC02", DonGiaNhap: 7000, DonGiaBan: 10000, SoLuongTon: 120, DonViTinh: "Lon", HanSuDung: ISODate("2027-06-30T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP002", TenSP: "Nước ngọt Pepsi 330ml", MaDM: "DM01", MaNCC: "NCC01", DonGiaNhap: 6800, DonGiaBan: 10000, SoLuongTon: 95, DonViTinh: "Lon", HanSuDung: ISODate("2027-07-15T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP003", TenSP: "Nước tinh khiết Aquafina 500ml", MaDM: "DM01", MaNCC: "NCC01", DonGiaNhap: 3500, DonGiaBan: 6000, SoLuongTon: 150, DonViTinh: "Chai", HanSuDung: ISODate("2028-01-31T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP004", TenSP: "Nước khoáng La Vie 500ml", MaDM: "DM01", MaNCC: "NCC06", DonGiaNhap: 3000, DonGiaBan: 5000, SoLuongTon: 80, DonViTinh: "Chai", HanSuDung: ISODate("2028-02-28T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP005", TenSP: "Mì Hảo Hảo tôm chua cay", MaDM: "DM02", MaNCC: "NCC03", DonGiaNhap: 3200, DonGiaBan: 4500, SoLuongTon: 200, DonViTinh: "Gói", HanSuDung: ISODate("2027-03-20T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP006", TenSP: "Mì Omachi sườn hầm ngũ quả", MaDM: "DM02", MaNCC: "NCC06", DonGiaNhap: 6000, DonGiaBan: 8000, SoLuongTon: 110, DonViTinh: "Gói", HanSuDung: ISODate("2027-04-10T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP007", TenSP: "Xúc xích tiệt trùng 35g", MaDM: "DM02", MaNCC: "NCC06", DonGiaNhap: 8500, DonGiaBan: 12000, SoLuongTon: 45, DonViTinh: "Gói", HanSuDung: ISODate("2027-01-05T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP008", TenSP: "Bánh quy Oreo vani 133g", MaDM: "DM03", MaNCC: "NCC06", DonGiaNhap: 11000, DonGiaBan: 15000, SoLuongTon: 60, DonViTinh: "Gói", HanSuDung: ISODate("2027-05-18T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP009", TenSP: "Bánh ChocoPie hộp 12 cái", MaDM: "DM03", MaNCC: "NCC06", DonGiaNhap: 39000, DonGiaBan: 50000, SoLuongTon: 32, DonViTinh: "Hộp", HanSuDung: ISODate("2027-06-22T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP010", TenSP: "Bánh quy Cosy Marie 240g", MaDM: "DM03", MaNCC: "NCC06", DonGiaNhap: 19000, DonGiaBan: 25000, SoLuongTon: 18, DonViTinh: "Gói", HanSuDung: ISODate("2027-05-30T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP011", TenSP: "Sữa tươi Vinamilk có đường 180ml", MaDM: "DM04", MaNCC: "NCC04", DonGiaNhap: 6000, DonGiaBan: 8000, SoLuongTon: 140, DonViTinh: "Hộp", HanSuDung: ISODate("2027-01-15T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP012", TenSP: "Sữa tươi TH true MILK 180ml", MaDM: "DM04", MaNCC: "NCC06", DonGiaNhap: 6800, DonGiaBan: 9000, SoLuongTon: 100, DonViTinh: "Hộp", HanSuDung: ISODate("2027-01-20T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP013", TenSP: "Sữa đặc Ông Thọ 380g", MaDM: "DM04", MaNCC: "NCC04", DonGiaNhap: 22000, DonGiaBan: 28000, SoLuongTon: 36, DonViTinh: "Lon", HanSuDung: ISODate("2027-12-31T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP014", TenSP: "Nước mắm Nam Ngư 750ml", MaDM: "DM05", MaNCC: "NCC06", DonGiaNhap: 30000, DonGiaBan: 38000, SoLuongTon: 40, DonViTinh: "Chai", HanSuDung: ISODate("2028-03-15T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP015", TenSP: "Dầu ăn Tường An 1 lít", MaDM: "DM05", MaNCC: "NCC06", DonGiaNhap: 45000, DonGiaBan: 55000, SoLuongTon: 28, DonViTinh: "Chai", HanSuDung: ISODate("2027-10-12T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP016", TenSP: "Bột ngọt Ajinomoto 454g", MaDM: "DM05", MaNCC: "NCC06", DonGiaNhap: 17500, DonGiaBan: 22000, SoLuongTon: 52, DonViTinh: "Gói", HanSuDung: ISODate("2029-01-01T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP017", TenSP: "Kem đánh răng P/S 180g", MaDM: "DM06", MaNCC: "NCC05", DonGiaNhap: 27000, DonGiaBan: 35000, SoLuongTon: 24, DonViTinh: "Tuýp", HanSuDung: ISODate("2029-06-30T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP018", TenSP: "Xà phòng Lifebuoy 90g", MaDM: "DM06", MaNCC: "NCC05", DonGiaNhap: 11000, DonGiaBan: 16000, SoLuongTon: 15, DonViTinh: "Bánh", HanSuDung: ISODate("2029-03-31T00:00:00Z"), TrangThai: "Đang bán" },
    { MaSP: "SP019", TenSP: "Dầu gội Clear 630g", MaDM: "DM06", MaNCC: "NCC05", DonGiaNhap: 62000, DonGiaBan: 78000, SoLuongTon: 8, DonViTinh: "Chai", HanSuDung: ISODate("2029-04-30T00:00:00Z"), TrangThai: "Sắp hết hàng" },
    { MaSP: "SP020", TenSP: "Khăn giấy bỏ túi Bless You", MaDM: "DM06", MaNCC: "NCC06", DonGiaNhap: 24000, DonGiaBan: 32000, SoLuongTon: 0, DonViTinh: "Lốc", HanSuDung: ISODate("2030-12-31T00:00:00Z"), TrangThai: "Hết hàng" }
];

var khachHang = [
    { MaKH: "KH001", HoTen: "Nguyễn Minh Anh", SDT: "0901000001", Email: "minhanh@gmail.com", DiaChi: "Ninh Kiều, Cần Thơ", DiemTichLuy: 120, NgayDangKy: ISODate("2025-01-05T00:00:00Z") },
    { MaKH: "KH002", HoTen: "Trần Quốc Bảo", SDT: "0901000002", Email: "quocbao@gmail.com", DiaChi: "Bình Thủy, Cần Thơ", DiemTichLuy: 85, NgayDangKy: ISODate("2025-02-12T00:00:00Z") },
    { MaKH: "KH003", HoTen: "Lê Thu Hà", SDT: "0901000003", Email: "thuha@gmail.com", DiaChi: "Cái Răng, Cần Thơ", DiemTichLuy: 210, NgayDangKy: ISODate("2025-03-20T00:00:00Z") },
    { MaKH: "KH004", HoTen: "Phạm Gia Huy", SDT: "0901000004", Email: "giahuy@gmail.com", DiaChi: "Ô Môn, Cần Thơ", DiemTichLuy: 45, NgayDangKy: ISODate("2025-04-08T00:00:00Z") },
    { MaKH: "KH005", HoTen: "Võ Ngọc Lan", SDT: "0901000005", Email: "ngoclan@gmail.com", DiaChi: "Ninh Kiều, Cần Thơ", DiemTichLuy: 175, NgayDangKy: ISODate("2025-05-17T00:00:00Z") },
    { MaKH: "KH006", HoTen: "Đặng Hoàng Nam", SDT: "0901000006", Email: "hoangnam@gmail.com", DiaChi: "Phong Điền, Cần Thơ", DiemTichLuy: 60, NgayDangKy: ISODate("2025-06-25T00:00:00Z") },
    { MaKH: "KH007", HoTen: "Bùi Thanh Thảo", SDT: "0901000007", Email: "thanhthao@gmail.com", DiaChi: "Thốt Nốt, Cần Thơ", DiemTichLuy: 95, NgayDangKy: ISODate("2025-07-04T00:00:00Z") },
    { MaKH: "KH008", HoTen: "Đỗ Anh Tuấn", SDT: "0901000008", Email: "anhtuan@gmail.com", DiaChi: "Cờ Đỏ, Cần Thơ", DiemTichLuy: 30, NgayDangKy: ISODate("2025-08-19T00:00:00Z") },
    { MaKH: "KH009", HoTen: "Huỳnh Mỹ Linh", SDT: "0901000009", Email: "mylinh@gmail.com", DiaChi: "Vĩnh Thạnh, Cần Thơ", DiemTichLuy: 140, NgayDangKy: ISODate("2025-09-10T00:00:00Z") },
    { MaKH: "KH010", HoTen: "Ngô Thành Đạt", SDT: "0901000010", Email: "thanhdat@gmail.com", DiaChi: "Ninh Kiều, Cần Thơ", DiemTichLuy: 70, NgayDangKy: ISODate("2025-10-01T00:00:00Z") }
];

var nhanVien = [
    { MaNV: "NV001", HoTen: "Trần Văn Hải", SDT: "0912000001", Email: "hai@minimart.vn", ChucVu: "Quản lý", Luong: 15000000, NgayVaoLam: ISODate("2023-01-10T00:00:00Z"), TrangThai: "Đang làm" },
    { MaNV: "NV002", HoTen: "Nguyễn Thị Mai", SDT: "0912000002", Email: "mai@minimart.vn", ChucVu: "Thu ngân", Luong: 7500000, NgayVaoLam: ISODate("2023-06-15T00:00:00Z"), TrangThai: "Đang làm" },
    { MaNV: "NV003", HoTen: "Lê Hoàng Phúc", SDT: "0912000003", Email: "phuc@minimart.vn", ChucVu: "Thu ngân", Luong: 7500000, NgayVaoLam: ISODate("2024-02-01T00:00:00Z"), TrangThai: "Đang làm" },
    { MaNV: "NV004", HoTen: "Phạm Ngọc Trâm", SDT: "0912000004", Email: "tram@minimart.vn", ChucVu: "Nhân viên kho", Luong: 8000000, NgayVaoLam: ISODate("2024-03-20T00:00:00Z"), TrangThai: "Đang làm" },
    { MaNV: "NV005", HoTen: "Võ Minh Khang", SDT: "0912000005", Email: "khang@minimart.vn", ChucVu: "Nhân viên bán hàng", Luong: 7000000, NgayVaoLam: ISODate("2024-08-12T00:00:00Z"), TrangThai: "Đang làm" },
    { MaNV: "NV006", HoTen: "Đặng Thùy Dương", SDT: "0912000006", Email: "duong@minimart.vn", ChucVu: "Nhân viên bán hàng", Luong: 7000000, NgayVaoLam: ISODate("2025-01-06T00:00:00Z"), TrangThai: "Đang làm" }
];

// Mật khẩu chỉ dùng minh họa theo yêu cầu đề tài, không dùng cho hệ thống thật.
var taiKhoan = [
    { TenDangNhap: "admin", MatKhau: "admin123", VaiTro: "Quản trị", MaNV: "NV001", TrangThai: "Hoạt động" },
    { TenDangNhap: "thungan_mai", MatKhau: "mai123", VaiTro: "Thu ngân", MaNV: "NV002", TrangThai: "Hoạt động" },
    { TenDangNhap: "thungan_phuc", MatKhau: "phuc123", VaiTro: "Thu ngân", MaNV: "NV003", TrangThai: "Hoạt động" },
    { TenDangNhap: "kho_tram", MatKhau: "tram123", VaiTro: "Kho", MaNV: "NV004", TrangThai: "Hoạt động" },
    { TenDangNhap: "banhang_khang", MatKhau: "khang123", VaiTro: "Bán hàng", MaNV: "NV005", TrangThai: "Hoạt động" },
    { TenDangNhap: "banhang_duong", MatKhau: "duong123", VaiTro: "Bán hàng", MaNV: "NV006", TrangThai: "Hoạt động" }
];

// DieuKien là embedded document: linh hoạt theo từng loại khuyến mãi.
var khuyenMai = [
    { MaKM: "KM001", TenKM: "Giảm 10% hóa đơn từ 200.000", LoaiKhuyenMai: "Phần trăm", GiaTri: 10, NgayBatDau: ISODate("2026-09-01T00:00:00Z"), NgayKetThuc: ISODate("2026-09-30T23:59:59Z"), DieuKien: { DonHangToiThieu: 200000, GiamToiDa: 50000 }, TrangThai: "Đang áp dụng" },
    { MaKM: "KM002", TenKM: "Giảm 20.000 cho hóa đơn từ 300.000", LoaiKhuyenMai: "Số tiền", GiaTri: 20000, NgayBatDau: ISODate("2026-09-10T00:00:00Z"), NgayKetThuc: ISODate("2026-10-10T23:59:59Z"), DieuKien: { DonHangToiThieu: 300000 }, TrangThai: "Đang áp dụng" },
    { MaKM: "KM003", TenKM: "Ưu đãi thành viên 5%", LoaiKhuyenMai: "Phần trăm", GiaTri: 5, NgayBatDau: ISODate("2026-01-01T00:00:00Z"), NgayKetThuc: ISODate("2026-12-31T23:59:59Z"), DieuKien: { DiemToiThieu: 100, GiamToiDa: 30000 }, TrangThai: "Đang áp dụng" },
    { MaKM: "KM004", TenKM: "Giảm 15% nhóm đồ uống", LoaiKhuyenMai: "Phần trăm", GiaTri: 15, NgayBatDau: ISODate("2026-10-01T00:00:00Z"), NgayKetThuc: ISODate("2026-10-15T23:59:59Z"), DieuKien: { MaDM: "DM01", SoLuongToiThieu: 3 }, TrangThai: "Sắp diễn ra" },
    { MaKM: "KM005", TenKM: "Đồng giá vận may cuối tuần", LoaiKhuyenMai: "Số tiền", GiaTri: 10000, NgayBatDau: ISODate("2026-08-01T00:00:00Z"), NgayKetThuc: ISODate("2026-08-31T23:59:59Z"), DieuKien: { DonHangToiThieu: 150000 }, TrangThai: "Đã kết thúc" }
];

chenLaiTheoMa("DanhMuc", "MaDM", danhMuc);
chenLaiTheoMa("NhaCungCap", "MaNCC", nhaCungCap);
chenLaiTheoMa("SanPham", "MaSP", sanPham);
chenLaiTheoMa("KhachHang", "MaKH", khachHang);
chenLaiTheoMa("NhanVien", "MaNV", nhanVien);
chenLaiTheoMa("TaiKhoan", "TenDangNhap", taiKhoan);
chenLaiTheoMa("KhuyenMai", "MaKM", khuyenMai);

print("Hoàn tất dữ liệu danh mục dùng chung.");
