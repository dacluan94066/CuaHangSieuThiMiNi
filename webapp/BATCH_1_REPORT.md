# Báo cáo Đợt 1 — Khung ứng dụng và Dashboard

Ngày: 15/11/2026. Phạm vi: Đợt 1 theo SRS v1.1 bản hiệu chỉnh đã duyệt.

## 1. Trạng thái

- **ĐÃ HOÀN THÀNH:** khung Express/mongodb, cấu hình môi trường, middleware, utils, 5 API GET, mã giao diện Dashboard; chạy server thật và kiểm tra HTTP/dữ liệu.
- **CHƯA HOÀN THÀNH:** nghiệm thu trực quan Dashboard chưa thực hiện được. Các chức năng Đợt 2–5 chưa xây dựng theo đúng điểm dừng.
- **CHƯA KIỂM CHỨNG:** render Chart.js trong trình duyệt, tương tác DOM, loading/lỗi khi thao tác trực tiếp, bố cục 375/768/1024/1440 px; sự cố mất DB và CDN từ trình duyệt; Node tối thiểu 20.19.0; trường hợp hơn 100 mốc tháng/phương thức thanh toán trên dữ liệu thật.
- Không sửa SRS; không có đề xuất thay đổi SRS trong đợt này.
- Dừng chờ người dùng kiểm tra và duyệt trước Đợt 2.

## 2. File tạo/sửa

Mọi file mới nằm trong `webapp/`. Không có file gốc nào bị sửa.

| Nhóm | File mới |
|---|---|
| Package/cấu hình | `package.json`, `package-lock.json`, `.env.example`, `.gitignore` |
| Cấu hình local, không đưa vào Git | `.env`, được sao chép từ example, không in giá trị vào log |
| Khởi động | `server.js`, `src/app.js`, `src/config.js`, `src/db.js` |
| Middleware | `src/middleware/validate.js`, `src/middleware/error-handler.js` |
| Utils | `src/utils/query.js`, `src/utils/dates.js`, `src/utils/projections.js` |
| API/service | `src/routes/api.js`, `src/services/catalog.service.js`, `src/services/dashboard.service.js` |
| Pipeline | `src/pipelines/reports.js` |
| HTML/CSS | `public/index.html`, `public/css/app.css` |
| JavaScript chung | `public/js/app.js`, `api.js`, `ui.js`, `format.js`, `charts.js` trong cùng thư mục |
| Trang đã xây dựng | `public/js/pages/dashboard.js` — chỉ có Dashboard |
| Báo cáo | `BATCH_1_REPORT.md` |
| Log chạy thử, không đưa vào Git | `runtime.log` |

`node_modules/` được sinh khi cài package và bị bỏ qua trong Git. Chưa tạo trang của đợt sau, `README_WEBAPP.md` hoặc `tests/api.test.js`.

## 3. Môi trường, phiên bản và điều kiện trước API test

| Thành phần | Kết quả thật |
|---|---|
| `node -v` | `v24.16.0` |
| `npm -v` | `11.13.0` |
| `db.version()` | `8.3.8` |
| `npm ls --depth=0` | express 5.2.1, mongodb 7.5.0, dotenv 17.2.3 |
| Chart.js | URL CDN pin `4.5.1` trong module biểu đồ; chưa kiểm chứng render trình duyệt |

Đã tìm thấy mongosh có sẵn tại:

`C:\Users\Admin\.3T_community\third-party\2025.1.0\mongosh\sh-2.4.2\mongosh.exe`

Đã dùng mongosh với `--quiet --norc`, đọc URI từ `.env` mà không in ra, thực hiện `db.version()` và `countDocuments({})` cho 9 collection. Không thực thi script 01–07.

Theo [bảng tương thích MongoDB](https://www.mongodb.com/docs/drivers/compatibility/?all-languages=nodejs&interface=driver), driver 7.3–7.5 hỗ trợ MongoDB 8.0 và driver 7.x hỗ trợ Node 24. Tài liệu nêu tương thích major bao gồm minor/patch trừ ngoại lệ. Server 8.3.8 thuộc major 8, Node thực tế 24.16.0: đủ điều kiện tiếp tục API test với driver 7.5.0 đã chốt. Không nâng/hạ phiên bản.

## 4. Đếm dữ liệu trước/sau thử nghiệm

| Collection | Chuẩn | Trước API test | Sau kiểm tra | Đối chiếu |
|---|---:|---:|---:|---|
| DanhMuc | 6 | 6 | 6 | Khớp |
| NhaCungCap | 6 | 6 | 6 | Khớp |
| SanPham | 20 | 20 | 20 | Khớp |
| KhachHang | 10 | 10 | 10 | Khớp |
| NhanVien | 6 | 6 | 6 | Khớp |
| TaiKhoan | 6 | 6 | 6 | Khớp |
| KhuyenMai | 5 | 5 | 5 | Khớp |
| HoaDon | 20 | 20 | 20 | Khớp |
| PhieuNhap | 10 | 10 | 10 | Khớp |
| **Tổng** | **89** | **89** | **89** | **Không lệch** |

Không dựng lại dữ liệu và không có thao tác ghi MongoDB.

## 5. Lệnh đã chạy và kết quả

| Lệnh/nhóm lệnh | Kết quả |
|---|---|
| `Get-FileHash ... -Algorithm SHA256` trước/sau | 10 file gốc và SRS có checksum giữ nguyên |
| `node -v`, `npm -v` | Phiên bản như mục 3 |
| mongosh `--quiet --norc ... --eval ...` | `db.version()` 8.3.8; 9 lần countDocuments khớp chuẩn; chạy lại phép đọc để đối chiếu sau |
| `npm install --ignore-scripts --no-fund` | Added 81 packages, audited 82 packages; npm báo 0 vulnerabilities tại thời điểm cài |
| `npm ls --depth=0` | Đúng 3 dependency đã pin |
| `node --check` cho 19 file JavaScript | Tất cả hợp lệ; các file sửa tiếp được kiểm tra lại |
| `npm start` | Server thật mở tại http://localhost:3000 |
| Node stdin `--input-type=module`, dùng fetch GET | 5 API smoke test đều 200 |
| Node stdin, fetch và assert | Lô chính 97 kiểm tra HTTP đạt |
| Node stdin, import `node:test` và `node:assert/strict` | 10 test hàm thuần đạt, 0 fail |
| Quét source bằng `rg` | Không có innerHTML hoặc lời gọi ghi MongoDB bị cấm trong mã ứng dụng |
| Khởi động lại bằng `npm start 2>&1 \| Tee-Object -FilePath runtime.log` | Sau sửa thông báo cấu hình; server đã chạy lại |
| 5 API smoke test sau khởi động lại | Đều 200, không có field/chuỗi nhạy cảm trong các phản hồi đã thử |
| Đối chiếu SHA-256 8 tài nguyên HTTP với file đĩa | HTML, CSS và 6 module JavaScript khớp chính xác |
| Đọc và kiểm tra `runtime.log` | Không có giá trị URI MongoDB, không có MONGO_URI hoặc banner dotenv |

Phiên server hiện giữ chạy để người dùng kiểm tra. Nếu cần chạy lại, mở PowerShell tại `webapp/` và chạy `npm start`; cấu hình local đã được tạo. Không mở thêm tiến trình cùng cổng khi server hiện vẫn đang chạy.

Các kiểm tra một lần được chạy qua stdin, không tạo bộ test API của Đợt 5 trước thời hạn. Kết quả 0 vulnerabilities là kết quả npm báo khi cài đặt, không thay thế các giới hạn phiên bản đã ghi trong SRS.

## 6. API và trang đã thử

| GET | HTTP | Kết quả thật |
|---|---:|---|
| `/api/health` | 200 | status ok, database connected, readOnly true |
| `/api/danh-muc` | 200 | 6 danh mục |
| `/api/nha-cung-cap` | 200 | 6 nhà cung cấp |
| `/api/phuong-thuc-thanh-toan` | 200 | 4 phương thức |
| `/api/dashboard` | 200 | Số liệu chi tiết bên dưới |
| `/` | 200 | HTML Dashboard shell, đúng Content-Type |
| `/css/app.css` và 6 module JS | 200 | Đúng Content-Type; nội dung HTTP khớp file đĩa |

Địa chỉ giao diện: [Dashboard](http://localhost:3000/#/dashboard). HTTP 200 và cú pháp JS hợp lệ không phải bằng chứng giao diện đã render hoặc biểu đồ đã vẽ thành công.

### Số liệu Dashboard thực tế

| Chỉ số | Giá trị |
|---|---:|
| Doanh thu thực thu | 4.400.000 ₫ |
| Tiền hàng trước giảm | 4.684.500 ₫ |
| Tổng giảm giá | 284.500 ₫ |
| Hóa đơn | 20 |
| Sản phẩm | 20 |
| Khách hàng | 10 |
| Sản phẩm tồn thấp | 3 |
| Sản phẩm hết hàng | 1 |

| Tháng | Thực thu | Số hóa đơn |
|---|---:|---:|
| 08/2026 | 744.300 ₫ | 5 |
| 09/2026 | 3.655.700 ₫ | 15 |

| Top bán chạy | Số lượng |
|---|---:|
| SP005 | 45 |
| SP011 | 42 |
| SP003 | 36 |
| SP001 | 30 |
| SP002 | 24 |

| Phương thức | Số hóa đơn | Thực thu |
|---|---:|---:|
| Tiền mặt | 6 | 853.000 ₫ |
| Chuyển khoản | 5 | 1.284.000 ₫ |
| Thẻ ngân hàng | 5 | 1.353.600 ₫ |
| Ví điện tử | 4 | 909.400 ₫ |

### Lô kiểm tra HTTP chính: 97 kiểm tra đạt

| Nhóm | Số kiểm tra | Kết quả |
|---|---:|---|
| POST/PUT/DELETE/PATCH/OPTIONS/HEAD vào /api, 5 endpoint và route API chưa có | 42 | Tất cả 405; Allow GET |
| limit=101, tham số lạ, tên tham số nhạy cảm trên cả 5 endpoint | 15 | Tất cả 400 |
| Trang/limit sai, lặp tham số, object/toán tử, prototype, từ khóa quá dài, ngày sai/đảo | 15 | Tất cả 400 |
| Phân trang danh mục/NCC/phương thức, tìm mã/tên và regex literal | 7 | Đạt |
| Dashboard toàn bộ, tháng 9, ngày Việt Nam và khoảng không có giao dịch | 4 | Đạt |
| API đợt sau và truy cập .env/package.json/src/config.js | 6 | Tất cả 404 |
| HTML/CSS/6 module JS | 8 | Tất cả 200 |

Toàn bộ phản hồi API trong lô này được kiểm tra không có `MatKhau`, `MONGO_URI` hoặc URI MongoDB, gồm cả lỗi 400/404/405. HEAD có thân phản hồi rỗng theo HTTP. Kiểm thử JSON replacer bổ sung xác nhận field mật khẩu lồng nhau bị loại.

- Danh mục page=1/limit=2 trả 2 dòng, total=6; page=2 bắt đầu DM03; trang vượt dữ liệu trả rỗng nhưng total vẫn 6.
- Tìm `đồ uống` trả DM01; tìm `.*` trả rỗng, không biến thành regex khớp mọi thứ.
- Khoảng 01–30/09/2026 trả 15 hóa đơn, doanh thu 3.655.700 ₫.
- Ngày 06/09/2026 theo Việt Nam trả 1 hóa đơn, 309.000 ₫; đây là HD009 lưu 05/09 lúc 18:20Z, chứng minh bộ lọc không dùng ngày UTC thay cho Việt Nam.
- Khoảng tháng 01/2030 trả doanh thu và hóa đơn bằng 0, các danh sách giao dịch rỗng; số sản phẩm/khách hiện tại vẫn giữ 20/10.

### 10 unit test bằng node:test: 10 đạt, 0 fail

1. Ranh giới ngày Việt Nam và chuyển tháng qua năm.
2. Ngày sai, ngày nhuận và khoảng đảo.
3. Validation phân trang/lặp/lạ/object/prototype.
4. Escape regex.
5. Trạng thái KM theo BSON, bao gồm đúng hai đầu, vượt 1 ms và sang ngày UTC kế tiếp.
6. Formatter UTC của NgayKetThuc: KM001 là 30/09/2026.
7. Tồn kho 0/1/19/20 và dữ liệu sai.
8. Hạn dùng hôm qua/hôm nay/+30/+31 và thiếu hạn.
9. JSON loại field nhạy cảm lồng nhau.
10. Lỗi nội bộ/DB không trả message hoặc thông tin gốc.

Các ca biên dùng dữ liệu trong bộ nhớ; không ghi dữ liệu test vào MongoDB. Unit test mapping lỗi DB không được tính là đã gây và kiểm tra mất kết nối trên DB thật.

## 7. Lỗi/giới hạn và cách xử lý

| Vấn đề | Xử lý và trạng thái |
|---|---|
| Lần liệt kê listener đầu không hiển thị MongoDB | Kiểm tra lại dịch vụ/process/listener; MongoDB đang chạy; dùng mongosh thật để xác nhận 8.3.8. Không cần thay đổi dịch vụ hoặc DB. |
| Liên kết Đến nội dung chính có thể abort tải Dashboard | Sửa để chuyển focus, không hủy router/tải hiện tại; kiểm tra lại cú pháp và tài nguyên phục vụ HTTP. Tương tác trực quan chưa kiểm chứng. |
| Thông báo startup ban đầu chưa nêu rõ biến cấu hình lỗi | Thêm CONFIG_ERROR với thông báo an toàn; không in giá trị URI; restart server và 5 API đều 200. |
| Công cụ Computer Use không xác định được URL Chrome trên Windows để thực thi chính sách | Công cụ tự dừng; không tiếp tục thao tác UI và không dùng cách khác để vượt chốt. Chỉ tiếp tục kiểm tra HTTP/source/DB không qua UI; báo rõ chưa kiểm chứng giao diện. |
| Lệnh rg trả exit code 1 khi không có kết quả | Đó là quy ước không tìm thấy, không phải unit test thất bại; kiểm tra cuối chuẩn hóa nhánh không có kết quả thành thành công. |
| Chưa lưu bộ test API chính thức | Theo kế hoạch Đợt 5; đợt này đã chạy các kiểm tra một lần và ghi kết quả thật. |

## 8. SHA-256 sau khi làm

Đã tính trước và sau, đối chiếu từng file: cả 10 file gốc không thay đổi.

| File | SHA-256 sau cùng | So với trước |
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

## 9. Điểm dừng

Chưa làm Đợt 2. Cần người dùng xem Dashboard, xem giới hạn kiểm chứng và duyệt trước khi tiếp tục Sản phẩm + Cảnh báo kho.

