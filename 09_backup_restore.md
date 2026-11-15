# Hướng dẫn Backup/Restore trên Windows

Ví dụ giả sử MongoDB chạy tại `mongodb://localhost:27017` và thư mục backup là `D:\MongoBackup`.

> `mongodump` và `mongorestore` phải chạy trong **PowerShell/Command Prompt**, không chạy trong Studio 3T IntelliShell. Hai lệnh này thuộc bộ **MongoDB Database Tools**.

## 1. Kiểm tra công cụ

Mở PowerShell và chạy:

```powershell
where.exe mongodump
where.exe mongorestore
mongodump --version
mongorestore --version
```

Nếu Windows báo không tìm thấy lệnh, kiểm tra thư mục cài MongoDB Database Tools đã có trong biến `PATH` chưa. Có thể gọi trực tiếp file `.exe`, ví dụ:

```powershell
& "C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe" --version
```

Đường dẫn và số phiên bản `100` có thể khác trên máy. Không cần cài thêm nếu hai lệnh kiểm tra ở trên đã chạy được.

## 2. Backup toàn bộ database QLSieuThiMini

Tạo thư mục đích và backup:

```powershell
New-Item -ItemType Directory -Force "D:\MongoBackup"
mongodump --uri="mongodb://localhost:27017" --db="QLSieuThiMini" --out="D:\MongoBackup"
```

Sau khi chạy thành công, dữ liệu thường nằm tại:

```text
D:\MongoBackup\QLSieuThiMini\
├── DanhMuc.bson
├── DanhMuc.metadata.json
├── SanPham.bson
├── SanPham.metadata.json
└── ...
```

Kiểm tra nhanh trong PowerShell:

```powershell
Get-ChildItem "D:\MongoBackup\QLSieuThiMini"
```

Nên tạo thư mục backup mới cho mỗi lần chạy để tránh lẫn phiên bản. Ví dụ:

```powershell
$ThuMucBackup = "D:\MongoBackup\QLSieuThiMini_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
mongodump --uri="mongodb://localhost:27017" --db="QLSieuThiMini" --out="$ThuMucBackup"
```

## 3. Restore an toàn sang database demo khác

Cách này giữ nguyên database chính và phục hồi sang `QLSieuThiMini_Restore`, phù hợp nhất để trình bày:

```powershell
mongorestore --uri="mongodb://localhost:27017" --nsInclude="QLSieuThiMini.*" --nsFrom="QLSieuThiMini.*" --nsTo="QLSieuThiMini_Restore.*" "D:\MongoBackup"
```

Nếu đã demo restore trước đó và database `QLSieuThiMini_Restore` đang có dữ liệu, hãy chủ động xóa database demo bằng Studio 3T trước khi chạy lại, hoặc chỉ khi chắc chắn đúng database demo mới thêm `--drop`:

```powershell
mongorestore --drop --uri="mongodb://localhost:27017" --nsInclude="QLSieuThiMini.*" --nsFrom="QLSieuThiMini.*" --nsTo="QLSieuThiMini_Restore.*" "D:\MongoBackup"
```

`--drop` sẽ xóa các collection đích có trong bản backup trước khi phục hồi. Tuyệt đối kiểm tra URI và tên namespace trước khi dùng.

## 4. Restore về đúng database gốc

Chỉ dùng khi database gốc bị mất hoặc đã được làm trống có chủ đích:

```powershell
mongorestore --uri="mongodb://localhost:27017" --nsInclude="QLSieuThiMini.*" "D:\MongoBackup"
```

Nếu database gốc vẫn còn document, restore có thể gặp lỗi trùng `_id`. Tùy chọn `--drop` sẽ thay thế collection tương ứng và có tính phá hủy, vì vậy không dùng trong buổi demo nếu chưa có bản backup đã kiểm tra.

## 5. Kiểm tra sau Restore

Trong Studio 3T, nhấn **Refresh** ở Connection Tree. Mở database `QLSieuThiMini_Restore`, sau đó chạy trong IntelliShell:

```javascript
db = db.getSiblingDB("QLSieuThiMini_Restore");

db.getCollectionNames().sort();
db.SanPham.countDocuments({});     // mong đợi: 20
db.KhachHang.countDocuments({});   // mong đợi: 10
db.HoaDon.countDocuments({});      // mong đợi: 20
db.PhieuNhap.countDocuments({});   // mong đợi: 10
db.HoaDon.findOne({ MaHD: "HD001" }, { _id: 0 });
```

Kiểm tra thêm index và validation đã được phục hồi:

```javascript
db.SanPham.getIndexes();
db.getCollectionInfos({ name: "HoaDon" });
```

Tài liệu tham khảo chính thức: [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/), [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).
