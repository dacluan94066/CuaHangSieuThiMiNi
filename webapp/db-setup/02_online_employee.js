// Người dùng tự chạy sau 01, chỉ trên DB Test. Không tạo TaiKhoan nhân viên.
(function () {
  var ALLOWED = ["QLSieuThiMini", "QLSieuThiMini_Test"];
  if (ALLOWED.indexOf(db.getName()) === -1) throw new Error("DỪNG: phải chọn đúng database QLSieuThiMini hoặc QLSieuThiMini_Test.");
  var DB_NAME = db.getName();
  if (db.getCollectionInfos({ name: "TaiKhoanKhachHang" }).length !== 1 || db.getCollectionInfos({ name: "YeuCauCuaHang" }).length !== 1
    || db.getCollectionInfos({ name: "NhanVien" }).length !== 1) throw new Error("DỪNG: chưa restore/setup schema.");
  var indexes = db.NhanVien.getIndexes();
  if (!indexes.some(function (x) { return x.name === "uq_NhanVien_MaNV" && x.unique === true && JSON.stringify(x.key) === JSON.stringify({ MaNV: 1 }); })) throw new Error("DỪNG: thiếu unique index MaNV.");
  var expected = { MaNV: "NV_ONLINE", HoTen: "Bán hàng online", ChucVu: "Nhân viên hệ thống", Luong: 0, TrangThai: "Đang làm" };
  function matches(value) { return value && Object.keys(expected).every(function (key) { return value[key] === expected[key]; }) && value.NgayVaoLam instanceof Date; }
  var old = db.NhanVien.findOne({ MaNV: expected.MaNV });
  if (old) {
    if (!matches(old)) throw new Error("DỪNG: MaNV NV_ONLINE đã có nhưng không đúng nhân viên hệ thống. Không ghi đè.");
    print("Đã có nhân viên Bán hàng online, giữ nguyên ngày vào làm và dữ liệu."); return;
  }
  var seed = Object.assign({}, expected, { NgayVaoLam: new Date() });
  db.NhanVien.updateOne({ MaNV: expected.MaNV }, { $setOnInsert: seed }, { upsert: true });
  if (!matches(db.NhanVien.findOne({ MaNV: expected.MaNV }))) throw new Error("DỪNG: phát hiện xung đột nhân viên, không ghi đè.");
  print("Đã thiết lập NV_ONLINE trên " + DB_NAME + ". Không tạo tài khoản nhân viên.");
}());
