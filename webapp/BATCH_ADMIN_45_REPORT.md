# Báo cáo Đợt 4–5 rút gọn — quản trị chỉ đọc

Đã thực hiện phạm vi mới theo yêu cầu, không triển khai đề xuất đăng nhập/role. Không sửa SRS.md, SRS_STORE.md, 01–09 hoặc README.md gốc. Không ghi DB nào, không chạy lại 01–07/setup, không tạo index/collection, không drop, không đổi mongod.

## ĐÃ HOÀN THÀNH

- Nhân viên: phân trang, tìm mã/tên, khoảng ngày Việt Nam; chức vụ/trạng thái/số hóa đơn/thực thu. Giữ nhân viên có 0 giao dịch. NV_ONLINE có cờ LaNhanVienHeThong và nhãn Nhân viên hệ thống.
- Khuyến mãi: phân trang, tìm mã/tên, lọc trạng thái hiện tại; giữ trạng thái gốc riêng; điều kiện tiếng Việt. Hiệu lực BSON bao gồm cả hai đầu, không cộng ngày; ngày kết thúc hiển thị UTC.
- Ba tab báo cáo: doanh thu ngày/tháng (kèm tổng hợp toàn kỳ), sản phẩm bán chạy, khách chi tiêu nhiều. Lọc ngày và sắp xếp theo SRS, có mã phụ ổn định, biểu đồ + bảng phân trang. Mỗi biểu đồ ghi rõ dữ liệu trang hiện tại; không âm thầm cắt dữ liệu.
- Kiểm tra dữ liệu: tổng TongTien so với tổng ChiTiet.ThanhTien; thời gian KM; đủ 11 quan hệ của SRS, gồm tham chiếu từng dòng hàng. MaKM và DieuKien.MaDM vắng mặt là hợp lệ; mã KM không tồn tại chỉ báo tham chiếu, không đoán sai hiệu lực. NV_ONLINE có hồ sơ hợp lệ không bị báo lỗi.
- README_WEBAPP.md: cài đặt, cấu hình/chạy Main và Test, cửa hàng, lệnh test chỉ đọc, giới hạn và xử lý lỗi.
- /api vẫn chỉ GET, dùng façade chỉ đọc; mọi thao tác nghiệp vụ ghi cửa hàng giữ nguyên module riêng. Không thêm endpoint sửa dữ liệu hay đăng nhập quản trị.

Logic nền: 05 bài 1, 2/22, 3–4, 5–8, 9–12; đã bổ sung timezone Việt Nam và giữ tham chiếu thiếu phù hợp SRS. Không chạy file 05.

## File tạo/sửa

Tất cả đường dẫn tương đối với webapp/.

| Thao tác | File |
|---|---|
| Tạo service | src/services/analytics.service.js; src/services/integrity.service.js |
| Sửa API/validation | src/routes/api.js; src/middleware/validate.js |
| Tạo giao diện | public/js/pages/management.js; public/js/pages/analytics.js |
| Sửa giao diện chung | public/js/app.js; public/js/ui.js; public/index.html; public/css/app.css |
| Tạo test | tests/admin-analytics.test.js; tests/admin-readonly-api.test.js |
| Sửa lệnh | package.json: test:admin:unit, test:admin:api, test:regression; không đổi dependency |
| Tạo tài liệu | README_WEBAPP.md; báo cáo này |
| Tạo bằng chứng | tests/results/admin-readonly-api.json; tests/results/admin-b45-audit.json |

Không sửa server.js, store service hay file cấu hình kết nối trong đợt này. Việc khởi động lại server chỉ nạp mã API mới, không chạy migration.

## API và kết quả HTTP thật

Tất cả endpoint mới là GET:

| API | Main | Test |
|---|---|---|
| /api/nhan-vien | 200; 6 nhân viên | 200; 7 nhân viên |
| /api/khuyen-mai | 200; 5 KM | 200; 13 KM |
| /api/bao-cao/tong-quan | 200; 4.400.000 ₫ / 20 HD | 200; 4.652.997 ₫ / 36 HD |
| /api/bao-cao/doanh-thu?nhom=ngay | 200; 20 mốc | 200; 22 mốc |
| /api/bao-cao/doanh-thu?nhom=thang | 200; đối chiếu từng nhóm với hóa đơn | 200; đối chiếu từng nhóm với hóa đơn |
| /api/bao-cao/san-pham | 200; 19 mã đã bán | 200; 34 mã đã bán |
| /api/bao-cao/khach-hang | 200; 10 khách có mua | 200; 15 khách có mua |
| /api/kiem-tra-du-lieu | 200; 1 lỗi | 200; 1 lỗi |

Số sản phẩm/khách trong báo cáo bán hàng là mã có phát sinh mua, khác số hồ sơ trong collection; không làm mất sản phẩm/khách ở màn hình danh sách.

### Đối chiếu tiền và đơn online

- Main: thực thu đúng 4.400.000 ₫, 20 HD, 10 khách, 6 nhân viên, 5 KM.
- Test: toàn bộ thực thu 4.652.997 ₫, 36 HD; trong đó **15 đơn ONLINE, 247.997 ₫** xuất hiện trong báo cáo. Tổng khách có hồ sơ 21, có mua 15.
- NV_ONLINE: **16 hóa đơn, 252.997 ₫**. Bao gồm 15 đơn online và một hóa đơn POS fixture 5.000 ₫ từ S4 dùng cùng MaNV. Thống kê nhân viên theo MaNV và mọi hóa đơn đã lưu đúng quy tắc, không coi cả 16 là ONLINE.
- Tổng chi tiêu/số lần mua của khách và tổng từng nhóm ngày/tháng đã so độc lập với các hóa đơn đọc trực tiếp; từng nhân viên cũng đối chiếu tương tự. Tổng tiền sản phẩm dùng số lượng × giá snapshot, không lấy giá hiện tại đã thay đổi trên Test.

### Kiểm tra dữ liệu thực tế

Cả hai DB có:
- Lệch tổng tiền: **0**.
- KM ngoài hiệu lực: **1**, HD009 dùng KM002.
- Tham chiếu thiếu trên 11 quan hệ: **0**.

HD009.NgayLap = 2026-09-05T18:20:00.000Z, trong khi KM002.NgayBatDau = 2026-09-10T00:00:00.000Z. Đây là lỗi dữ liệu có sẵn, không phải lỗi mới của web; không sửa hóa đơn hay KM.

Không có lỗi giả cho các đơn online không có MaKM hoặc NV_ONLINE. Tổng kiểm tra là số lỗi, không phải số document duy nhất.

## Lệnh đã chạy và kiểm chứng

| Lệnh/thao tác | Kết quả thật |
|---|---|
| npm run test:regression | 115/115 pass: 44 + 36 + 22 + 10 + 3 test cũ; không ghi DB |
| npm run test:admin:unit | 4/4 pass |
| npm run test:admin:api | 2/2 pass; lần cuối **141 HTTP Main + 200 HTTP Test = 341** request |
| node scripts/s1-verification-snapshot.js trước/sau | Cả hai DB giữ nguyên fingerprint dữ liệu, số đếm, validator và index |
| Get-FileHash -Algorithm SHA256 trước/sau | 12/12 file bảo vệ không đổi |
| node --check mọi JS dưới webapp, trừ node_modules | 87 file pass; hai module chỉnh lần cuối cũng được check lại |
| rg kiểm innerHTML/outerHTML/insertAdjacentHTML/eval trong public/js | Không có kết quả |
| Khảo sát keys DieuKien bằng aggregate chỉ đọc | Phát hiện fixture Test có Unknown, đã thêm nhãn chưa diễn giải, không trả giá trị field lạ |
| Preflight chỉ đọc trước restart | Test không có journal DANG_XU_LY/CAN_PHUC_HOI |
| npm start | Main chạy thật cổng 3000, /api dùng được; store preflight STORE_SETUP_REQUIRED đúng vì Main chưa setup |
| npm run start:test | Test chạy thật cổng 3001; preflight standalone; READY |
| HTTP smoke trên hai server npm sau lần chỉnh cuối | **32/32 pass**, 7 API mới mỗi DB + HTML/JS/CSS/shop + POST/PUT/DELETE 405 |

API integration dùng HTTP thật tới createApp trên cổng động và DB thật, không mock DB. Ca biên đưa dữ liệu giả lập vào luồng aggregate bằng $literal/$replaceWith sau $limit:1, không insert document. Các bộ test đã được mở rộng rồi chạy lại khi có ca đối chiếu mới; số 341 là kết quả bộ cuối, không cộng dồn các lần trước.

Đã kiểm:
- Ngày trọn ngày VN và group VN tại 16:59:59.999Z/17:00:00.000Z.
- KM tại NgayKetThuc 23:59:59.000Z vẫn có hiệu lực; +1ms và 00:00:00Z kế tiếp hết hiệu lực. Không MaKM hoặc mã KM thiếu không bị suy diễn thành lỗi thời gian.
- Tổng tiền RAM lệch 2 được báo đúng; 11 quan hệ đều có ca mã hợp lệ và thiếu, hai quan hệ tùy chọn có ca thiếu field.
- Nhân viên toàn bộ vẫn hiện trong kỳ 2099 không hóa đơn, thống kê bằng 0.
- Xếp hạng sản phẩm/khách, lọc danh mục hiện tại, phân trang limit=1, kiểm từng nhóm tiền.
- Regex “.*”, “(” là văn bản; limit=101, query lạ/lặp, ngày ngược, collection không phù hợp bị 400.
- POST/PUT/DELETE các route mới đều 405; DTO JSON không có khóa MatKhau/hash/salt/SID/marker/journal hoặc URI MongoDB.
- Cố ý đưa giá trị riêng tư vào điều kiện lạ trong fixture RAM: chỉ trả cờ boolean “có điều kiện chưa hỗ trợ”, không trả giá trị đó.
- Hồi quy HTTP quản trị cũ: health/dashboard, toàn bộ danh sách và chi tiết sản phẩm/hóa đơn/phiếu nhập/khách hàng trên cả hai DB, bộ lọc và cảnh báo kho. Bao gồm 20 HD/10 PN/10 KH Main và 36 HD/10 PN/21 KH Test.

Không chạy lại các harness HTTP cửa hàng cũ có tạo fixture DB (S1–S4) vì yêu cầu đợt này **không ghi DB**. Đã chạy toàn bộ unit cũ, kể cả các bài kiểm thử ghi bằng dữ liệu bộ nhớ, và HTTP quản trị chỉ đọc. Không tuyên bố đã chạy lại checkout/đăng ký ghi DB thật trong đợt này.

## Đếm trước/sau cả hai DB

| Collection | Main trước | Main sau | Test trước | Test sau |
|---|---:|---:|---:|---:|
| DanhMuc | 6 | 6 | 6 | 6 |
| NhaCungCap | 6 | 6 | 6 | 6 |
| SanPham | 20 | 20 | 52 | 52 |
| KhachHang | 10 | 10 | 21 | 21 |
| NhanVien | 6 | 6 | 7 | 7 |
| TaiKhoan | 6 | 6 | 6 | 6 |
| KhuyenMai | 5 | 5 | 13 | 13 |
| HoaDon | 20 | 20 | 36 | 36 |
| PhieuNhap | 10 | 10 | 10 | 10 |
| TaiKhoanKhachHang | Không có | Không có | 11 | 11 |
| YeuCauCuaHang | Không có | Không có | 34 | 34 |

Main giữ chuẩn 6/6/20/10/6/6/5/20/10. Test khác Main do các fixture/giao dịch S1–S4 đã được duyệt; **đợt này tăng 0 document**, không thay tồn/điểm.

Fingerprint tổng hợp cả dữ liệu, số lượng, validator/index trước/sau:
- Main: bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916
- Test: 486373f85a22666795bba3180b513ec58d6b2c6cfbe42c5c86b2ebd06123c74e

## SHA-256 sau đợt

Đã so với trước, tất cả **GIỮ NGUYÊN**.

| File | SHA-256 |
|---|---|
| 01_create_database.js | `01FAF2485886D4EC9D0C4EF44D616B0256D1DB07E6142C7730D059A33549B730` |
| 02_insert_master_data.js | `83B69C1EB351FCB0A704E7D9DD1E93EC63AF24705DBD1DC5E0ACB7765186045E` |
| 03_insert_transactions.js | `6EC914626B310B5662377F88F12170298038CC2B2C4DF2C0B154322593825663` |
| 04_basic_queries.js | `A242945B130961B30C5FB73855DD417CC4DC8D615E7725301743A3BB97872449` |
| 05_advanced_queries.js | `A786B86F3104F0068BFAA394BC0642A66570A1F32CB8A19DCDC2331C954DD570` |
| 06_update_delete_queries.js | `11B71AD7BF521A3DEE54BF369E0F7C9015C809E9B7572963162A39B703AB5838` |
| 07_indexes.js | `5A3FF221B6A9A61DAAE089400276552D0928B01BF04094FEDDE5AB57ECACCDA4` |
| 08_import_export.md | `8AE3C037BD887D222E92AA086AE4F01AFA6F4C7C5D006A37AE814DB313E8B2E2` |
| 09_backup_restore.md | `4206C53F5AF686B1162AC4D07A9A24D7DBB58BA42B5EC72DF2B77939BF885938` |
| README.md | `F9DAB63CCED817FDBBD4041A267ADBC6E6E2E0030A4C014CADFA8634857E3C52` |
| SRS.md | `0A18A8E680D217D8C8448DCE3FE84CE594382D6A3B8DE9A17D2CEF8AF1B32B89` |
| webapp/SRS_STORE.md | `177B34EB15630B0EA53DE38CD2FCA964BCC4505F7FA05E54778DF007CB7995C6` |

## Lỗi và cách xử lý

- HD009 dùng KM002 trước ngày bắt đầu: liệt kê chính xác trên trang kiểm tra, giữ nguyên dữ liệu gốc.
- Fixture S3_5EDAEFE2_KM5 có điều kiện Unknown: bổ sung cờ CoDieuKienChuaHoTro và nhãn chưa diễn giải, không nhầm thành “không có điều kiện”, không trả giá trị field lạ. API/RAM test sau chỉnh pass.
- Store preflight Main STORE_SETUP_REQUIRED: trạng thái dự kiến vì không được setup Main trong đợt này; không ảnh hưởng API quản trị, không sửa bằng cách ghi DB.
- Lệnh Ctrl+C của công cụ để dừng phiên npm trả exit 1 do hủy tiến trình; sau đó hai cổng khởi động lại bình thường và smoke test pass. Không có ca assertion nào thất bại.
- Chưa có README_WEBAPP.md trước đợt, đã tạo mới theo phạm vi; không sửa README.md gốc.

## CHƯA HOÀN THÀNH / PHẦN BỎ KHỎI PHẠM VI RÚT GỌN

- Chưa làm tab/API nhập hàng theo NCC, nhập hàng theo sản phẩm và báo cáo phương thức thanh toán riêng. Chỉ ba tab đã yêu cầu; Dashboard vẫn giữ biểu đồ thanh toán cũ.
- Chưa nghiệm thu cuối bởi người dùng.
- Đăng nhập/role quản trị vẫn chỉ là đề xuất riêng, không triển khai trong đợt này; cửa hàng S1–S4 giữ nguyên.

## CHƯA KIỂM CHỨNG

- Chưa mở trình duyệt thật để nghiệm thu bốn mục menu mới, ba tab báo cáo, bộ lọc/phân trang, chart CDN, loading/lỗi/rỗng, focus bàn phím và bố cục mobile/desktop. Chưa khẳng định UI đã chạy tốt chỉ từ HTTP asset 200 và kiểm cú pháp.
- Chưa thử CDN mất mạng trên trình duyệt thật; code có thông báo lỗi chart và giữ bảng, nhưng hành vi này chưa có kiểm chứng trình duyệt.
- Không chạy lại test ghi DB cửa hàng trong đợt chỉ đọc này. Không setup hay thử ghi trên DB chính.

Hai server đang chạy để người dùng kiểm tra:
- Main: http://localhost:3000/
- Test: http://localhost:3001/

Dừng sau đợt rút gọn, chờ người dùng duyệt; không tự thêm báo cáo, phân quyền hay nghiệp vụ ghi.
