// ================================================================
// 03_insert_transactions.js
// Tạo 20 hóa đơn và 10 phiếu nhập có ChiTiet dạng embedded array.
// Chạy sau 02_insert_master_data.js.
// ================================================================

db = db.getSiblingDB("QLSieuThiMini");

function batBuocTonTai(tenCollection, dieuKien, thongBao) {
    if (!db.getCollection(tenCollection).findOne(dieuKien)) {
        throw new Error(thongBao);
    }
}

function laySanPham(maSP) {
    var sp = db.SanPham.findOne({ MaSP: maSP });
    if (!sp) {
        throw new Error("Không tìm thấy sản phẩm " + maSP + ". Hãy chạy file 02 trước.");
    }
    return sp;
}

// Dữ liệu gọn chỉ lưu mã và số lượng; hàm sẽ tạo snapshot TenSP, DonGia, ThanhTien.
var hoaDonMau = [
    { MaHD: "HD001", MaKH: "KH001", MaNV: "NV002", NgayLap: "2026-08-01T08:15:00Z", PhuongThucThanhToan: "Tiền mặt", GiamGia: 0, Hang: [["SP001", 2], ["SP005", 5]] },
    { MaHD: "HD002", MaKH: "KH002", MaNV: "NV003", NgayLap: "2026-08-03T10:20:00Z", PhuongThucThanhToan: "Chuyển khoản", GiamGia: 0, Hang: [["SP009", 2], ["SP003", 6]] },
    { MaHD: "HD003", MaKH: "KH003", MaNV: "NV002", NgayLap: "2026-08-10T18:05:00Z", PhuongThucThanhToan: "Thẻ ngân hàng", MaKM: "KM003", GiamGia: 12600, Hang: [["SP015", 2], ["SP014", 2], ["SP016", 3]] },
    { MaHD: "HD004", MaKH: "KH004", MaNV: "NV003", NgayLap: "2026-08-15T09:40:00Z", PhuongThucThanhToan: "Tiền mặt", GiamGia: 0, Hang: [["SP011", 10], ["SP008", 3]] },
    { MaHD: "HD005", MaKH: "KH005", MaNV: "NV002", NgayLap: "2026-08-20T19:10:00Z", PhuongThucThanhToan: "Ví điện tử", MaKM: "KM003", GiamGia: 10600, Hang: [["SP019", 1], ["SP017", 2], ["SP018", 4]] },
    { MaHD: "HD006", MaKH: "KH006", MaNV: "NV003", NgayLap: "2026-09-01T07:50:00Z", PhuongThucThanhToan: "Tiền mặt", GiamGia: 0, Hang: [["SP004", 12], ["SP005", 10]] },
    { MaHD: "HD007", MaKH: "KH007", MaNV: "NV002", NgayLap: "2026-09-02T11:30:00Z", PhuongThucThanhToan: "Chuyển khoản", MaKM: "KM001", GiamGia: 20600, Hang: [["SP009", 3], ["SP013", 2]] },
    { MaHD: "HD008", MaKH: "KH008", MaNV: "NV003", NgayLap: "2026-09-04T16:45:00Z", PhuongThucThanhToan: "Tiền mặt", GiamGia: 0, Hang: [["SP001", 6], ["SP002", 6], ["SP003", 10]] },
    { MaHD: "HD009", MaKH: "KH009", MaNV: "NV002", NgayLap: "2026-09-05T18:20:00Z", PhuongThucThanhToan: "Thẻ ngân hàng", MaKM: "KM002", GiamGia: 20000, Hang: [["SP015", 3], ["SP014", 2], ["SP016", 4]] },
    { MaHD: "HD010", MaKH: "KH010", MaNV: "NV003", NgayLap: "2026-09-07T20:10:00Z", PhuongThucThanhToan: "Ví điện tử", GiamGia: 0, Hang: [["SP006", 8], ["SP007", 5], ["SP005", 10]] },
    { MaHD: "HD011", MaKH: "KH001", MaNV: "NV002", NgayLap: "2026-09-09T08:55:00Z", PhuongThucThanhToan: "Chuyển khoản", MaKM: "KM001", GiamGia: 22400, Hang: [["SP011", 12], ["SP012", 8], ["SP013", 2]] },
    { MaHD: "HD012", MaKH: "KH003", MaNV: "NV003", NgayLap: "2026-09-10T15:35:00Z", PhuongThucThanhToan: "Thẻ ngân hàng", MaKM: "KM001", GiamGia: 22800, Hang: [["SP017", 2], ["SP018", 5], ["SP019", 1]] },
    { MaHD: "HD013", MaKH: "KH005", MaNV: "NV002", NgayLap: "2026-09-12T17:25:00Z", PhuongThucThanhToan: "Tiền mặt", MaKM: "KM001", GiamGia: 23500, Hang: [["SP008", 4], ["SP009", 2], ["SP010", 3]] },
    { MaHD: "HD014", MaKH: "KH007", MaNV: "NV003", NgayLap: "2026-09-14T09:15:00Z", PhuongThucThanhToan: "Ví điện tử", MaKM: "KM001", GiamGia: 25000, Hang: [["SP001", 10], ["SP002", 10], ["SP004", 10]] },
    { MaHD: "HD015", MaKH: "KH009", MaNV: "NV002", NgayLap: "2026-09-16T19:45:00Z", PhuongThucThanhToan: "Chuyển khoản", MaKM: "KM002", GiamGia: 20000, Hang: [["SP015", 4], ["SP014", 3], ["SP016", 5]] },
    { MaHD: "HD016", MaKH: "KH002", MaNV: "NV003", NgayLap: "2026-09-18T12:05:00Z", PhuongThucThanhToan: "Tiền mặt", MaKM: "KM001", GiamGia: 21000, Hang: [["SP003", 20], ["SP005", 20]] },
    { MaHD: "HD017", MaKH: "KH004", MaNV: "NV002", NgayLap: "2026-09-20T14:30:00Z", PhuongThucThanhToan: "Thẻ ngân hàng", GiamGia: 0, Hang: [["SP006", 5], ["SP007", 8], ["SP010", 2]] },
    { MaHD: "HD018", MaKH: "KH006", MaNV: "NV003", NgayLap: "2026-09-22T18:50:00Z", PhuongThucThanhToan: "Ví điện tử", MaKM: "KM002", GiamGia: 20000, Hang: [["SP011", 20], ["SP012", 10], ["SP013", 3]] },
    { MaHD: "HD019", MaKH: "KH008", MaNV: "NV002", NgayLap: "2026-09-25T20:00:00Z", PhuongThucThanhToan: "Chuyển khoản", MaKM: "KM002", GiamGia: 20000, Hang: [["SP017", 3], ["SP018", 6], ["SP019", 2]] },
    { MaHD: "HD020", MaKH: "KH010", MaNV: "NV003", NgayLap: "2026-09-27T10:10:00Z", PhuongThucThanhToan: "Thẻ ngân hàng", MaKM: "KM001", GiamGia: 46000, Hang: [["SP001", 12], ["SP002", 8], ["SP009", 3], ["SP015", 2]] }
];

var hoaDon = hoaDonMau.map(function (mau) {
    batBuocTonTai("KhachHang", { MaKH: mau.MaKH }, "Không tìm thấy khách hàng " + mau.MaKH);
    batBuocTonTai("NhanVien", { MaNV: mau.MaNV }, "Không tìm thấy nhân viên " + mau.MaNV);
    if (mau.MaKM) {
        batBuocTonTai("KhuyenMai", { MaKM: mau.MaKM }, "Không tìm thấy khuyến mãi " + mau.MaKM);
    }

    var chiTiet = mau.Hang.map(function (dong) {
        var sp = laySanPham(dong[0]);
        return {
            MaSP: sp.MaSP,
            TenSP: sp.TenSP,
            SoLuong: dong[1],
            DonGia: sp.DonGiaBan,
            ThanhTien: dong[1] * sp.DonGiaBan
        };
    });
    var tongTien = chiTiet.reduce(function (tong, dong) { return tong + dong.ThanhTien; }, 0);
    if (mau.GiamGia > tongTien) {
        throw new Error("Giảm giá lớn hơn tổng tiền tại " + mau.MaHD);
    }
    var hd = {
        MaHD: mau.MaHD, MaKH: mau.MaKH, MaNV: mau.MaNV,
        NgayLap: ISODate(mau.NgayLap), ChiTiet: chiTiet,
        TongTien: tongTien, GiamGia: mau.GiamGia,
        ThanhTien: tongTien - mau.GiamGia,
        PhuongThucThanhToan: mau.PhuongThucThanhToan
    };
    if (mau.MaKM) { hd.MaKM = mau.MaKM; }
    return hd;
});

var phieuNhapMau = [
    { MaPN: "PN001", MaNCC: "NCC02", MaNV: "NV004", NgayNhap: "2026-08-01T02:00:00Z", Hang: [["SP001", 100]] },
    { MaPN: "PN002", MaNCC: "NCC01", MaNV: "NV004", NgayNhap: "2026-08-03T02:15:00Z", Hang: [["SP002", 80], ["SP003", 120]] },
    { MaPN: "PN003", MaNCC: "NCC03", MaNV: "NV004", NgayNhap: "2026-08-06T01:45:00Z", Hang: [["SP005", 200]] },
    { MaPN: "PN004", MaNCC: "NCC06", MaNV: "NV001", NgayNhap: "2026-08-10T03:00:00Z", Hang: [["SP004", 100], ["SP006", 80], ["SP007", 50]] },
    { MaPN: "PN005", MaNCC: "NCC06", MaNV: "NV004", NgayNhap: "2026-08-15T02:30:00Z", Hang: [["SP008", 60], ["SP009", 40], ["SP010", 50]] },
    { MaPN: "PN006", MaNCC: "NCC04", MaNV: "NV004", NgayNhap: "2026-08-20T01:30:00Z", Hang: [["SP011", 150], ["SP013", 50]] },
    { MaPN: "PN007", MaNCC: "NCC06", MaNV: "NV001", NgayNhap: "2026-09-01T02:10:00Z", Hang: [["SP012", 120], ["SP014", 60]] },
    { MaPN: "PN008", MaNCC: "NCC06", MaNV: "NV004", NgayNhap: "2026-09-08T02:20:00Z", Hang: [["SP015", 50], ["SP016", 80], ["SP020", 40]] },
    { MaPN: "PN009", MaNCC: "NCC05", MaNV: "NV004", NgayNhap: "2026-09-15T01:50:00Z", Hang: [["SP017", 50], ["SP018", 80], ["SP019", 30]] },
    { MaPN: "PN010", MaNCC: "NCC01", MaNV: "NV004", NgayNhap: "2026-09-24T02:40:00Z", Hang: [["SP002", 100], ["SP003", 150]] }
];

var phieuNhap = phieuNhapMau.map(function (mau) {
    batBuocTonTai("NhaCungCap", { MaNCC: mau.MaNCC }, "Không tìm thấy nhà cung cấp " + mau.MaNCC);
    batBuocTonTai("NhanVien", { MaNV: mau.MaNV }, "Không tìm thấy nhân viên " + mau.MaNV);
    var chiTiet = mau.Hang.map(function (dong) {
        var sp = laySanPham(dong[0]);
        if (sp.MaNCC !== mau.MaNCC) {
            throw new Error("Sản phẩm " + sp.MaSP + " không thuộc nhà cung cấp " + mau.MaNCC);
        }
        return {
            MaSP: sp.MaSP,
            TenSP: sp.TenSP,
            SoLuong: dong[1],
            DonGiaNhap: sp.DonGiaNhap,
            ThanhTien: dong[1] * sp.DonGiaNhap
        };
    });
    var tongTien = chiTiet.reduce(function (tong, dong) { return tong + dong.ThanhTien; }, 0);
    return {
        MaPN: mau.MaPN, MaNCC: mau.MaNCC, MaNV: mau.MaNV,
        NgayNhap: ISODate(mau.NgayNhap), ChiTiet: chiTiet, TongTien: tongTien
    };
});

// Chỉ xóa rồi chèn lại đúng các mã giao dịch mẫu trong file.
db.HoaDon.deleteMany({ MaHD: { $in: hoaDon.map(function (x) { return x.MaHD; }) } });
db.PhieuNhap.deleteMany({ MaPN: { $in: phieuNhap.map(function (x) { return x.MaPN; }) } });
db.HoaDon.insertMany(hoaDon);
db.PhieuNhap.insertMany(phieuNhap);

// Kiểm tra tự động sau khi chèn: kết quả đúng phải đều bằng 0.
var hoaDonSai = db.HoaDon.aggregate([
    { $match: { MaHD: { $in: hoaDon.map(function (x) { return x.MaHD; }) } } },
    { $project: { MaHD: 1, TongTien: 1, ThanhTien: 1, GiamGia: 1, TongChiTiet: { $sum: "$ChiTiet.ThanhTien" } } },
    { $match: { $expr: { $or: [
        { $ne: ["$TongTien", "$TongChiTiet"] },
        { $ne: ["$ThanhTien", { $subtract: ["$TongTien", "$GiamGia"] }] }
    ] } } },
    { $count: "SoHoaDonSai" }
]).toArray();

var phieuNhapSai = db.PhieuNhap.aggregate([
    { $match: { MaPN: { $in: phieuNhap.map(function (x) { return x.MaPN; }) } } },
    { $project: { MaPN: 1, TongTien: 1, TongChiTiet: { $sum: "$ChiTiet.ThanhTien" } } },
    { $match: { $expr: { $ne: ["$TongTien", "$TongChiTiet"] } } },
    { $count: "SoPhieuNhapSai" }
]).toArray();

print("Đã chèn " + hoaDon.length + " hóa đơn và " + phieuNhap.length + " phiếu nhập.");
print("Số hóa đơn sai tổng tiền: " + (hoaDonSai.length ? hoaDonSai[0].SoHoaDonSai : 0));
print("Số phiếu nhập sai tổng tiền: " + (phieuNhapSai.length ? phieuNhapSai[0].SoPhieuNhapSai : 0));
