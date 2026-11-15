// ================================================================
// 06_update_delete_queries.js - Ví dụ update/delete an toàn để demo
// Các lệnh xóa chỉ tác động document có mã TEST_, không xóa dữ liệu chính.
// ================================================================
db = db.getSiblingDB("QLSieuThiMini");

// 1. updateOne: cập nhật giá bán của một sản phẩm về giá minh họa cố định.
db.SanPham.updateOne(
    { MaSP: "SP001" },
    { $set: { DonGiaBan: 10500, NgayCapNhat: new Date() } }
);

// 2. updateOne: cập nhật số lượng tồn kho.
db.SanPham.updateOne(
    { MaSP: "SP020" },
    { $set: { SoLuongTon: 25, TrangThai: "Đang bán", NgayCapNhat: new Date() } }
);

// 3. Cộng điểm tích lũy bằng $inc. Chạy một lần sẽ cộng 20 điểm cho KH001.
db.KhachHang.updateOne(
    { MaKH: "KH001" },
    { $inc: { DiemTichLuy: 20 } }
);

// 4. Đổi trạng thái nhân viên.
db.NhanVien.updateOne(
    { MaNV: "NV006" },
    { $set: { TrangThai: "Tạm nghỉ" } }
);

// 5. Cập nhật nội dung và thời gian khuyến mãi.
db.KhuyenMai.updateOne(
    { MaKM: "KM004" },
    { $set: { GiaTri: 20, NgayKetThuc: ISODate("2026-10-20T23:59:59Z"), TrangThai: "Đang áp dụng" } }
);

// 6. updateMany: đồng bộ trạng thái cho mọi sản phẩm có tồn kho dưới 20.
db.SanPham.updateMany(
    { SoLuongTon: { $gt: 0, $lt: 20 } },
    { $set: { TrangThai: "Sắp hết hàng" } }
);

// Tạo riêng dữ liệu TEST để minh họa xóa, không đụng tới dữ liệu nghiệp vụ.
db.KhachHang.updateOne(
    { MaKH: "TEST_KH_DELETE_ONE" },
    { $set: { HoTen: "Khách hàng test deleteOne", SDT: "0000000001", Email: "test1@example.com", DiaChi: "Dữ liệu test", DiemTichLuy: 0, NgayDangKy: new Date() } },
    { upsert: true }
);
db.KhachHang.updateOne(
    { MaKH: "TEST_KH_DELETE_MANY_1" },
    { $set: { HoTen: "Khách hàng test deleteMany 1", SDT: "0000000002", Email: "test2@example.com", DiaChi: "Dữ liệu test", DiemTichLuy: 0, NgayDangKy: new Date() } },
    { upsert: true }
);
db.KhachHang.updateOne(
    { MaKH: "TEST_KH_DELETE_MANY_2" },
    { $set: { HoTen: "Khách hàng test deleteMany 2", SDT: "0000000003", Email: "test3@example.com", DiaChi: "Dữ liệu test", DiemTichLuy: 0, NgayDangKy: new Date() } },
    { upsert: true }
);

// 7. deleteOne: chỉ xóa đúng một document test.
db.KhachHang.deleteOne({ MaKH: "TEST_KH_DELETE_ONE" });

// 8. deleteMany: chỉ xóa các document có tiền tố mã TEST_KH_DELETE_MANY_.
db.KhachHang.deleteMany({ MaKH: { $regex: "^TEST_KH_DELETE_MANY_" } });

print("Đã chạy xong ví dụ updateOne, updateMany, deleteOne và deleteMany.");
print("Kiểm tra sản phẩm SP001, SP020; khách KH001; nhân viên NV006; KM004 để xem kết quả.");
