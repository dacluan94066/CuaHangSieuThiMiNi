// ================================================================
// 05_advanced_queries.js - 22 bài toán Aggregation Framework
// Có: $match, $project, $group, $unwind, $lookup, $sort, $limit,
//      $sum, $avg, $multiply và $count.
// ================================================================
db = db.getSiblingDB("QLSieuThiMini");

// 1. Tổng doanh thu thực thu của toàn siêu thị.
print("\n1. Tổng doanh thu toàn siêu thị");
db.HoaDon.aggregate([
    { $group: { _id: null, TongDoanhThu: { $sum: "$ThanhTien" }, TongGiamGia: { $sum: "$GiamGia" } } },
    { $project: { _id: 0, TongDoanhThu: 1, TongGiamGia: 1 } }
]);

// 2. Doanh thu theo ngày.
print("\n2. Doanh thu theo ngày");
db.HoaDon.aggregate([
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$NgayLap" } }, DoanhThu: { $sum: "$ThanhTien" }, SoHoaDon: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, Ngay: "$_id", DoanhThu: 1, SoHoaDon: 1 } }
]);

// 3. Doanh thu theo nhân viên, kết hợp để hiển thị họ tên.
print("\n3. Doanh thu theo nhân viên");
db.HoaDon.aggregate([
    { $group: { _id: "$MaNV", DoanhThu: { $sum: "$ThanhTien" } } },
    { $lookup: { from: "NhanVien", localField: "_id", foreignField: "MaNV", as: "NhanVien" } },
    { $unwind: "$NhanVien" },
    { $project: { _id: 0, MaNV: "$_id", HoTen: "$NhanVien.HoTen", DoanhThu: 1 } },
    { $sort: { DoanhThu: -1 } }
]);

// 4. Số hóa đơn do từng nhân viên lập.
print("\n4. Số hóa đơn của từng nhân viên");
db.HoaDon.aggregate([
    { $group: { _id: "$MaNV", SoHoaDon: { $sum: 1 } } },
    { $lookup: { from: "NhanVien", localField: "_id", foreignField: "MaNV", as: "NV" } },
    { $project: { _id: 0, MaNV: "$_id", HoTen: { $arrayElemAt: ["$NV.HoTen", 0] }, SoHoaDon: 1 } },
    { $sort: { SoHoaDon: -1, MaNV: 1 } }
]);

// 5. Sản phẩm bán chạy nhất theo số lượng.
print("\n5. Sản phẩm bán chạy nhất");
db.HoaDon.aggregate([
    { $unwind: "$ChiTiet" },
    { $group: { _id: "$ChiTiet.MaSP", TenSP: { $first: "$ChiTiet.TenSP" }, TongSoLuongBan: { $sum: "$ChiTiet.SoLuong" } } },
    { $sort: { TongSoLuongBan: -1 } },
    { $limit: 1 },
    { $project: { _id: 0, MaSP: "$_id", TenSP: 1, TongSoLuongBan: 1 } }
]);

// 6. Top 5 sản phẩm bán chạy.
print("\n6. Top 5 sản phẩm bán chạy");
db.HoaDon.aggregate([
    { $unwind: "$ChiTiet" },
    { $group: { _id: "$ChiTiet.MaSP", TenSP: { $first: "$ChiTiet.TenSP" }, TongSoLuongBan: { $sum: "$ChiTiet.SoLuong" } } },
    { $sort: { TongSoLuongBan: -1, _id: 1 } },
    { $limit: 5 },
    { $project: { _id: 0, MaSP: "$_id", TenSP: 1, TongSoLuongBan: 1 } }
]);

// 7. Tổng số lượng bán của từng sản phẩm.
print("\n7. Tổng số lượng bán từng sản phẩm");
db.HoaDon.aggregate([
    { $unwind: "$ChiTiet" },
    { $group: { _id: "$ChiTiet.MaSP", TenSP: { $first: "$ChiTiet.TenSP" }, TongSoLuongBan: { $sum: "$ChiTiet.SoLuong" } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, MaSP: "$_id", TenSP: 1, TongSoLuongBan: 1 } }
]);

// 8. Doanh thu gộp của từng sản phẩm; $multiply tính lại từ số lượng * đơn giá.
print("\n8. Doanh thu từng sản phẩm");
db.HoaDon.aggregate([
    { $unwind: "$ChiTiet" },
    { $project: { MaSP: "$ChiTiet.MaSP", TenSP: "$ChiTiet.TenSP", DoanhThuDong: { $multiply: ["$ChiTiet.SoLuong", "$ChiTiet.DonGia"] } } },
    { $group: { _id: "$MaSP", TenSP: { $first: "$TenSP" }, DoanhThuGop: { $sum: "$DoanhThuDong" } } },
    { $sort: { DoanhThuGop: -1 } },
    { $project: { _id: 0, MaSP: "$_id", TenSP: 1, DoanhThuGop: 1 } }
]);

// 9. Khách hàng chi tiêu nhiều nhất.
print("\n9. Khách hàng chi tiêu nhiều nhất");
db.HoaDon.aggregate([
    { $group: { _id: "$MaKH", TongChiTieu: { $sum: "$ThanhTien" } } },
    { $sort: { TongChiTieu: -1 } },
    { $limit: 1 },
    { $lookup: { from: "KhachHang", localField: "_id", foreignField: "MaKH", as: "KH" } },
    { $project: { _id: 0, MaKH: "$_id", HoTen: { $arrayElemAt: ["$KH.HoTen", 0] }, TongChiTieu: 1 } }
]);

// 10. Top 5 khách hàng chi tiêu nhiều nhất.
print("\n10. Top 5 khách hàng chi tiêu nhiều nhất");
db.HoaDon.aggregate([
    { $group: { _id: "$MaKH", TongChiTieu: { $sum: "$ThanhTien" } } },
    { $sort: { TongChiTieu: -1 } },
    { $limit: 5 },
    { $lookup: { from: "KhachHang", localField: "_id", foreignField: "MaKH", as: "KH" } },
    { $project: { _id: 0, MaKH: "$_id", HoTen: { $arrayElemAt: ["$KH.HoTen", 0] }, TongChiTieu: 1 } }
]);

// 11. Số lần mua hàng của từng khách hàng.
print("\n11. Số lần mua của từng khách hàng");
db.HoaDon.aggregate([
    { $group: { _id: "$MaKH", SoLanMua: { $sum: 1 } } },
    { $lookup: { from: "KhachHang", localField: "_id", foreignField: "MaKH", as: "KH" } },
    { $project: { _id: 0, MaKH: "$_id", HoTen: { $arrayElemAt: ["$KH.HoTen", 0] }, SoLanMua: 1 } },
    { $sort: { SoLanMua: -1, MaKH: 1 } }
]);

// 12. Giá trị hóa đơn trung bình, thấp nhất và cao nhất.
print("\n12. Giá trị hóa đơn trung bình");
db.HoaDon.aggregate([
    { $group: { _id: null, GiaTriTrungBinh: { $avg: "$ThanhTien" }, ThapNhat: { $min: "$ThanhTien" }, CaoNhat: { $max: "$ThanhTien" } } },
    { $project: { _id: 0 } }
]);

// 13. Thống kê phương thức thanh toán.
print("\n13. Thống kê phương thức thanh toán");
db.HoaDon.aggregate([
    { $group: { _id: "$PhuongThucThanhToan", SoHoaDon: { $sum: 1 }, TongDoanhThu: { $sum: "$ThanhTien" } } },
    { $sort: { SoHoaDon: -1 } },
    { $project: { _id: 0, PhuongThuc: "$_id", SoHoaDon: 1, TongDoanhThu: 1 } }
]);

// 14. Tổng tiền nhập hàng.
print("\n14. Tổng tiền nhập hàng");
db.PhieuNhap.aggregate([
    { $group: { _id: null, TongTienNhap: { $sum: "$TongTien" } } },
    { $project: { _id: 0, TongTienNhap: 1 } }
]);

// 15. Tổng tiền nhập theo nhà cung cấp.
print("\n15. Tổng tiền nhập theo nhà cung cấp");
db.PhieuNhap.aggregate([
    { $group: { _id: "$MaNCC", TongTienNhap: { $sum: "$TongTien" }, SoPhieu: { $sum: 1 } } },
    { $lookup: { from: "NhaCungCap", localField: "_id", foreignField: "MaNCC", as: "NCC" } },
    { $project: { _id: 0, MaNCC: "$_id", TenNCC: { $arrayElemAt: ["$NCC.TenNCC", 0] }, TongTienNhap: 1, SoPhieu: 1 } },
    { $sort: { TongTienNhap: -1 } }
]);

// 16. Sản phẩm được nhập nhiều nhất.
print("\n16. Sản phẩm được nhập nhiều nhất");
db.PhieuNhap.aggregate([
    { $unwind: "$ChiTiet" },
    { $group: { _id: "$ChiTiet.MaSP", TenSP: { $first: "$ChiTiet.TenSP" }, TongSoLuongNhap: { $sum: "$ChiTiet.SoLuong" } } },
    { $sort: { TongSoLuongNhap: -1 } },
    { $limit: 1 },
    { $project: { _id: 0, MaSP: "$_id", TenSP: 1, TongSoLuongNhap: 1 } }
]);

// 17. Kết hợp HoaDon với KhachHang bằng $lookup.
print("\n17. Hóa đơn kèm thông tin khách hàng");
db.HoaDon.aggregate([
    { $lookup: { from: "KhachHang", localField: "MaKH", foreignField: "MaKH", as: "KhachHang" } },
    { $unwind: "$KhachHang" },
    { $project: { _id: 0, MaHD: 1, NgayLap: 1, ThanhTien: 1, MaKH: 1, TenKhachHang: "$KhachHang.HoTen", SDT: "$KhachHang.SDT" } },
    { $sort: { NgayLap: -1 } }
]);

// 18. Kết hợp HoaDon với NhanVien bằng $lookup.
print("\n18. Hóa đơn kèm nhân viên lập");
db.HoaDon.aggregate([
    { $lookup: { from: "NhanVien", localField: "MaNV", foreignField: "MaNV", as: "NhanVien" } },
    { $unwind: "$NhanVien" },
    { $project: { _id: 0, MaHD: 1, ThanhTien: 1, MaNV: 1, TenNhanVien: "$NhanVien.HoTen", ChucVu: "$NhanVien.ChucVu" } },
    { $sort: { MaHD: 1 } }
]);

// 19. Kết hợp SanPham với DanhMuc.
print("\n19. Sản phẩm kèm tên danh mục");
db.SanPham.aggregate([
    { $lookup: { from: "DanhMuc", localField: "MaDM", foreignField: "MaDM", as: "DanhMuc" } },
    { $unwind: "$DanhMuc" },
    { $project: { _id: 0, MaSP: 1, TenSP: 1, MaDM: 1, TenDM: "$DanhMuc.TenDM", DonGiaBan: 1 } },
    { $sort: { MaDM: 1, MaSP: 1 } }
]);

// 20. Kết hợp SanPham với NhaCungCap.
print("\n20. Sản phẩm kèm nhà cung cấp");
db.SanPham.aggregate([
    { $lookup: { from: "NhaCungCap", localField: "MaNCC", foreignField: "MaNCC", as: "NCC" } },
    { $unwind: "$NCC" },
    { $project: { _id: 0, MaSP: 1, TenSP: 1, MaNCC: 1, TenNCC: "$NCC.TenNCC", SDTNhaCungCap: "$NCC.SDT" } },
    { $sort: { MaNCC: 1, MaSP: 1 } }
]);

// 21. Tìm và đếm hóa đơn có thực thu lớn hơn mức cho trước.
var MUC_TIEN = 300000;
print("\n21. Hóa đơn có thành tiền lớn hơn " + MUC_TIEN);
db.HoaDon.aggregate([
    { $match: { ThanhTien: { $gt: MUC_TIEN } } },
    { $project: { _id: 0, MaHD: 1, MaKH: 1, MaNV: 1, NgayLap: 1, ThanhTien: 1 } },
    { $sort: { ThanhTien: -1 } }
]);
// $count trả về số document còn lại sau $match.
db.HoaDon.aggregate([
    { $match: { ThanhTien: { $gt: MUC_TIEN } } },
    { $count: "SoHoaDonVuotMuc" }
]);

// 22. Thống kê doanh thu theo tháng.
print("\n22. Doanh thu theo tháng");
db.HoaDon.aggregate([
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$NgayLap" } }, DoanhThu: { $sum: "$ThanhTien" }, SoHoaDon: { $sum: 1 }, TrungBinhHoaDon: { $avg: "$ThanhTien" } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, Thang: "$_id", DoanhThu: 1, SoHoaDon: 1, TrungBinhHoaDon: 1 } }
]);
