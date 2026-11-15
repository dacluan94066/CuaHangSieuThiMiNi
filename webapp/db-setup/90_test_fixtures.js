// OPTIONAL, người dùng review và chạy thủ công. Chỉ Test, không reset tồn/điểm.
// S1 chưa có catalog/checkout; fixture này chuẩn bị cho ca biên S2/S3.
(function () {
  var DB_NAME = "QLSieuThiMini_Test";
  if (DB_NAME !== "QLSieuThiMini_Test" || db.getName() !== DB_NAME) throw new Error("DỪNG: fixture chỉ được chạy trên QLSieuThiMini_Test.");
  ["SanPham", "DanhMuc", "NhaCungCap", "KhuyenMai", "TaiKhoanKhachHang", "YeuCauCuaHang"].forEach(function (name) {
    if (db.getCollectionInfos({ name: name }).length !== 1) throw new Error("DỪNG: thiếu collection " + name);
  });
  if (!db.NhanVien.findOne({ MaNV: "NV_ONLINE", HoTen: "Bán hàng online" })) throw new Error("DỪNG: chưa chạy 02_online_employee.js.");
  var category = db.DanhMuc.findOne({ MaDM: "DM01" }); var supplier = db.NhaCungCap.findOne({ MaNCC: "NCC01" });
  if (!category || !supplier) throw new Error("DỪNG: bản sao thiếu DM01/NCC01.");
  var now = new Date(); var day = 86400000;
  var plans = [
    { collection: "SanPham", field: "MaSP", code: "TEST_SP_LAST", document: {
      MaSP: "TEST_SP_LAST", TenSP: "[TEST] Sản phẩm còn một đơn vị", MaDM: "DM01", MaNCC: "NCC01", DonGiaNhap: 6000, DonGiaBan: 10000,
      SoLuongTon: NumberInt(1), DonViTinh: "Cái", TrangThai: "Đang bán", HanSuDung: new Date(now.getTime() + 365 * day), NguonFixture: "STORE_TEST_V1"
    } },
    { collection: "KhuyenMai", field: "MaKM", code: "TEST_KM_LIVE", document: {
      MaKM: "TEST_KM_LIVE", TenKM: "[TEST] Giảm 5% không cần điểm", LoaiKhuyenMai: "Phần trăm", GiaTri: 5,
      NgayBatDau: new Date(now.getTime() - day), NgayKetThuc: new Date(now.getTime() + 30 * day), DieuKien: { DonHangToiThieu: 0, GiamToiDa: 30000 }, TrangThai: "Đang áp dụng", NguonFixture: "STORE_TEST_V1"
    } },
    { collection: "KhuyenMai", field: "MaKM", code: "TEST_KM_EXPIRED", document: {
      MaKM: "TEST_KM_EXPIRED", TenKM: "[TEST] Mã đã hết hạn", LoaiKhuyenMai: "Số tiền", GiaTri: 1000,
      NgayBatDau: new Date(now.getTime() - 3 * day), NgayKetThuc: new Date(now.getTime() - day), DieuKien: { DonHangToiThieu: 0 }, TrangThai: "Đã kết thúc", NguonFixture: "STORE_TEST_V1"
    } }
  ];
  plans.forEach(function (plan) {
    var filter = {}; filter[plan.field] = plan.code;
    var old = db.getCollection(plan.collection).findOne(filter);
    if (old && old.NguonFixture !== "STORE_TEST_V1") throw new Error("DỪNG: mã fixture bị chiếm, không ghi đè: " + plan.code);
  });
  plans.forEach(function (plan) {
    var filter = {}; filter[plan.field] = plan.code;
    db.getCollection(plan.collection).updateOne(filter, { $setOnInsert: plan.document }, { upsert: true });
  });
  print("Fixture Test đã sẵn sàng. Chạy lại KHÔNG đặt lại tồn, điểm hoặc gia hạn KM. Không tạo mật khẩu rõ/tài khoản mẫu.");
}());
