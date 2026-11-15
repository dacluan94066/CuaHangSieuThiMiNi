# Thực hành MongoDB: Quản lý siêu thị mini bằng Studio 3T

Project minh họa cho đề tài **“Tìm hiểu công cụ Studio 3T để quản trị và khai thác CSDL tài liệu ‘Quản lý siêu thị mini’ và xây dựng ứng dụng minh họa”**.

Database sử dụng: `QLSieuThiMini`.

## Mô hình dữ liệu

Project có 9 collection:

| Collection | Vai trò | Cách mô hình hóa |
|---|---|---|
| `DanhMuc` | Nhóm sản phẩm | Document độc lập, tham chiếu bằng `MaDM` |
| `NhaCungCap` | Đối tác nhập hàng | Document độc lập, tham chiếu bằng `MaNCC` |
| `SanPham` | Hàng hóa và tồn kho | Tham chiếu danh mục/nhà cung cấp bằng mã |
| `KhachHang` | Thành viên mua hàng | Thông tin liên hệ và điểm tích lũy |
| `NhanVien` | Nhân sự | Hồ sơ, chức vụ, trạng thái |
| `TaiKhoan` | Tài khoản minh họa | Liên kết nhân viên bằng `MaNV` |
| `HoaDon` | Giao dịch bán hàng | Nhúng mảng `ChiTiet`, giữ snapshot tên/giá bán |
| `PhieuNhap` | Giao dịch nhập hàng | Nhúng mảng `ChiTiet`, giữ snapshot tên/giá nhập |
| `KhuyenMai` | Chương trình ưu đãi | `DieuKien` là embedded document linh hoạt |

Việc nhúng `ChiTiet` giúp đọc trọn hóa đơn/phiếu nhập trong một document và giữ đúng tên, đơn giá tại thời điểm giao dịch. Các thực thể dùng chung vẫn được tham chiếu bằng mã để tránh lặp thông tin thay đổi thường xuyên.

## Các file trong project

| Thứ tự | File | Chức năng |
|---:|---|---|
| 1 | `01_create_database.js` | Chọn database, làm mới đúng 9 collection và tạo validation cơ bản |
| 2 | `02_insert_master_data.js` | Chèn danh mục, NCC, sản phẩm, khách hàng, nhân viên, tài khoản, khuyến mãi |
| 3 | `03_insert_transactions.js` | Sinh 20 hóa đơn và 10 phiếu nhập; tự tính tổng và kiểm tra liên kết |
| 4 | `04_basic_queries.js` | 20 truy vấn tìm kiếm, lọc, sắp xếp, giới hạn và đếm |
| 5 | `05_advanced_queries.js` | 22 bài toán Aggregation Framework và `$lookup` |
| 6 | `06_update_delete_queries.js` | Ví dụ `updateOne`, `updateMany`, `deleteOne`, `deleteMany` |
| 7 | `07_indexes.js` | Tạo unique, text, date và compound index |
| 8 | `08_import_export.md` | Hướng dẫn Import/Export JSON và CSV bằng Studio 3T |
| 9 | `09_backup_restore.md` | Hướng dẫn `mongodump`/`mongorestore` trên Windows |

## Thứ tự thực hành hoàn chỉnh

### 1. Mở Studio 3T

Khởi động Studio 3T. Đảm bảo dịch vụ MongoDB trên máy đang chạy.

### 2. Kết nối localhost:27017

1. Chọn **Connect** → **New Connection**.
2. Đặt tên, ví dụ `MongoDB Local`.
3. Nhập server `localhost`, port `27017`, hoặc URI `mongodb://localhost:27017`.
4. Bấm **Test Connection**, sau đó **Save** và **Connect**.

### 3. Mở IntelliShell

Chọn kết nối local, mở **IntelliShell**. Mỗi file có thể được mở/copy vào một tab riêng. Chạy toàn bộ file bằng nút Run hoặc phím tắt được hiển thị trong phiên bản Studio 3T đang dùng.

### 4. Chạy `01_create_database.js`

Chạy file đầu tiên để tạo `QLSieuThiMini` và 9 collection.

> Cảnh báo: file này chủ động `drop()` đúng 9 collection của bài thực hành để có thể dựng lại dữ liệu sạch. File không dùng `dropDatabase()` và không tác động database/project khác. Không chạy bước 1 nếu đang có dữ liệu thật cần giữ trong 9 collection này.

### 5. Chạy `02_insert_master_data.js`

File chèn:

- 6 danh mục.
- 6 nhà cung cấp.
- 20 sản phẩm.
- 10 khách hàng.
- 6 nhân viên.
- 6 tài khoản.
- 5 khuyến mãi.

Nếu chạy lại riêng file 02, script chỉ thay thế các document có mã mẫu đã khai báo, không xóa document khác.

### 6. Chạy `03_insert_transactions.js`

File chèn 20 hóa đơn và 10 phiếu nhập. Script kiểm tra khách hàng, nhân viên, nhà cung cấp, khuyến mãi và sản phẩm tham chiếu đều tồn tại. Tên, đơn giá và thành tiền từng dòng được tạo từ `SanPham`; tổng tiền được tính tự động.

Cuối output phải có:

```text
Số hóa đơn sai tổng tiền: 0
Số phiếu nhập sai tổng tiền: 0
```

### 7. Kiểm tra dữ liệu

Chạy đoạn sau trong IntelliShell:

```javascript
db = db.getSiblingDB("QLSieuThiMini");

db.getCollectionNames().sort();
db.DanhMuc.countDocuments({});      // 6
db.NhaCungCap.countDocuments({});   // 6
db.SanPham.countDocuments({});      // 20
db.KhachHang.countDocuments({});    // 10
db.NhanVien.countDocuments({});     // 6
db.TaiKhoan.countDocuments({});     // 6
db.KhuyenMai.countDocuments({});    // 5
db.HoaDon.countDocuments({});       // 20
db.PhieuNhap.countDocuments({});    // 10
```

Kiểm tra liên kết bị thiếu; cả bốn kết quả phải rỗng:

```javascript
db.SanPham.aggregate([
  { $lookup: { from: "DanhMuc", localField: "MaDM", foreignField: "MaDM", as: "DM" } },
  { $match: { DM: { $size: 0 } } }
]);

db.HoaDon.aggregate([
  { $lookup: { from: "KhachHang", localField: "MaKH", foreignField: "MaKH", as: "KH" } },
  { $match: { KH: { $size: 0 } } }
]);

db.HoaDon.aggregate([
  { $unwind: "$ChiTiet" },
  { $lookup: { from: "SanPham", localField: "ChiTiet.MaSP", foreignField: "MaSP", as: "SP" } },
  { $match: { SP: { $size: 0 } } }
]);

db.PhieuNhap.aggregate([
  { $lookup: { from: "NhaCungCap", localField: "MaNCC", foreignField: "MaNCC", as: "NCC" } },
  { $match: { NCC: { $size: 0 } } }
]);
```

### 8. Chạy truy vấn cơ bản

Mở và chạy `04_basic_queries.js`. Có thể bôi đen từng câu lệnh để trình bày lần lượt: tìm theo mã/tên, regex, lọc danh mục/NCC/khoảng giá/tồn kho, hóa đơn, sắp xếp, top 5 và đếm.

### 9. Chạy truy vấn nâng cao

Mở `05_advanced_queries.js`. Khi demo, bôi đen một pipeline gồm cả comment rồi chạy. File có đủ `$match`, `$project`, `$group`, `$unwind`, `$lookup`, `$sort`, `$limit`, `$sum`, `$avg`, `$multiply`, `$count`.

### 10. Demo update/delete

Chạy `06_update_delete_queries.js` sau khi đã demo dữ liệu ban đầu. Lệnh xóa chỉ xóa các khách hàng có mã bắt đầu bằng `TEST_KH_DELETE_`; không xóa khách hàng chính. Lưu ý lệnh `$inc` sẽ cộng thêm 20 điểm cho `KH001` mỗi lần chạy file.

Muốn trở lại bộ dữ liệu ban đầu, chạy lại theo thứ tự file 01 → 02 → 03.

### 11. Demo index

Chạy `07_indexes.js`. Sau đó có thể chứng minh index được dùng:

```javascript
db.SanPham.find({ MaSP: "SP005" }).explain("executionStats");
db.HoaDon.find({ NgayLap: { $gte: ISODate("2026-09-01T00:00:00Z") } }).explain("executionStats");
db.SanPham.find({ $text: { $search: "sữa" } }, { score: { $meta: "textScore" } });
```

Trong `explain`, chú ý `IXSCAN` và tên index thay vì `COLLSCAN`.

### 12. Demo Import/Export

Làm theo `08_import_export.md`. Khuyến nghị:

- JSON: export/import `HoaDon` để thể hiện document có mảng lồng nhau.
- CSV: export/import `SanPham` để thể hiện dữ liệu dạng bảng.
- Import vào `HoaDon_ImportDemo` và `SanPham_ImportDemo`, không chèn ngược vào collection chính.

### 13. Demo Backup/Restore

Làm theo `09_backup_restore.md`. Chạy `mongodump`/`mongorestore` ở PowerShell, không chạy trong IntelliShell. Để an toàn, restore sang database `QLSieuThiMini_Restore` rồi so sánh số document với database gốc.

## Gợi ý trình bày giữa kỳ

1. Mở một document `HoaDon` ở JSON View, giải thích `ChiTiet` là embedded array và giá/tên là snapshot giao dịch.
2. Mở một document `KhuyenMai`, giải thích `DieuKien` thay đổi linh hoạt theo loại ưu đãi.
3. Chạy top 5 sản phẩm bán chạy để minh họa `$unwind` → `$group` → `$sort` → `$limit`.
4. Chạy doanh thu theo nhân viên để minh họa `$group` kết hợp `$lookup`.
5. Chạy `explain("executionStats")` trước/sau khi tạo index nếu muốn so sánh hiệu năng.
6. Export `HoaDon` sang JSON, import vào collection demo; sau đó backup/restore sang database mới.

## Lưu ý chạy lại

- Cách dựng lại sạch nhất: luôn chạy `01` → `02` → `03`.
- File 01 chỉ reset đúng 9 collection trong `QLSieuThiMini`, không xóa database khác.
- File 02 và 03 tự thay thế đúng các mã mẫu nên hạn chế lỗi duplicate khi chạy lại.
- File 07 có thể chạy lại vì index dùng tên/đặc tả cố định.
- File 06 làm thay đổi dữ liệu demo; `$inc` không idempotent. Chỉ chạy khi đến phần trình diễn update/delete.
- Không chạy restore có `--drop` trên database chính khi chưa kiểm tra bản backup.
