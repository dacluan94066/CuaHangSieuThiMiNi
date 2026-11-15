# Báo cáo Đợt 2 — Sản phẩm và Cảnh báo kho

Ngày: 15/11/2026. Cơ sở: SRS v1.1 bản hiệu chỉnh và Đợt 1 đã được duyệt.

## 1. Trạng thái và điểm dừng

- **ĐÃ HOÀN THÀNH:** code 3 API, trang danh sách/chi tiết sản phẩm và cảnh báo kho; unit test, kiểm tra HTTP thật, đối chiếu countDocuments, kiểm tra pipeline thiếu tham chiếu và nhiều nhãn bằng dữ liệu giả không ghi DB.
- **CHƯA HOÀN THÀNH:** nghiệm thu trực quan các trang mới cần người dùng kiểm tra; Đợt 3 và các đợt sau chưa thực hiện đúng theo phạm vi.
- **CHƯA KIỂM CHỨNG:** chưa mở trình duyệt thật để xem các trang Đợt 2; chưa kiểm chứng render, CSS responsive, thao tác bàn phím/chuột, Back/Forward, debounce, chọn bộ lọc, chuyển trang, loading/lỗi trực tiếp trong trình duyệt.
- Chỉ HTTP 200, nội dung tài nguyên khớp file và JavaScript đúng cú pháp không chứng minh UI chạy tốt.
- Không sửa SRS, không đổi kiến trúc hoặc phiên bản dependency, không chạy 01–07, không tạo/sửa/xóa dữ liệu.
- Dừng chờ duyệt, chưa chuyển Đợt 3.

Server hiện chạy tại [ứng dụng local](http://localhost:3000/#/san-pham). Các địa chỉ cần người dùng xem:
- [Sản phẩm](http://localhost:3000/#/san-pham)
- [Chi tiết SP001](http://localhost:3000/#/san-pham/SP001)
- [Cảnh báo kho](http://localhost:3000/#/canh-bao-kho)

## 2. File đã tạo/sửa

Tất cả thay đổi ứng dụng nằm trong `webapp/`.

| Loại | File | Nội dung |
|---|---|---|
| Tạo | `src/services/products.service.js` | Bộ lọc, sort, danh sách, chi tiết và nhãn trạng thái sản phẩm |
| Tạo | `src/services/inventory.service.js` | OR các cảnh báo, lọc hạn dùng theo ngày Việt Nam |
| Tạo | `src/pipelines/joins.js` | Lookup danh mục/NCC; giữ sản phẩm thiếu tham chiếu |
| Tạo | `public/js/pages/products.js` | Trang danh sách và chi tiết sản phẩm |
| Tạo | `public/js/pages/inventory.js` | Trang cảnh báo kho |
| Tạo | `tests/products-inventory.test.js` | 27 unit test bằng node:test |
| Tạo | `BATCH_2_REPORT.md` | Báo cáo này |
| Sửa | `src/middleware/validate.js` | Mã, giá, enum và kiểm tra khoảng giá |
| Sửa | `src/middleware/error-handler.js` | Không phản chiếu nội dung lỗi URL 400 ngoài validator |
| Sửa | `src/utils/dates.js` | Mốc đầu ngày Việt Nam và đầu ngày +31 |
| Sửa | `src/utils/projections.js` | Danh sách field sản phẩm được phép trả |
| Sửa | `src/routes/api.js` | Thêm đúng 3 API Đợt 2 |
| Sửa | `public/js/ui.js` | Phân trang, badge, cập nhật query hash và trạng thái kết nối |
| Sửa | `public/js/app.js` | Router các trang mới, active menu và breadcrumb |
| Sửa | `public/index.html` | Mở menu Sản phẩm và Cảnh báo kho; giữ mục đợt sau vô hiệu hóa |
| Sửa | `public/css/app.css` | Bảng, bộ lọc, badge, chi tiết và bố cục responsive |
| Sửa | `package.json` | Thêm script test:unit; giữ nguyên dependency |
| Sinh thêm nội dung | `runtime.log` | Log restart server; bị bỏ qua trong Git |

Không sửa `package-lock.json`, `.env`, SRS hoặc các file gốc. Không tạo `tests/api.test.js` và không làm trước trang/API của Đợt 3–5.

## 3. Hành vi đã triển khai

### Sản phẩm

- GET `/api/san-pham`: q, maDM, maNCC, giaTu/giaDen, tonKho, sort, page, limit.
- GET `/api/san-pham/:maSP`: xác thực mã, trả 404 khi không có; tham số query lạ trả 400.
- Tìm kiếm tên/mã theo văn bản đã escape regex, không nhận filter/pipeline MongoDB từ client.
- Còn hàng là >0; tồn thấp 1–19; hết hàng =0.
- Năm kiểu sort có `MaSP:1` và `_id:1` làm tiêu chí phụ ổn định; không thay đổi mã phụ thành giảm dần khi giá giảm.
- Lookup lấy tên danh mục và NCC bằng projection cho phép, không lấy field mật khẩu.
- Không unwind kết quả lookup; dùng giá trị đầu tiên và fallback để mỗi nguồn vẫn một dòng.
- Thiếu liên kết trả thông báo Không tìm thấy thông tin liên kết và mảng `ThamChieuThieu`.
- Giữ trạng thái gốc; thêm `TrangThaiTon`, `TrangThaiHanSuDung`, `CanhBao`.
- Frontend có tìm kiếm chờ 300 ms, bộ lọc, thứ tự sắp xếp, lựa chọn số dòng, trang trước/sau và chi tiết; đây là mô tả code, chưa xác nhận tương tác trình duyệt.

### Cảnh báo kho

- GET `/api/canh-bao-kho`: loai, q, page, limit.
- `tat-ca` là hợp các sản phẩm có ít nhất một cảnh báo, không phải toàn bộ sản phẩm.
- Nhóm hết hàng/tồn thấp dựa trên SoLuongTon hiện có, không suy ra từ nhập/bán.
- Hết hạn: HSD trước đầu ngày hiện tại ở Việt Nam.
- Sắp hết hạn: HSD từ đầu hôm nay đến trước đầu ngày +31 ở Việt Nam, bao gồm trọn ngày +30.
- Thiếu HSD có trạng thái Chưa có hạn sử dụng; không tự coi là hết hạn.
- Một sản phẩm có thể có nhiều badge nhưng chỉ một dòng trong Tất cả.
- API chụp một thời điểm server dùng chung cho lọc và tính nhãn; không có tham số client để thay đổi thời gian.
- Thời gian giả lập chỉ dùng trong test, không thay đổi đồng hồ hoặc DB.

## 4. Lệnh đã chạy và kết quả thật

| Lệnh/nhóm lệnh | Kết quả |
|---|---|
| Get-FileHash -Algorithm SHA256 trước/sau | 10 file gốc và SRS giữ nguyên |
| Script Node stdin, loadConfig + countDocuments | 9 collection khớp chuẩn trước/sau |
| Tìm kiếm hướng dẫn UI/UX cho bảng/lọc/phân trang | Áp dụng vùng cuộn ngang cho bảng; không phát sinh framework hoặc dependency |
| npm run test:unit | Lần cuối 27 test đạt, 0 fail |
| node --check | 25 file JS gồm server.js hợp lệ |
| npm ls --depth=0 | express 5.2.1, mongodb 7.5.0, dotenv 17.2.3 |
| npm start qua Tee-Object runtime.log -Append | Server thật chạy trên cổng 3000; restart để nạp route và xử lý lỗi mới |
| Script fetch smoke cho 3 API | Cả 3 trả 200, không có MatKhau |
| Script Node stdin: fetch + assert + mongodb driver | Lô chính 120 HTTP check đạt |
| find/countDocuments độc lập với builder API | 15 bộ lọc sản phẩm, 5 kiểu sort và 5 nhóm cảnh báo khớp |
| Database-level aggregate với dữ liệu giả qua $documents | 6 phép thử pipeline đạt; không tạo collection hoặc lưu document |
| So SHA-256 nội dung 6 tài nguyên HTTP với file đĩa | Tất cả khớp |
| Quét source bằng rg | Không có innerHTML hoặc lời gọi ghi MongoDB bị cấm |
| Đọc runtime.log | Không có URI MongoDB hoặc MONGO_URI |

Không cài thêm package. Những lần dừng server chỉ nhắm PID node đang phục vụ ứng dụng tại cổng 3000, không dừng MongoDB.

## 5. API và đối chiếu countDocuments

### 5.1. Các bộ lọc sản phẩm

Mỗi API trả HTTP 200; pagination.total và danh sách mã được so với truy vấn countDocuments/find độc lập.

| Bộ lọc | API total | countDocuments | Kết quả |
|---|---:|---:|---|
| Không lọc | 20 | 20 | Khớp |
| q=SP005 | 1 | 1 | Khớp |
| q=sữa | 3 | 3 | Khớp |
| q=.* (văn bản) | 0 | 0 | Khớp |
| q=( (văn bản) | 0 | 0 | Khớp |
| maDM=DM01 | 4 | 4 | Khớp |
| maNCC=NCC05 | 3 | 3 | Khớp |
| giaTu=10000, giaDen=30000 | 8 | 8 | Khớp |
| giaTu=0, giaDen=0 | 0 | 0 | Khớp |
| tonKho=con-hang | 19 | 19 | Khớp |
| tonKho=ton-thap | 3 | 3 | Khớp |
| tonKho=het-hang | 1 | 1 | Khớp |
| DM01 + NCC01 + giá 5000–10000 + còn hàng | 2 | 2 | Khớp |
| maDM=DM_NOT_EXIST | 0 | 0 | Khớp |
| maNCC=NCC_NOT_EXIST | 0 | 0 | Khớp |

### 5.2. Sort

Đã so toàn bộ 20 mã theo thứ tự với find().sort() độc lập.

| Sort | Đầu danh sách | Cuối danh sách | Kết quả |
|---|---|---|---|
| `ma-tang` | SP001 | SP020 | Khớp danh sách DB đã sắp xếp |
| `gia-tang` | SP005 | SP019 | Khớp danh sách DB đã sắp xếp |
| `gia-giam` | SP019 | SP005 | Khớp danh sách DB đã sắp xếp |
| `ton-tang` | SP020 | SP005 | Khớp danh sách DB đã sắp xếp |
| `ton-giam` | SP005 | SP020 | Khớp danh sách DB đã sắp xếp |

Ca đồng giá 10.000 ₫: với cả gia-tang và gia-giam, page=1/limit=1 trả SP001, page=2/limit=1 trả SP002. Trang vượt dữ liệu trả danh sách rỗng nhưng total vẫn 20.

### 5.3. Chi tiết

- Đã gọi GET chi tiết đủ **20/20 sản phẩm**, HTTP 200.
- So giá, tồn và tên danh mục/NCC với dữ liệu nguồn đọc độc lập.
- SP001: Đồ uống; Công ty Coca-Cola Việt Nam; giá bán 10.000 ₫; tồn 120 lon.
- Mã SP_NOT_EXIST trả 404.
- Mã sai định dạng, quá 50 ký tự, query lạ và URL mã hóa sai trả 400.

### 5.4. Cảnh báo kho thực tế

Đối chiếu theo ngày 15/11/2026 tại Việt Nam. Các mốc độc lập cho countDocuments được suy ra bằng Intl timezone Việt Nam từ updatedAt của API.

| Nhóm | API total | countDocuments | Mã sản phẩm |
|---|---:|---:|---|
| `tat-ca` | 4 | 4 | SP010, SP018, SP019, SP020 |
| `het-hang` | 1 | 1 | SP020 |
| `ton-thap` | 3 | 3 | SP010, SP018, SP019 |
| `het-han` | 0 | 0 | Không có |
| `sap-het-han` | 0 | 0 | Không có |

Cả 4 dòng trong Tất cả là mã duy nhất. Regex literal `.*` và `(` trả 0, khớp countDocuments. Trang 2 với limit=2 trả 2 dòng, total=4.

Không có sản phẩm hết hạn/sắp hết hạn tại thời điểm này: hạn sớm nhất của bộ dữ liệu hiện tại là 05/01/2027, nằm ngoài cửa sổ đến hết 15/12/2026. Không tạo dữ liệu lỗi/hết hạn trong DB để ép kết quả khác 0.

### 5.5. Tổng hợp lô chính: 120 kiểm tra HTTP

| Nhóm | Số kiểm tra |
|---|---:|
| Bộ lọc sản phẩm | 15 |
| Sort và phân trang đồng giá | 9 |
| Phân trang sản phẩm/cảnh báo | 2 |
| Chi tiết 20 sản phẩm và mã không tồn tại | 21 |
| Cảnh báo mặc định/5 nhóm/regex | 8 |
| Tham số sai, lạ, lặp, object, giá, mã và URL lỗi | 27 |
| POST/PUT/DELETE/HEAD/OPTIONS/PATCH trên 3 route | 18 |
| Hồi quy 5 API Đợt 1 | 5 |
| Route đợt sau và tài nguyên riêng tư | 9 |
| HTML/CSS/router/ui/2 module mới | 6 |
| **Tổng** | **120** |

- Mọi phản hồi API trong lô được kiểm tra không có MatKhau, MONGO_URI hoặc URI MongoDB.
- Method ngoài GET trả 405, Allow GET; HEAD có thân rỗng theo HTTP.
- API danh sách/cảnh báo vẫn từ chối limit=101, tham số lạ/lặp/toán tử và enum không hợp lệ.
- API Đợt 3–5 chưa mở, vẫn 404.
- 5 API Đợt 1 còn trả 200 sau thay đổi.

## 6. Kiểm thử ca biên không ghi DB

### 6.1. Unit test — node:test

File: `tests/products-inventory.test.js`. Chạy lại bằng `npm run test:unit`.

Lần cuối: **27 test, 27 pass, 0 fail**. Thời điểm giả lập 15/11/2026, không thay đổi đồng hồ hệ thống.

- Hạn dùng hôm qua, hôm nay, +30, +31, undefined và null.
- Đúng ranh giới UTC tương ứng nửa đêm Việt Nam và cuối ngày +30.
- Tồn 0/1/19/20.
- Regex literal: .*, (, ), [abc], ^SP, a+b và dấu gạch chéo ngược.
- Sản phẩm có hai nhãn và thiếu HSD.
- Kết hợp các bộ lọc, validate mã/giá/enum/tham số lạ.
- Năm kiểu sort có mã phụ.
- OR các nhóm cảnh báo và projection lookup không unwind.
- Lỗi URL 400 không phản chiếu thông tin đầu vào.

### 6.2. Pipeline với document giả trong bộ nhớ

Đã dùng [stage $documents chính thức của MongoDB](https://www.mongodb.com/docs/manual/reference/operator/aggregation/documents/) để đưa 8 document giả vào database-level aggregation, không tạo test collection và không insert vào database.

Kết quả **6 phép thử đạt**:

1. Qua lookup, cả 8 sản phẩm giả có danh mục/NCC không tồn tại vẫn được giữ lại. Có đúng 2 mã tham chiếu thiếu, NCC=null và thông báo fallback. Field MatKhau giả bị projection loại.
2. Tất cả cảnh báo: MEM01, MEM02, MEM03, MEM06, MEM07 — mỗi mã một lần.
3. Hết hàng: MEM02.
4. Tồn thấp: MEM01, MEM06.
5. Hết hạn: MEM03.
6. Sắp hết hạn: MEM01, MEM06, MEM07.

MEM01 có hai nhãn Tồn thấp và Sắp hết hạn nhưng chỉ một dòng. MEM02 thiếu HSD, có nhãn Hết hàng và hiển thị trạng thái Chưa có hạn sử dụng. Các fixture chỉ tồn tại trong bộ nhớ và pipeline đọc; không có bản ghi giả trong 9 collection.

Đây là kiểm tra pipeline trên MongoDB bằng fixture, không được mô tả thành đã có/đã thử API trên document lỗi thật trong collection.

## 7. Đếm 9 collection trước/sau

| Collection | Trước | Sau | So với chuẩn |
|---|---:|---:|---|
| DanhMuc | 6 | 6 | Khớp chuẩn |
| NhaCungCap | 6 | 6 | Khớp chuẩn |
| SanPham | 20 | 20 | Khớp chuẩn |
| KhachHang | 10 | 10 | Khớp chuẩn |
| NhanVien | 6 | 6 | Khớp chuẩn |
| TaiKhoan | 6 | 6 | Khớp chuẩn |
| KhuyenMai | 5 | 5 | Khớp chuẩn |
| HoaDon | 20 | 20 | Khớp chuẩn |
| PhieuNhap | 10 | 10 | Khớp chuẩn |

Tổng 89 document, không lệch. Không dựng lại dữ liệu.

## 8. Vấn đề phát hiện và xử lý

| Vấn đề | Cách xử lý | Kiểm chứng |
|---|---|---|
| Lỗi giải mã URL 400 có thể phản chiếu đường dẫn đầu vào | Chỉ dùng thông báo chi tiết từ INVALID_QUERY do validator tạo; lỗi 400 khác dùng thông báo chung an toàn | Unit test và GET URL lỗi có chuỗi nhạy cảm trả 400, không phản chiếu |
| CSS cũ thu nhỏ chữ nút heading trên mobile có thể ảnh hưởng link ở trang chi tiết | Thêm override riêng cho detail-heading | Source/cú pháp đã kiểm tra; chưa xem trình duyệt thật |
| Thiếu fixture vật lý cho sản phẩm mất tham chiếu/hết hạn/nhiều nhãn | Dùng unit test và $documents, không ghi fixture vào DB | 27 unit test và 6 phép thử aggregation đạt |
| Giao diện chưa được quan sát trực tiếp | Ghi rõ giới hạn, cung cấp URL để người dùng kiểm tra | CHƯA KIỂM CHỨNG UI |

Không phát sinh lỗi trong lô HTTP chính sau các chỉnh sửa. Không có đề xuất đổi SRS trong đợt này.

## 9. SHA-256 của 10 file gốc sau khi làm

Đã so với checksum trước Đợt 2: không file nào thay đổi.

| File | SHA-256 | Đối chiếu |
|---|---|---|
| `01_create_database.js` | `01FAF2485886D4EC9D0C4EF44D616B0256D1DB07E6142C7730D059A33549B730` | Giữ nguyên |
| `02_insert_master_data.js` | `83B69C1EB351FCB0A704E7D9DD1E93EC63AF24705DBD1DC5E0ACB7765186045E` | Giữ nguyên |
| `03_insert_transactions.js` | `6EC914626B310B5662377F88F12170298038CC2B2C4DF2C0B154322593825663` | Giữ nguyên |
| `04_basic_queries.js` | `A242945B130961B30C5FB73855DD417CC4DC8D615E7725301743A3BB97872449` | Giữ nguyên |
| `05_advanced_queries.js` | `A786B86F3104F0068BFAA394BC0642A66570A1F32CB8A19DCDC2331C954DD570` | Giữ nguyên |
| `06_update_delete_queries.js` | `11B71AD7BF521A3DEE54BF369E0F7C9015C809E9B7572963162A39B703AB5838` | Giữ nguyên |
| `07_indexes.js` | `5A3FF221B6A9A61DAAE089400276552D0928B01BF04094FEDDE5AB57ECACCDA4` | Giữ nguyên |
| `08_import_export.md` | `8AE3C037BD887D222E92AA086AE4F01AFA6F4C7C5D006A37AE814DB313E8B2E2` | Giữ nguyên |
| `09_backup_restore.md` | `4206C53F5AF686B1162AC4D07A9A24D7DBB58BA42B5EC72DF2B77939BF885938` | Giữ nguyên |
| `README.md` | `F9DAB63CCED817FDBBD4041A267ADBC6E6E2E0030A4C014CADFA8634857E3C52` | Giữ nguyên |

SRS.md cũng giữ nguyên: `0A18A8E680D217D8C8448DCE3FE84CE594382D6A3B8DE9A17D2CEF8AF1B32B89`.

## 10. Chờ duyệt

Chưa bắt đầu Đợt 3. Đề nghị người dùng xem trang Sản phẩm, SP001 và Cảnh báo kho trong trình duyệt, sau đó xác nhận trước khi tiếp tục.

