// ================================================================
// 04_basic_queries.js - 20 truy vấn CRUD cơ bản để demo IntelliShell
// ================================================================
db = db.getSiblingDB("QLSieuThiMini");

// 1. Xem toàn bộ sản phẩm, ẩn _id cho dễ đọc.
print("\n1. Toàn bộ sản phẩm");
db.SanPham.find({}, { _id: 0 }).sort({ MaSP: 1 });

// 2. Tìm chính xác sản phẩm theo mã.
print("\n2. Sản phẩm có mã SP005");
db.SanPham.findOne({ MaSP: "SP005" }, { _id: 0 });

// 3. Tìm sản phẩm theo đúng tên.
print("\n3. Tìm theo đúng tên sản phẩm");
db.SanPham.find({ TenSP: "Nước ngọt Coca-Cola 330ml" }, { _id: 0 });

// 4. Tìm tên sản phẩm chứa từ khóa "sữa", không phân biệt hoa thường.
print("\n4. Tên sản phẩm chứa từ khóa sữa");
db.SanPham.find({ TenSP: { $regex: "sữa", $options: "i" } }, { _id: 0, MaSP: 1, TenSP: 1 });

// 5. Lọc sản phẩm thuộc danh mục đồ uống DM01.
print("\n5. Sản phẩm thuộc danh mục DM01");
db.SanPham.find({ MaDM: "DM01" }, { _id: 0, MaSP: 1, TenSP: 1, DonGiaBan: 1 });

// 6. Lọc sản phẩm của nhà cung cấp NCC05.
print("\n6. Sản phẩm của nhà cung cấp NCC05");
db.SanPham.find({ MaNCC: "NCC05" }, { _id: 0, MaSP: 1, TenSP: 1, MaNCC: 1 });

// 7. Lọc sản phẩm có giá bán từ 10.000 đến 30.000 đồng.
print("\n7. Sản phẩm trong khoảng giá 10.000 - 30.000");
db.SanPham.find({ DonGiaBan: { $gte: 10000, $lte: 30000 } }, { _id: 0, MaSP: 1, TenSP: 1, DonGiaBan: 1 });

// 8. Sản phẩm tồn thấp: còn hàng nhưng dưới 20 đơn vị.
print("\n8. Sản phẩm tồn kho thấp");
db.SanPham.find({ SoLuongTon: { $gt: 0, $lt: 20 } }, { _id: 0, MaSP: 1, TenSP: 1, SoLuongTon: 1 });

// 9. Sản phẩm đã hết hàng.
print("\n9. Sản phẩm hết hàng");
db.SanPham.find({ SoLuongTon: 0 }, { _id: 0, MaSP: 1, TenSP: 1, TrangThai: 1 });

// 10. Tìm khách hàng theo số điện thoại.
print("\n10. Khách hàng có số điện thoại 0901000003");
db.KhachHang.findOne({ SDT: "0901000003" }, { _id: 0 });

// 11. Tìm tất cả nhân viên có chức vụ Thu ngân.
print("\n11. Danh sách thu ngân");
db.NhanVien.find({ ChucVu: "Thu ngân" }, { _id: 0, MaNV: 1, HoTen: 1, SDT: 1 });

// 12. Tìm hóa đơn theo mã.
print("\n12. Hóa đơn HD010");
db.HoaDon.findOne({ MaHD: "HD010" }, { _id: 0 });

// 13. Tìm hóa đơn của khách hàng KH001.
print("\n13. Hóa đơn của khách hàng KH001");
db.HoaDon.find({ MaKH: "KH001" }, { _id: 0, MaHD: 1, NgayLap: 1, ThanhTien: 1 });

// 14. Tìm hóa đơn do nhân viên NV002 lập.
print("\n14. Hóa đơn do NV002 lập");
db.HoaDon.find({ MaNV: "NV002" }, { _id: 0, MaHD: 1, MaKH: 1, NgayLap: 1, ThanhTien: 1 });

// 15. Lọc hóa đơn thực thu từ 200.000 đến 350.000 đồng.
print("\n15. Hóa đơn trong khoảng 200.000 - 350.000");
db.HoaDon.find({ ThanhTien: { $gte: 200000, $lte: 350000 } }, { _id: 0, MaHD: 1, ThanhTien: 1 });

// 16. Sắp xếp sản phẩm theo giá bán tăng dần.
print("\n16. Sản phẩm theo giá tăng dần");
db.SanPham.find({}, { _id: 0, MaSP: 1, TenSP: 1, DonGiaBan: 1 }).sort({ DonGiaBan: 1, MaSP: 1 });

// 17. Sắp xếp sản phẩm theo giá bán giảm dần.
print("\n17. Sản phẩm theo giá giảm dần");
db.SanPham.find({}, { _id: 0, MaSP: 1, TenSP: 1, DonGiaBan: 1 }).sort({ DonGiaBan: -1, MaSP: 1 });

// 18. Lấy 5 sản phẩm có giá bán cao nhất.
print("\n18. Top 5 sản phẩm đắt nhất");
db.SanPham.find({}, { _id: 0, MaSP: 1, TenSP: 1, DonGiaBan: 1 }).sort({ DonGiaBan: -1 }).limit(5);

// 19. Đếm tổng số sản phẩm.
print("\n19. Số sản phẩm: " + db.SanPham.countDocuments({}));

// 20. Đếm tổng số khách hàng.
print("\n20. Số khách hàng: " + db.KhachHang.countDocuments({}));
