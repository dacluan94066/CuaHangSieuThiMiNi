# Hướng dẫn Import/Export bằng Studio 3T

Hướng dẫn này dùng kết nối `mongodb://localhost:27017` và database `QLSieuThiMini`. Tên nút có thể chênh lệch nhẹ giữa các phiên bản Studio 3T, nhưng quy trình đều qua **Import Wizard** và **Export Wizard**.

> Nên demo JSON với collection `HoaDon` vì JSON giữ được mảng `ChiTiet`. Nên demo CSV với `SanPham` vì dữ liệu phẳng, dễ mở bằng Excel và dễ quan sát.

## 1. Export một collection sang JSON

1. Mở Studio 3T và kết nối tới `localhost:27017`.
2. Trong **Connection Tree**, mở database `QLSieuThiMini`.
3. Nhấp phải collection `HoaDon`, chọn **Export Collection** hoặc **Export**.
4. Trong Export Wizard, chọn định dạng **JSON** rồi chọn **Configure**.
5. Chọn xuất toàn bộ document. Nếu có lựa chọn kiểu JSON, ưu tiên **MongoDB Extended JSON** hoặc định dạng tương thích MongoDB để giữ kiểu `Date`.
6. Chọn đường dẫn, ví dụ `D:\MongoExport\HoaDon.json`.
7. Xem phần preview, sau đó bấm **Run/Execute**.
8. Mở file kết quả và kiểm tra một hóa đơn có đủ `MaHD`, `NgayLap`, `ChiTiet`, `TongTien`, `GiamGia`, `ThanhTien`.

## 2. Export một collection sang CSV

1. Nhấp phải collection `SanPham`, chọn **Export Collection/Export**.
2. Chọn định dạng **CSV** rồi chọn **Configure**.
3. Chọn các cột dễ trình bày: `MaSP`, `TenSP`, `MaDM`, `MaNCC`, `DonGiaNhap`, `DonGiaBan`, `SoLuongTon`, `DonViTinh`, `TrangThai`.
4. Bật tùy chọn xuất tên trường ở dòng đầu (**header row**).
5. Chọn dấu phân cách dấu phẩy hoặc dấu chấm phẩy. Nếu mở bằng Excel trên Windows và các cột không tự tách đúng, thử dấu chấm phẩy.
6. Chọn file `D:\MongoExport\SanPham.csv`, kiểm tra preview rồi bấm **Run/Execute**.

CSV không biểu diễn tự nhiên mảng/document lồng nhau. Vì vậy không nên dùng `HoaDon.ChiTiet` để demo CSV; hãy dùng `SanPham`, `DanhMuc` hoặc `KhachHang`.

## 3. Import JSON

Để không tạo dữ liệu trùng trong collection chính, hãy import vào collection mới `HoaDon_ImportDemo`.

1. Chọn database `QLSieuThiMini` trong Connection Tree.
2. Bấm **Import** trên thanh công cụ, hoặc nhấp phải database và chọn **Import (Collections, Data)**.
3. Chọn **JSON** rồi bấm **Configure**.
4. Chọn **Add source**, sau đó chọn `D:\MongoExport\HoaDon.json`.
5. Đặt **Target Database** là `QLSieuThiMini` và **Target Collection** là `HoaDon_ImportDemo`.
6. Chọn chế độ chèn dữ liệu phù hợp. Với collection demo mới, dùng chế độ insert mặc định.
7. Bật **Validate JSON before import** nếu giao diện có tùy chọn này.
8. Kiểm tra preview rồi bấm **Run**. Theo dõi tiến trình ở **Operations** pane.

## 4. Import CSV

1. Mở **Import Wizard**, chọn **CSV**, bấm **Configure**.
2. Chọn **File** và mở `D:\MongoExport\SanPham.csv`.
3. Kiểm tra đúng delimiter, text qualifier và tùy chọn dòng đầu là tên cột.
4. Trong phần ánh xạ trường, đặt kiểu:
   - `DonGiaNhap`, `DonGiaBan`, `SoLuongTon`: số nguyên hoặc số phù hợp.
   - `MaSP`, `MaDM`, `MaNCC`, `SDT`: chuỗi để không mất số 0 đầu.
   - `HanSuDung`: date nếu cột này được xuất.
5. Đặt collection đích là `SanPham_ImportDemo`.
6. Xem JSON output preview để chắc chắn kiểu dữ liệu đúng, rồi bấm **Run**.

## 5. Kiểm tra dữ liệu sau Import

Nhấn **Refresh** database, mở IntelliShell và chạy:

```javascript
db = db.getSiblingDB("QLSieuThiMini");

db.HoaDon_ImportDemo.countDocuments({});
db.HoaDon_ImportDemo.findOne({}, { _id: 0 });

db.SanPham_ImportDemo.countDocuments({});
db.SanPham_ImportDemo.find({}, { _id: 0, MaSP: 1, TenSP: 1, DonGiaBan: 1 }).limit(5);
```

Kết quả mong đợi khi export/import toàn bộ dữ liệu mẫu:

- `HoaDon_ImportDemo`: 20 document.
- `SanPham_ImportDemo`: 20 document.
- Trong JSON, `ChiTiet` vẫn là array và `NgayLap` vẫn là date nếu đã chọn Extended JSON.
- Trong CSV, các trường giá và số lượng phải là kiểu số, không phải chuỗi.

Sau buổi demo có thể xóa hai collection có hậu tố `_ImportDemo` bằng giao diện Studio 3T. Không dùng tên collection chính làm đích import nếu chưa sao lưu.

Tài liệu tham khảo: [Studio 3T Import Wizard](https://studio3t.com/knowledge-base/articles/mongodb-import-json-csv-bson/), [Studio 3T Export Wizard](https://studio3t.com/knowledge-base/articles/mongodb-export-csv-json-sql-bson/).
