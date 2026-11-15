// ================================================================
// 07_indexes.js - Index phục vụ tìm kiếm và sắp xếp thường dùng
// createIndex có thể chạy lại; MongoDB không tạo trùng nếu đặc tả/tên giống nhau.
// ================================================================
db = db.getSiblingDB("QLSieuThiMini");

// Mã sản phẩm là duy nhất, tăng tốc tìm sản phẩm theo mã và kiểm soát trùng mã.
db.SanPham.createIndex({ MaSP: 1 }, { name: "uq_SanPham_MaSP", unique: true });

// Text index hỗ trợ tìm kiếm toàn văn theo tên sản phẩm.
db.SanPham.createIndex({ TenSP: "text" }, { name: "idx_SanPham_TenSP_text", default_language: "none" });

// Số điện thoại khách hàng là duy nhất, dùng khi tra cứu/tích điểm.
db.KhachHang.createIndex({ SDT: 1 }, { name: "uq_KhachHang_SDT", unique: true });

// Mã hóa đơn là duy nhất, tăng tốc tra cứu một hóa đơn.
db.HoaDon.createIndex({ MaHD: 1 }, { name: "uq_HoaDon_MaHD", unique: true });

// Index giảm dần theo ngày giúp lọc khoảng thời gian và xem hóa đơn mới nhất.
db.HoaDon.createIndex({ NgayLap: -1 }, { name: "idx_HoaDon_NgayLap" });

// Mã nhân viên là duy nhất, hỗ trợ join bằng $lookup và tìm hồ sơ nhân viên.
db.NhanVien.createIndex({ MaNV: 1 }, { name: "uq_NhanVien_MaNV", unique: true });

// Các index bổ sung hợp lý cho quan hệ tham chiếu và báo cáo.
db.DanhMuc.createIndex({ MaDM: 1 }, { name: "uq_DanhMuc_MaDM", unique: true });
db.NhaCungCap.createIndex({ MaNCC: 1 }, { name: "uq_NhaCungCap_MaNCC", unique: true });
db.KhachHang.createIndex({ MaKH: 1 }, { name: "uq_KhachHang_MaKH", unique: true });
db.KhuyenMai.createIndex({ MaKM: 1 }, { name: "uq_KhuyenMai_MaKM", unique: true });
db.PhieuNhap.createIndex({ MaPN: 1 }, { name: "uq_PhieuNhap_MaPN", unique: true });
db.TaiKhoan.createIndex({ TenDangNhap: 1 }, { name: "uq_TaiKhoan_TenDangNhap", unique: true });
db.HoaDon.createIndex({ MaKH: 1, NgayLap: -1 }, { name: "idx_HoaDon_MaKH_NgayLap" });

print("Danh sách index đã tạo:");
["SanPham", "KhachHang", "HoaDon", "NhanVien"].forEach(function (ten) {
    print("\n" + ten);
    printjson(db.getCollection(ten).getIndexes());
});
