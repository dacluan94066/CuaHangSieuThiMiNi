# Báo cáo Đợt 3 — Hóa đơn, Phiếu nhập và Khách hàng

Ngày: 15/11/2026. Cơ sở: SRS v1.1 bản hiệu chỉnh; Đợt 1 và Đợt 2 đã được người dùng duyệt.

## 1. Trạng thái

- **ĐÃ HOÀN THÀNH:** code 6 API và 6 màn hình danh sách/chi tiết trong phạm vi; gợi ý tìm kiếm cho trang mới và Sản phẩm; unit test, API thật, đối chiếu dữ liệu và pipeline đọc với fixture trong bộ nhớ.
- **CHƯA HOÀN THÀNH:** nghiệm thu trực quan các trang mới cần người dùng kiểm tra. Chưa làm Đợt 4/5 theo đúng điểm dừng.
- **CHƯA KIỂM CHỨNG:** chưa mở trình duyệt thật để xem Đợt 3, nên chưa xác nhận render, responsive, thao tác lọc/phân trang, debounce, Back/Forward, loading/lỗi, liên kết khách–hóa đơn hoặc bố cục ngày kết thúc KM.
- HTTP 200, mã JS hợp lệ và tài nguyên khớp file đĩa không phải bằng chứng UI chạy tốt.
- Không sửa SRS, không đổi dependency hoặc kiến trúc, không chạy 01–07, không ghi dữ liệu MongoDB.

Các URL hiện phục vụ để người dùng kiểm tra:

- [Hóa đơn](http://localhost:3000/#/hoa-don)
- [HD009 và KM002](http://localhost:3000/#/hoa-don/HD009)
- [HD001 không có mã KM](http://localhost:3000/#/hoa-don/HD001)
- [Phiếu nhập](http://localhost:3000/#/phieu-nhap)
- [PN001](http://localhost:3000/#/phieu-nhap/PN001)
- [Khách hàng](http://localhost:3000/#/khach-hang)
- [Hồ sơ KH001 và lịch sử mua](http://localhost:3000/#/khach-hang/KH001)

## 2. Danh sách file tạo/sửa

Mọi thay đổi nằm trong `webapp/`.

| Loại | File | Nội dung |
|---|---|---|
| Tạo | `src/services/invoices.service.js` | Lọc hóa đơn, thứ tự, chi tiết và trạng thái KM |
| Tạo | `src/services/purchases.service.js` | Lọc/chi tiết phiếu nhập, giữ snapshot |
| Tạo | `src/services/customers.service.js` | Tìm khách, hồ sơ và thống kê thực thu/lượt mua |
| Tạo | `public/js/pages/invoices.js` | Danh sách và chi tiết hóa đơn |
| Tạo | `public/js/pages/purchases.js` | Danh sách và chi tiết phiếu nhập |
| Tạo | `public/js/pages/customers.js` | Danh sách, hồ sơ và lịch sử hóa đơn |
| Tạo | `tests/transactions-customers.test.js` | 17 unit test mới, dùng node:test |
| Tạo | `BATCH_3_REPORT.md` | Báo cáo này |
| Sửa | `src/middleware/validate.js` | Bộ lọc mã, phương thức và ngưỡng thực thu cho API mới |
| Sửa | `src/utils/projections.js` | Field cho phép của giao dịch/khách và đối tượng liên kết |
| Sửa | `src/pipelines/joins.js` | Lookup khách, NV, NCC, KM; không unwind giao dịch |
| Sửa | `src/routes/api.js` | Thêm đúng 6 endpoint |
| Sửa | `public/js/ui.js` | Danh sách DOM dùng chung, gợi ý tìm kiếm, chi tiết và badge KM |
| Sửa | `public/js/pages/products.js` | Chỉ bổ sung gợi ý tìm kiếm và thông báo rỗng theo từ khóa |
| Sửa | `public/js/app.js` | Router, breadcrumb và active menu cho trang mới |
| Sửa | `public/index.html` | Mở 3 mục menu trong phạm vi; giữ mục đợt sau vô hiệu hóa |
| Sửa | `public/css/app.css` | Gợi ý nhập, bộ lọc, bảng chi tiết và thẻ thống kê |
| Sửa | `package.json` | Thêm file unit test mới vào test:unit; không đổi dependency |
| Ghi thêm log | `runtime.log` | Khởi động lại server để nạp route; file bị bỏ qua trong Git |

Không sửa `SRS.md`, `package-lock.json`, `.env`, các file 01–09 hoặc README gốc. Không tạo API nhân viên/khuyến mãi/báo cáo/kiểm tra dữ liệu của đợt sau. Không tạo bộ `tests/api.test.js` của Đợt 5.

## 3. Các API và hành vi

| Method | Endpoint | Tham số |
|---|---|---|
| GET | `/api/hoa-don` | q, from, to, maKH, maNV, thanhToan, thucThuTren, page, limit |
| GET | `/api/hoa-don/:maHD` | Mã đường dẫn; không nhận query ngoài hợp đồng |
| GET | `/api/phieu-nhap` | q, from, to, maNCC, maNV, page, limit |
| GET | `/api/phieu-nhap/:maPN` | Mã đường dẫn |
| GET | `/api/khach-hang` | q, page, limit |
| GET | `/api/khach-hang/:maKH` | Mã đường dẫn |

### 3.1. Hóa đơn

- q tìm MaHD, không tìm tên khách/NV; tên các bên dùng lookup.
- from/to gồm trọn ngày Việt Nam theo BR-06.
- thucThuTren dùng `ThanhTien > ngưỡng`, không dùng >= và không dùng TongTien.
- Mặc định `NgayLap:-1, MaHD:1, _id:1`.
- Giữ hóa đơn khi thiếu khách/NV; chi tiết còn giữ khi thiếu KM. Có fallback và ThamChieuThieu.
- ChiTiet trả đúng tên, số lượng, đơn giá và thành tiền đã lưu; không lookup sản phẩm để thay tên/giá.
- Chi tiết có TongTien, GiamGia, ThanhTien và thông tin KM nếu có.
- KM có trạng thái gốc, trạng thái tại thời điểm server và trạng thái tại ngày lập hóa đơn. So sánh trực tiếp khoảng BSON bao gồm hai đầu.
- NgayKetThuc vẫn là thời điểm ISO gốc trong API; formatter UI riêng lấy ngày UTC với nhãn Ngày kết thúc (UTC).

### 3.2. Phiếu nhập

- q tìm MaPN; lọc NgayNhap, NCC, nhân viên.
- Mặc định `NgayNhap:-1, MaPN:1, _id:1`.
- Lookup NCC/NV không làm mất phiếu khi tham chiếu thiếu.
- Dòng hàng lấy TenSP/DonGiaNhap từ snapshot ChiTiet.
- Không cập nhật hoặc suy ra tồn kho.

### 3.3. Khách hàng

- q tìm MaKH, HoTen hoặc SDT; giữ số 0 đầu của SDT.
- Hồ sơ có ThongKe.SoLanMua và ThongKe.TongChiTieu; dùng số hóa đơn và tổng ThanhTien trên toàn bộ lịch sử.
- DiemTichLuy lấy nguyên giá trị DB, không tính lại.
- Lịch sử mua dùng lại `/api/hoa-don?maKH=...`, có page/limit.
- Nhân viên trong bộ lọc giao dịch dùng ô nhập mã; không mở API nhân viên của Đợt 4.

### 3.4. Gợi ý tìm kiếm

| Trang | Gợi ý |
|---|---|
| Sản phẩm | Tìm theo mã hoặc tên sản phẩm. |
| Hóa đơn | Tìm theo mã hóa đơn, ví dụ HD009. |
| Phiếu nhập | Tìm theo mã phiếu nhập, ví dụ PN001. |
| Khách hàng | Tìm theo mã, họ tên hoặc số điện thoại khách hàng. |

Có mô tả dưới ô tìm kiếm và aria-describedby. Nếu từ khóa khác rỗng nhưng không có kết quả, thông báo nêu lại trường tìm được và gợi ý thử từ khóa khác/đặt lại bộ lọc. Không thay đổi hành vi API sản phẩm. Kiểm tra phần chuỗi thông báo bằng unit test; chưa kiểm tra trực quan trong trình duyệt.

## 4. Lệnh đã chạy và kết quả

| Lệnh/nhóm lệnh | Kết quả thật |
|---|---|
| Get-FileHash -Algorithm SHA256 trước/sau | 10 file gốc và SRS giữ nguyên |
| Node stdin đọc countDocuments và aggregate tổng thực thu | Trước triển khai: HD20, PN10, KH10; tổng thực thu 4.400.000 ₫ |
| Tìm hướng dẫn UI/UX cho search empty state | Dùng gợi ý trường tìm và thông báo rỗng; không thêm thư viện UI |
| npm run test:unit | 44 test, 44 pass, 0 fail: 27 hồi quy + 17 mới |
| node --check | 32 file JS gồm server.js hợp lệ |
| npm ls --depth=0 | express 5.2.1, mongodb 7.5.0, dotenv 17.2.3 |
| npm start qua Tee-Object runtime.log -Append | Server thật trên localhost:3000; chỉ restart process ứng dụng |
| Node fetch smoke 6 endpoint | Tất cả 200; không MatKhau hoặc URI MongoDB |
| Node fetch/assert + mongodb driver | Lô chính 214 HTTP check đạt |
| find/countDocuments/aggregate đối chiếu độc lập | 36 bộ lọc, 40 chi tiết, tổng khách và lịch sử khớp DB |
| aggregate với $documents trong bộ nhớ | 11 phép thử ca biên/thiếu tham chiếu/snapshot/khách chưa mua đạt |
| SHA-256 tài nguyên HTTP so file đĩa | 8 tài nguyên khớp |
| rg quét source | Không có innerHTML hoặc lời gọi ghi MongoDB bị cấm |
| Kiểm tra runtime.log | Không có MONGO_URI hoặc URI MongoDB |

Không chạy npm install vì không đổi dependency. Các kiểm tra HTTP một lần chạy qua stdin; unit test mới được lưu trong tests/. Chưa chạy kiểm thử trình duyệt.

## 5. Đối chiếu bộ lọc với dữ liệu thật

| Collection | Bộ lọc | API total | countDocuments |
|---|---|---:|---:|
| HoaDon | Không lọc | 20 | 20 |
| HoaDon | Tìm mã | 1 | 1 |
| HoaDon | q=.* (văn bản) | 0 | 0 |
| HoaDon | q=( (văn bản) | 0 | 0 |
| HoaDon | q=Nguyễn; hóa đơn chỉ tìm mã | 0 | 0 |
| HoaDon | 01–30/09/2026 theo giờ Việt Nam | 15 | 15 |
| HoaDon | Ngày 05/09/2026 Việt Nam | 0 | 0 |
| HoaDon | Ngày 06/09/2026 Việt Nam | 1 | 1 |
| HoaDon | maKH=KH001 | 2 | 2 |
| HoaDon | NV002 cho hóa đơn / NV004 cho phiếu nhập | 10 | 10 |
| HoaDon | thanhToan=Tiền mặt | 6 | 6 |
| HoaDon | thucThuTren=300000 | 5 | 5 |
| HoaDon | q=HD009, thucThuTren=309000 | 0 | 0 |
| HoaDon | q=HD009, thucThuTren=308999 | 1 | 1 |
| HoaDon | thucThuTren=0 | 20 | 20 |
| HoaDon | from=2026-09-01 | 15 | 15 |
| HoaDon | to=2026-08-31 | 5 | 5 |
| HoaDon | Kết hợp nhiều bộ lọc | 1 | 1 |
| HoaDon | Mã KH không tồn tại | 0 | 0 |
| HoaDon | Mã NV không tồn tại | 0 | 0 |
| PhieuNhap | Không lọc | 10 | 10 |
| PhieuNhap | Tìm mã | 1 | 1 |
| PhieuNhap | q=.* (văn bản) | 0 | 0 |
| PhieuNhap | q=( (văn bản) | 0 | 0 |
| PhieuNhap | 01–30/09/2026 theo giờ Việt Nam | 4 | 4 |
| PhieuNhap | maNCC=NCC06 | 4 | 4 |
| PhieuNhap | NV002 cho hóa đơn / NV004 cho phiếu nhập | 8 | 8 |
| PhieuNhap | Kết hợp nhiều bộ lọc | 2 | 2 |
| PhieuNhap | from=2026-09-01 | 4 | 4 |
| PhieuNhap | to=2026-08-31 | 6 | 6 |
| KhachHang | Không lọc | 10 | 10 |
| KhachHang | Tìm mã | 1 | 1 |
| KhachHang | Tên Nguyễn Minh Anh | 1 | 1 |
| KhachHang | SDT 0901000003 | 1 | 1 |
| KhachHang | q=.* (văn bản) | 0 | 0 |
| KhachHang | q=( (văn bản) | 0 | 0 |

Các danh sách mã cũng được đối chiếu với find().sort() độc lập, không chỉ đối chiếu số lượng.

- Ngày 05/09/2026 Việt Nam không chứa HD009; ngày 06/09 chứa HD009 vì thời điểm lưu là 05/09 lúc 18:20Z.
- Ngưỡng 309.000 ₫ loại HD009 có ThanhTien đúng 309.000; ngưỡng 308.999 ₫ lấy HD009.
- Ngưỡng 0 vẫn áp dụng điều kiện >0.
- Regex literal .*, ( đều không được diễn giải thành toán tử regex do người dùng cung cấp.

## 6. Chi tiết, khuyến mãi và tổng khách hàng

| Kiểm tra | Kết quả |
|---|---|
| Chi tiết hóa đơn | 20/20 trả 200; ChiTiet và tổng tiền khớp bản lưu |
| Chi tiết phiếu nhập | 10/10 trả 200; ChiTiet và tổng tiền khớp bản lưu |
| Chi tiết khách hàng | 10/10 trả 200; điểm khớp nguồn |
| Mã không tồn tại của cả 3 loại | 404 |
| Tổng SoLanMua của 10 hồ sơ | 20 |
| Tổng TongChiTieu của 10 hồ sơ | 4.400.000 ₫ |
| Tổng số hóa đơn đọc độc lập | 20 |
| Tổng ThanhTien đọc độc lập | 4.400.000 ₫ |

Đã thử lịch sử từng khách qua API hóa đơn: page=1/limit=1 và page=2/limit=1 trả hai hóa đơn khác nhau, đúng maKH và total=2.

### HD009

| Field | Kết quả thật |
|---|---|
| MaKM | KM002 |
| Trạng thái gốc trong DB | Đang áp dụng |
| Trạng thái tính theo thời điểm server | Đã kết thúc |
| Trạng thái tại ngày lập | Sắp diễn ra |
| NgayKetThuc API | 2026-10-10T23:59:59.000Z |
| Formatter UTC dùng dữ liệu API | 10/10/2026 |

Chi tiết có cảnh báo nếu thời điểm lập ngoài hiệu lực KM, chỉ hiển thị, không sửa dữ liệu. Kết quả formatter không được xem là đã kiểm chứng render UI.

### Không có MaKM

Đã thử HD001 và mọi hóa đơn không dùng KM trong bộ mẫu: KhuyenMai=null, không báo lỗi hoặc làm mất hóa đơn. Không tự gán chương trình hay tính lại GiamGia.

## 7. Lô chính: 214 kiểm tra HTTP đạt

| Nhóm | Số kiểm tra |
|---|---:|
| Bộ lọc HD/PN/KH, đối chiếu countDocuments và thứ tự | 36 |
| Chi tiết HD và PN | 30 |
| Hồ sơ 10 KH và 20 lần gọi lịch sử phân trang | 30 |
| Phân trang các danh sách | 9 |
| Mã không tồn tại | 3 |
| Sai/lạ/lặp/object/giới hạn/giá/ngày ở danh sách | 35 |
| Method ngoài GET trên 6 endpoint và query lạ | 42 |
| Mã sai, URL mã hóa lỗi | 6 |
| Hồi quy 8 API cũ và regex literal sản phẩm | 9 |
| Route đợt sau và file riêng tư | 6 |
| HTML/CSS/router/ui/Sản phẩm/3 module mới | 8 |
| **Tổng** | **214** |

- Các phản hồi API trong lô đều được kiểm tra không có MatKhau, MONGO_URI hoặc URI MongoDB.
- POST/PUT/DELETE/HEAD/OPTIONS/PATCH trả 405 và Allow GET trên 6 endpoint; HEAD không có thân theo HTTP.
- Tham số lạ trả 400 cả danh sách và chi tiết; limit>100 bị từ chối ở danh sách.
- Mã không tồn tại trả 404; mã không hợp lệ trả 400.
- API nhân viên, khuyến mãi, báo cáo, kiểm tra dữ liệu vẫn 404 để giữ phạm vi.
- API sản phẩm vẫn giữ hành vi tìm kiếm trước đó.

## 8. Các ca biên dùng bộ nhớ, không ghi DB

### 8.1. Unit test

44 test đạt, gồm:
- 27 test Đợt 2 hồi quy.
- 17 test mới cho ngày Việt Nam, > ngưỡng, bộ lọc, thứ tự, snapshot, KM BSON/UTC, khách và gợi ý tìm kiếm.

Các thời điểm giả lập được truyền vào hàm, không chỉnh đồng hồ hệ thống.

### 8.2. 11 phép thử aggregation với fixture

Dùng database-level aggregate bắt đầu bằng $documents; không tạo collection hoặc ghi fixture.

1. Hóa đơn ngày 05/09 Việt Nam: gồm đúng đầu ngày và 16:59:59.999Z, loại 17:00Z kế tiếp.
2. Hóa đơn ngày 06/09: nhận đúng mốc 17:00Z của ngày UTC trước.
3. Phiếu nhập ngày 05/09: cùng quy tắc, dùng NgayNhap.
4. Phiếu nhập ngày 06/09: nhận đúng đầu ngày kế tiếp.
5. ThucThuTren 309000: loại giá trị 309000, nhận 309001.
6. Hóa đơn cùng thời điểm: mã phụ MEM_A trước MEM_Z.
7. Phiếu nhập cùng thời điểm: mã phụ MEM_A trước MEM_Z.
8. Hóa đơn thiếu KH/NV/KM vẫn một document; snapshot tên/giá lịch sử giữ nguyên; MatKhau gốc/lồng trong dòng bị loại.
9. Phiếu nhập thiếu NCC/NV vẫn một document; snapshot tên/giá nhập giữ nguyên; MatKhau bị loại.
10. Khách chưa mua: lượt mua 0, thực thu 0, điểm lưu 777 vẫn 777.
11. Khách giả có MaKH=KH001 đọc lịch sử thật: 2 lần, 244.100 ₫; điểm giả 777 không bị tính lại.

Các thử nghiệm này kiểm tra pipeline đọc với fixture, không khẳng định đã có document lỗi thật trong collection hoặc đã thử UI với chúng.

## 9. Số lượng trước/sau

| Collection | Trước | Sau | Đối chiếu |
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

Tổng 89 document, không lệch. Tổng thực thu trước/sau vẫn 4.400.000 ₫. Không dựng lại dữ liệu.

## 10. Lỗi, cách xử lý và giới hạn

- Không phát sinh lỗi trong lô kiểm thử HTTP/aggregation sau triển khai; không có test thất bại ở lần chạy đã báo.
- Dữ liệu HD009 dùng KM trước hiệu lực và trạng thái KM002 gốc cũ được giữ nguyên, hiển thị rõ các trạng thái; không tự sửa.
- Snapshot giao dịch được bảo vệ bằng projection field ChiTiet đã lưu, không tra lại sản phẩm để thay giá.
- Giữ bản ghi nguồn khi lookup thiếu bằng mảng kết quả và fallback, không unwind làm mất giao dịch.
- Bộ lọc NV dùng mã nhập tay vì API nhân viên thuộc đợt sau; không tạo endpoint phụ ngoài phạm vi.
- Các ca đúng ranh giới ngày/thiếu tham chiếu/khách chưa mua được thử bằng fixture trong bộ nhớ, không thêm vào DB thật.
- Chưa xem trình duyệt thật; các tương tác, bố cục responsive, biểu đồ Dashboard hồi quy và thông báo UI vẫn CHƯA KIỂM CHỨNG.
- Chưa triển khai báo cáo top khách hay các trang Đợt 4/5. Không có đề xuất sửa SRS ở đợt này.

## 11. SHA-256 của 10 file gốc sau khi làm

Từng checksum được so với trước Đợt 3, không thay đổi.

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

## 12. Chờ xác nhận

Server tiếp tục chạy tại http://localhost:3000 để người dùng kiểm tra. Dừng công việc ở Đợt 3 và chờ người dùng duyệt trước khi bắt đầu Đợt 4.

