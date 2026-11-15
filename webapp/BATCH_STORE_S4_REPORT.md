# Báo cáo S4 — Lịch sử đơn và hoàn thiện cửa hàng

Ngày làm việc theo phiên: 15/11/2026. Phạm vi S4; chưa mở ghi DB chính, chưa chạy migration DB chính. Không sửa SRS.md, SRS_STORE.md hay 10 file gốc. Không chạy lại 01–07, không drop, không đổi cấu hình mongod.

## ĐÃ HOÀN THÀNH

- GET `/store-api/don-hang`: chỉ ONLINE của MaKH lấy từ session; page/limit, mặc định 20, tối đa 100; NgayLap giảm dần và MaHD tăng dần ổn định.
- GET `/store-api/don-hang/:maHD`: chủ sở hữu + ONLINE ngay trong filter DB; 401 khi chưa đăng nhập; đơn người khác, đơn POS và mã không có cùng 404 ORDER_NOT_FOUND.
- Projection bao hàm theo danh sách field cho phép và DTO riêng: không hash/salt/SID/journal/marker, kể cả field lồng trong ChiTiet. Không nối giá sản phẩm khi đọc đơn.
- Trang `/shop/#/don-hang`, `/shop/#/don-hang/:maHD`: phân trang, bảng snapshot, địa chỉ, giảm giá/thực thu, trạng thái cộng điểm, thanh toán giả lập. Có liên kết từ header, tài khoản và xác nhận checkout.
- UX: loading/lỗi/rỗng, điều hướng đăng nhập, focus nội dung sau chuyển trang, focus lỗi form, focus-visible, bảng có caption/tiêu đề cột và vùng cuộn bàn phím, bố cục mobile. Đây là phần đã viết mã; chưa kết luận trải nghiệm hiển thị đạt khi chưa mở trình duyệt thật.
- README_STORE.md có cách chạy Test/chính, cấu hình, backup/restore ánh xạ namespace không drop, kế hoạch setup DB chính do người dùng quyết định, giới hạn, kiểm thử và xử lý lỗi. Ghi rõ guard hiện tại chưa cho bán hàng trên DB chính.

## File tạo/sửa trong S4

Tất cả dưới `webapp/`; đường dẫn sau tương đối với thư mục này.

| Loại | File |
|---|---|
| Tạo backend | `src/store/orders.js` |
| Sửa backend | `server.js`, `src/store/router.js`, `src/store/query.js`, `src/store/errors.js` |
| Tạo frontend | `public/shop/js/orders.js` |
| Sửa frontend | `public/shop/index.html`, `public/shop/shop.css`, `public/shop/js/app.js`, `account.js`, `checkout.js`, `dom.js` |
| Tạo test/harness | `tests/store-orders.test.js`, `tests/store-orders-api.test.js`, `tests/helpers/store-test-fixtures.js`, `tests/helpers/store-process-crash-worker.js`, `scripts/verify-process-recovery.js` |
| Sửa lệnh test | `package.json` (thêm test:orders:unit và test:orders:api; không đổi dependency) |
| Tạo tài liệu | `README_STORE.md`, báo cáo này |
| Tạo bằng chứng | `tests/results/s4-final-audit.json`, `process-14f0ac6f-d8fc-45c9-bb8e-9fa252c8229d.json`, `process-14f0ac6f-d8fc-45c9-bb8e-9fa252c8229d-result.json` |

## Lệnh đã chạy và kết quả thật

| Lệnh/thao tác | Kết quả |
|---|---|
| `npm run test:unit` | 44/44 pass, exit 0 |
| `npm run test:store:unit` | 36/36 pass, exit 0 |
| `npm run test:shop:unit` | 22/22 pass, exit 0 |
| `npm run test:checkout:unit` | 10/10 pass, exit 0 |
| `npm run test:orders:unit` | 3/3 pass, exit 0 |
| Hai opt-in Test + `npm run test:orders:api` | 1 kịch bản integration pass; 39 request HTTP thật; exit 0 |
| Hai opt-in Test + `node scripts/verify-process-recovery.js` | Kill process thật rồi restart/retry đạt; exit 0 |
| Get-CimInstance + kiểm Name/CommandLine/run rồi `Stop-Process -Id 21532 -Force` | Chỉ worker Node Test có run `14f0ac6f-d8fc-45c9-bb8e-9fa252c8229d`; exit 0; không dừng mongod |
| `node scripts/s1-verification-snapshot.js` trước/sau | Chỉ đọc cả hai DB; số đếm/fingerprint đối chiếu bên dưới |
| Script inline dùng countDocuments/aggregate/find + inspectStore | Tồn âm 0 ở cả hai DB; pending 0; Test preflight READY, standalone |
| Get-FileHash SHA256 trước/sau | 12/12 file bảo vệ giữ nguyên |
| `node --check` toàn bộ JS dưới webapp trừ node_modules | Tất cả pass |
| rg innerHTML/outerHTML/insertAdjacentHTML/eval trong public/shop | Không có kết quả |
| `npm run start:test` | Server thật chạy localhost:3001, preflight `standalone; READY`; đang để chạy cho người dùng kiểm tra |
| HTTP smoke tới server npm thật | 10 request, kết quả bên dưới |

Tổng unit hồi quy cũ **112/112**, unit mới **3/3**. Không tuyên bố đã chạy lại các harness HTTP S1–S3 có ghi: trong S4 đã chạy lại toàn bộ nhóm unit cũ theo yêu cầu và chạy HTTP mới + phục hồi tiến trình thật.

### Kết quả HTTP S4 (server integration thật, cổng động trên Test)

- Anonymous GET danh sách và chi tiết: 401.
- A xem đơn A: 200; B xem đơn B: 200. A xem đơn B và B xem đơn A: 404. Mã thiếu và đơn POS của chính A cũng 404, cùng code/message.
- A có 3 đơn, limit=2: trang 1 hai đơn, trang 2 một đơn, không lặp; ba đơn cùng NgayLap vẫn thứ tự MaHD ổn định. B chỉ có một đơn. Trang 100 rỗng, giữ tổng đúng.
- Đọc đủ 3 chi tiết A trả 200: đơn giá 10.000, tên/địa chỉ snapshot giữ nguyên dù sản phẩm hiện tại đã đổi tên và giá 99.000; thực thu 10.000, 1 điểm/đơn.
- limit=101, page lặp, query MaKH lạ, query chi tiết lạ: 400.
- POST/PUT/DELETE `/api` và `/api/health`: 405.
- Đã cố ý thêm SID/Salt/journal giả trong một hóa đơn Test và Salt trong ChiTiet để thử projection: không lọt vào phản hồi. Quét mọi JSON trong harness không có các khóa mật khẩu/hash/salt/SID/marker/journal hoặc URI MongoDB. Không dùng secret thật làm fixture.

### HTTP smoke trên `npm run start:test`

| Method/path | Thực tế |
|---|---:|
| GET /shop/ | 200 HTML |
| GET /shop/js/app.js | 200 JavaScript |
| GET /shop/js/orders.js | 200 JavaScript |
| GET /shop/shop.css | 200 CSS |
| GET /store-api/don-hang (anonymous) | 401 |
| GET /store-api/don-hang/NOT_EXISTS (anonymous) | 401 |
| GET /api/health | 200 |
| POST /api | 405 |
| PUT /api | 405 |
| DELETE /api | 405 |

Tải được HTML/JS/CSS qua HTTP **chưa** chứng minh render, tương tác hay mobile đạt. Log startup quan sát không chứa MONGO_URI; không in cookie/SID hoặc thông tin đăng nhập vào bằng chứng.

## Kill process thật và phục hồi

Không bị chính sách chặn. Harness chỉ Test, failpoint truyền nội bộ qua constructor và IPC; không có endpoint public. Guard kiểm Test và opt-in trước khi tạo fixture.

1. Tạo riêng một khách Test và sản phẩm Test tồn 5, giá 10.000; đăng nhập/giỏ/báo giá/POST đơn bằng HTTP thật.
2. Worker PID 21532 tạm dừng ở `after-points`: hóa đơn đã tồn tại, tồn 4, điểm 1; journal chưa kết thúc.
3. Kiểm chứng PID là node.exe, tên worker và run khớp, rồi Stop-Process -Force đúng PID đó. Child exit code Windows 4294967295.
4. Controller mở worker mới PID 30560, đăng nhập lại (session cũ đã mất), gửi cùng Idempotency-Key và payload báo giá cũ.
5. Phản hồi 200; replay thêm lần nữa cùng MaHD; GET chi tiết 200. Chỉ **một hóa đơn**, tồn vẫn 4, điểm vẫn 1, pending 0, preflight READY. Worker mới đã đóng nhẹ nhàng sau phép thử.

MaHD bằng chứng: `HD_ONL_69430e3f5d314c12b2f7821fad4f8e50`. Xem JSON kết quả trong tests/results. S4 thử kill thật tại một điểm after-points; không tuyên bố đã kill thật ở mọi mốc hoặc mô phỏng mất điện mongod. Các ca failpoint ở các bước khác thuộc kiểm chứng S3 đã được duyệt.

## Đối chiếu hai DB trước/sau S4

Số dưới đây dùng countDocuments, không reset/restore hay dựng lại dữ liệu để ép số.

| Collection | DB chính trước | DB chính sau | Test trước | Test sau |
|---|---:|---:|---:|---:|
| DanhMuc | 6 | 6 | 6 | 6 |
| NhaCungCap | 6 | 6 | 6 | 6 |
| SanPham | 20 | 20 | 50 | 52 |
| KhachHang | 10 | 10 | 18 | 21 |
| NhanVien | 6 | 6 | 7 | 7 |
| TaiKhoan | 6 | 6 | 6 | 6 |
| KhuyenMai | 5 | 5 | 13 | 13 |
| HoaDon | 20 | 20 | 30 | 36 |
| PhieuNhap | 10 | 10 | 10 | 10 |
| TaiKhoanKhachHang | Chưa tạo | Chưa tạo | 8 | 11 |
| YeuCauCuaHang | Chưa tạo | Chưa tạo | 26 | 34 |

DB chính giữ đúng chuẩn **6/6/20/10/6/6/5/20/10**, tổng thực thu 4.400.000 ₫; không ghi setup/nghiệp vụ vào DB này. Fingerprint chứa số đếm + hash dữ liệu + metadata/index của mọi collection trước/sau cùng:

`bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916`

Metadata/validator/index của Test cũng không đổi trong S4. Fingerprint Test trước `4d3551bebc7a8da85ba1bf2388660dd95b44ee3d7f130714095f6de31f8dc3cc`, sau `486373f85a22666795bba3180b513ec58d6b2c6cfbe42c5c86b2ebd06123c74e` do fixture và đơn Test.

Giải thích chênh lệch Test riêng S4:

- +3 khách/tài khoản, +2 sản phẩm fixture; +8 journal = 3 đăng ký fixture + 5 đặt hàng.
- +6 HoaDon = **5 đơn online thành công** (4 từ HTTP history, 1 phục hồi process) + **1 POS fixture 5.000** kiểm tra không lộ đơn non-ONLINE. POS fixture không thực hiện nghiệp vụ tồn/điểm.
- Thực thu Test 4.597.997 → **4.652.997 ₫**: +50.000 từ 5 đơn online và +5.000 từ fixture POS. Không gọi 55.000 là doanh thu mua thật.
- Sản phẩm `S4_2a3df08f7aac44ecb9b1994a5d886d42`: tồn 10 → 6, bốn đơn × một món; giá hiện tại 99.000 phục vụ kiểm snapshot, giá trên đơn vẫn 10.000.
- Sản phẩm `S4_689443b677904ca7af667d881391c0b0`: tồn 5 → 4, một đơn phục hồi.
- Ba khách mới lần lượt có 3, 1, 1 điểm; tổng +5 điểm, đúng năm đơn 10.000. Không cộng lần hai sau retry.
- Tồn âm: DB chính **0**, Test **0**. Journal DANG_XU_LY/CAN_PHUC_HOI: **0**; pending đăng ký/đặt hàng đều 0; Test READY. `.checkout-locked` không tồn tại.

## SHA-256 các file bảo vệ

Đã tính trước và sau; tất cả **GIỮ NGUYÊN**. Hash sau:

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

- Không có ca kiểm thử thất bại trong các nhóm đã chạy S4; không phát sinh khóa checkout.
- Một lần đọc nhầm đường dẫn `src/store/config.js` không tồn tại: dùng cấu hình thật `src/config.js`, không tạo file thay thế.
- `git status --short` trả “not a git repository”: workspace không có Git để lấy diff, không tự khởi tạo repository. Danh sách file thay đổi được ghi ở trên, checksum và DB fingerprint được đối chiếu trực tiếp.

## CHƯA HOÀN THÀNH

- Nghiệm thu cuối bởi người dùng: đang chờ. Phạm vi mã S4 đã thực hiện, chưa tự tuyên bố người dùng đã duyệt giao diện.
- Vận hành ghi trên DB chính chưa được bật; đây là quyết định/migration cần phê duyệt riêng, không tự mở trong S4. README ghi đúng hạn chế này; chưa có script migration Main đã duyệt.

## CHƯA KIỂM CHỨNG

- Chưa mở trình duyệt thật để xem toàn bộ luồng cửa hàng, hai trang lịch sử mới, render ES modules, thông báo/lỗi/loading/rỗng, điều hướng focus bằng Tab, cuộn bảng, mobile và desktop. HTTP 200 của assets và kiểm tra cú pháp không thay cho kiểm chứng này.
- Kill thật mới thử after-points; chưa kill thật ở từng giai đoạn khác hay kiểm tra mất điện/hỏng MongoDB. Không khẳng định bảo đảm production/multi-instance.
- Chưa setup/chạy checkout trên DB chính; không có thử ghi nào vào DB chính. Không coi preflight thiếu schema trên DB chính là lý do tự chạy setup.

Người dùng có thể kiểm tra tại http://localhost:3001/shop/. Trước khi tự chạy lại các test ghi, dừng server Test để giữ một writer. **Dừng tại S4, chờ nghiệm thu; không tự mở ghi DB chính hoặc thêm chức năng.**
