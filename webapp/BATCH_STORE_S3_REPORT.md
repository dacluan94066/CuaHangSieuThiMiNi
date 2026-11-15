# S3 — Đặt hàng standalone, báo cáo triển khai và kiểm chứng

Ngày: 15/11/2026. Theo SRS_STORE.md mục 6, 7.3, 8, 10 và phạm vi S3 đã duyệt.

## 1. Trạng thái

**ĐÃ HOÀN THÀNH:** ba API S3; trang checkout với báo giá/địa chỉ/coupon/ba phương thức giả lập; chống trùng; giữ/hoàn tồn bằng marker; công bố hóa đơn rồi cộng điểm đúng một lần; phục hồi; các ca ST bắt buộc trên MongoDB Test thật; hồi quy; khởi động server Test thật.

**CHƯA HOÀN THÀNH:** không có hạng mục mã/API/test bắt buộc S3 đang dở. Đang chờ người dùng nghiệm thu. Lịch sử và trang chi tiết đơn không được triển khai trước S4.

**CHƯA KIỂM CHỨNG:** UI trong trình duyệt thật, responsive/keyboard thực tế, thao tác timeout/reload của giao diện, HTTPS cookie; kill tiến trình OS hoặc mất mạng thật. Test crash là hook ngắt xử lý có kiểm soát trên DB thật, khởi tạo lại service/server HTTP và session mới trong cùng tiến trình harness; không tuyên bố đã thử SIGKILL, mất điện hoặc tải production nhiều instance.

Không sửa SRS.md/SRS_STORE.md, 01–09 hoặc README.md. Không ghi DB chính, không chạy setup hoặc seed trên Main; không drop/--drop, không đổi mongod, không cài dependency. Không chạy lại toàn bộ quy trình S1/S2.

## 2. File tạo/sửa

Tất cả đường dẫn dưới đây thuộc `webapp/`.

| Loại | File | Nội dung |
|---|---|---|
| Tạo | `src/store/checkout-rules.js` | Validate body/key/địa chỉ, tính tiền và coupon, điểm, DTO xác nhận đơn |
| Tạo | `src/store/checkout.js` | Quote 5 phút, hàng đợi một executor, journal/idempotency, giữ tồn, rollback/forward recovery, status theo chủ sở hữu |
| Tạo | `src/store/checkout-safety.js` | Checkout mặc định khóa; kiểm tra khóa bền vững khi kiểm chứng thất bại |
| Tạo | `public/shop/js/checkout.js` | Báo giá, phương thức giả lập, xác nhận từ response, giữ cùng key khi timeout/retry |
| Tạo | `tests/store-checkout.test.js` | 10 unit test nghiệp vụ và bảo vệ giỏ |
| Tạo | `tests/store-checkout-api.test.js` | Harness ghi Test có guard, HTTP đồng thời, 9 điểm ngắt, đối chiếu tồn/điểm |
| Tạo | `tests/results/checkout-5EDAEFE2.json` | Bằng chứng đã chạy: ST, 194 HTTP check, 10 đơn, 29 dòng đối chiếu tồn, điểm 3 khách; không mật khẩu/hash/session |
| Tạo | `BATCH_STORE_S3_REPORT.md` | Báo cáo này |
| Sửa | `src/store/router.js`, `errors.js` | Route S3, CSRF/Origin/auth, mã lỗi nghiệp vụ, 202 và Retry-After |
| Sửa | `src/store/cart.js` | Cart ID nội bộ, chặn sửa giỏ đang checkout, giữ ổn định qua login |
| Sửa | `src/store/preflight.js`, `accounts.js` | Cho phép đăng nhập/đọc hồ sơ khi có order pending để khách lấy session mới; đăng ký vẫn bị chặn khi order chưa phục hồi |
| Sửa | `src/config.js`, `server.js` | Tách cờ bật checkout, chỉ Test; gắn service, startup chỉ đọc |
| Sửa | `public/shop/js/api.js`, `app.js`, `cart.js`, `account.js` | Idempotency header, route checkout, liên kết từ giỏ, quay lại checkout sau login |
| Sửa | `package.json`, `.gitignore` | Lệnh test checkout; bỏ qua file khóa runtime |
| Sửa | `.env.test.example`, `.env.test` | Cờ STORE_CHECKOUT_ENABLED; example false, bản Test local true sau khi ST bắt buộc đạt |

Không sửa schema/validator/index trong đợt S3: các cấu trúc S1 đã đủ. Không chạy lại script setup S1 hoặc fixture 90. Harness tạo fixture riêng có mã `S3_5EDAEFE2_...`, không reset dữ liệu cũ.

## 3. API và hành vi

| Method | Route | Body/header | Hành vi |
|---|---|---|---|
| POST | `/store-api/thanh-toan/xem-truoc` | diaChiGiao, phuongThuc, maKM tùy chọn | Đọc hàng/điểm/KM hiện tại, tạo báo giá trong bộ nhớ 5 phút, chưa giữ tồn/cộng điểm |
| POST | `/store-api/don-hang` | Body chỉ maBaoGia; Idempotency-Key UUID v4 | Xác nhận; 201 mới, 200 replay, 202 khi chưa hoàn tất, 409 khi xung đột/không đủ điều kiện |
| GET | `/store-api/yeu-cau-dat-hang/:key` | UUID key, không query | Chỉ đọc trạng thái của MaKH trong session; khách khác và không tồn tại đều 404 |

Mọi POST cần CSRF + Origin và đăng nhập. Body/query lạ, lặp hoặc giả tiền/MaKH bị từ chối; không nhận pipeline/operator. GET trạng thái không thực hiện recovery hoặc ghi DB.

Các nguyên tắc đã triển khai:

- Tên/giá/nhóm hàng lấy DB, không tin client. Tính tiền VNĐ nguyên an toàn; phần trăm dùng số nguyên lớn trong phép tính để không sai do nhân số thực rồi làm tròn tiền. TongTien trước giảm, ThanhTien = TongTien − GiamGia; điểm floor(ThanhTien/10000).
- Coupon so sánh trực tiếp BSON start <= now <= end, không cộng ngày. Kiểm tra DonHangToiThieu, DiemToiThieu trước đơn, MaDM, SoLuongToiThieu theo phần hàng phù hợp và GiamToiDa; điều kiện lạ bị từ chối. Ngày kết thúc hiển thị UTC riêng.
- Ba chuỗi phương thức: Chuyển khoản, Thẻ ngân hàng, Ví điện tử. Chỉ mô phỏng thành công nội bộ, không cổng thanh toán/thu tiền hoặc dữ liệu thẻ thật. Mã giao dịch giả lập được cấp một lần và lưu snapshot.
- Key gắn MaKH/quote; quote gắn Cart ID/revision, dữ liệu giá và điều kiện. Cùng key/quote trả đúng kết quả cũ; cùng key khác quote hoặc key khác dùng lại quote bị chặn. Tìm journal trước khi đòi quote trong bộ nhớ để retry sau restart không tạo đơn thứ hai.
- Giỏ bị khóa trong lúc xử lý. Chỉ xóa giỏ đã mua nếu đúng Cart ID và revision; không xóa giỏ mới sau restart hoặc của phiên khác.
- Trang xác nhận hiển thị hóa đơn từ response, không gọi route lịch sử/chi tiết S4. Client lưu riêng key/quote ID trong sessionStorage theo khách, không lưu mật khẩu/CSRF/SID/địa chỉ. Timeout giữ nguyên key; không tự tạo đơn mới để thử lại.

## 4. Nhất quán và recovery

Standalone vẫn không có atomicity nhiều document. Giới hạn một process, một executor checkout, không nhiều instance hoặc hệ thống khác cùng sửa tồn/marker.

1. Chốt giá/điều kiện theo thời điểm server, khóa đúng revision; journal chứa snapshot bền vững trước giữ hàng.
2. Giữ từng dòng theo mã: điều kiện tồn đủ, giá/tên/trạng thái/hạn khớp lần đọc và chưa có marker; giảm tồn + thêm marker trong **cùng update nguyên tử**.
3. Lỗi trước công bố: trả tồn + pull đúng marker/số lượng trong cùng update, chạy lại không trả tồn lần hai.
4. Chỉ insert HoaDon đã xác nhận sau khi giữ đủ. Không ghi nháp/đơn thất bại vào HoaDon, không đổi filter doanh thu `/api`.
5. Có HoaDon thì phục hồi tiến về trước: cộng điểm + thêm marker MaHD cùng một update có điều kiện; tiếp tục đặt DaCong và journal HOAN_TAT. Không xóa hóa đơn hoặc hoàn tồn sau công bố.
6. Startup chỉ đọc. Một POST checkout hợp lệ, có guard Test và dưới hàng đợi, phục hồi journal pending trước nghiệp vụ mới. Đăng nhập/đọc hồ sơ vẫn cho phép khi order pending để khách có thể lấy session sau restart. GET status chỉ đọc.

Khi không phân định được trạng thái, trả RECOVERY_PENDING; không báo thành công đầy đủ. Các hook crash chỉ được nhận từ factory có cả DB Test, config checkoutTestHarness và cờ harness; không có endpoint/body/header public để chọn failpoint.

Trong lúc kiểm chứng, checkout local tắt theo cờ. Harness Test bật có kiểm soát. Nếu kiểm chứng thất bại sau xác nhận đích Test, harness ghi `.checkout-locked`; service kiểm tra khóa này trên mọi lần xác nhận/báo giá. Không tự xóa khóa hoặc đổi topology. Lượt kiểm chứng này đạt nên không có file khóa; `.env.test` được bật checkout sau khi đạt. Example tiếp tục false để một bản cài mới không tự mở checkout chưa kiểm chứng.

## 5. Lệnh và kết quả thật

Các lệnh từ `webapp/`:

| Lệnh | Kết quả |
|---|---|
| `node scripts/s1-verification-snapshot.js` trước/sau | Main giữ fingerprint; số đếm ở mục 7 |
| `npm run test:checkout:unit` | 10/10 đạt, 0 fail |
| `npm run test:unit` | 44/44 đạt, 0 fail |
| `npm run test:store:unit` | 36/36 đạt, 0 fail |
| `npm run test:shop:unit` | 22/22 đạt, 0 fail |
| `STORE_CHECKOUT_API_TESTS=ALLOW_TEST_CHECKOUT` rồi `npm run test:checkout:api` | 1/1 integration test đạt, gồm 194 HTTP check; khoảng 8,34 giây |
| `node --check` cho các file liên quan | 28 file parse thành công |
| Rà `innerHTML`, `outerHTML`, `insertAdjacentHTML` trong shop | Không có |
| `npm run start:test` | Chạy thật, node server.js --test, localhost:3001, preflight standalone READY |
| GET trực tiếp server đang chạy | session 200; checkout HTML/module 200; api health 200 |
| POST preview với session ẩn danh/CSRF đúng | 401; GET status khi ẩn danh 401; POST api health 405 |

HTTP lấy `/shop/#/thanh-toan` chỉ chứng minh server trả HTML; hash được xử lý phía client nên không tính đó là nghiệm thu render/UI. Không mở Computer Use trong S3. Không cần lệnh khởi động thay thế vì start:test đã chạy được.

### 5.1. Các ST đã chạy trên MongoDB Test thật

| Nhóm | Bằng chứng/kết quả |
|---|---|
| ST-01 | Hai fetch POST order phát đồng thời, hai khách khác nhau cùng báo giá món cuối; kết quả [201,409], đúng 1 hóa đơn, tồn 0 |
| ST-02/03 | Hai request cùng key đồng thời trả [201,200] cùng MaHD; retry không trừ/cộng lần hai; cùng key khác quote và key khác quote đã dùng bị 409 |
| ST-04 | Sau giữ dòng đầu, fixture làm dòng thứ hai hết tồn; CAS dòng hai thất bại, dòng đầu trả đủ tồn, marker bị gỡ, không hóa đơn/điểm |
| ST-05 | Hết hạn, chưa bắt đầu, không đủ điểm, chưa đủ tiền, không đúng nhóm/lượng, điều kiện lạ đều bị chặn; coupon đủ toàn bộ điều kiện giảm đúng trần 1.000 ₫ |
| ST-06 | Đúng 23:59:59.000Z tạo đơn được; cùng coupon +1ms bị từ chối khi xác nhận; 00:00:00.000Z ngày tiếp theo hết hiệu lực |
| ST-13 | Đổi giá sau preview bị QUOTE_CHANGED; gửi ThanhTien giả bị 400, không nhận giá client |
| ST-14 | Đơn thực thu 9.999 / 10.000 / 19.999 cộng 0 / 1 / 1 điểm, kiểm tra điểm đã lưu thực tế |
| ST-07/08/17 | Hai POST thiếu/sai CSRF/Origin trả 403; GET trạng thái cần login; key người khác và key không có cùng 404; mọi response được scan field mật khẩu/hash/salt/marker/URI |
| ST-11/12 | 9 điểm ngắt trên DB thật; tạo lại service/server và session, login lại, retry cùng key/quote cũ; stock/điểm không lặp, không pending |

9 điểm ngắt: after-journal, before-hold:0, after-hold:0, before-hold:1, after-hold:1, before-insert, after-insert, after-points, after-complete. Sáu ca trước công bố hoàn tác, không có hóa đơn; ba ca sau công bố giữ đúng một hóa đơn và hoàn tất điểm. Sau recovery tiếp tục retry hai lần và kiểm tra lại tồn/điểm.

Không có ST bắt buộc thất bại. Không đề xuất hoặc tự bật replica set vì kết quả hiện tại đạt trong phạm vi demo standalone đã chọn.

## 6. Giải thích tiền, tồn và điểm Test

Run ID: **5EDAEFE2**. Chi tiết từng MaHD/MaSP/MaKH ở `tests/results/checkout-5EDAEFE2.json`.

- 10 đơn online thành công, tiền hàng **199.997 ₫**, giảm **2.000 ₫**, thực thu **197.997 ₫**.
- Tổng điểm cộng theo từng đơn là **15**, không lấy floor của tổng doanh thu để cộng chung.
- Khách fixture A: 0 + 13 = 13 điểm; B: 0 + 0 = 0; C: 100 + 2 = 102. 100 điểm của C là fixture điều kiện KM được cấp có chủ ý trên Test, không phải điểm từ hóa đơn.
- 29 sản phẩm fixture bắt đầu tổng tồn **159**; 10 đơn bán tổng **15 đơn vị**; một điều chỉnh fixture **−1**; tổng cuối **143**. Từng dòng đều được kiểm tra: tồn cuối = tồn đầu + điều chỉnh fixture − lượng trên đơn thành công.
- Điều chỉnh −1 chỉ ở `S3_5EDAEFE2_004`, nhằm mô phỏng mất tồn giữa preview/giữ hàng trong ST-04; không tính là hàng đã bán, không trả lại để ép số. Dòng giữ trước đó được hoàn tác thật. Không reset tồn/điểm sau kiểm thử.
- Các sản phẩm/khách trước S3 không được dùng để phát sinh các đơn này; mọi đơn gắn ba khách fixture mới và sản phẩm mã riêng của run. Không thay tồn lịch sử qua phiếu nhập/hóa đơn.
- Main vẫn thực thu **4.400.000 ₫**; Test sau kiểm thử **4.597.997 ₫**. Toàn bộ hóa đơn thất bại chỉ ở journal, không tham gia doanh thu.

## 7. Đếm trước/sau cả hai DB

| Collection | Main trước | Main sau | Test trước S3 | Test sau S3 |
|---|---:|---:|---:|---:|
| DanhMuc | 6 | 6 | 6 | 6 |
| NhaCungCap | 6 | 6 | 6 | 6 |
| SanPham | 20 | 20 | 21 | 50 |
| KhachHang | 10 | 10 | 15 | 18 |
| NhanVien | 6 | 6 | 7 | 7 |
| TaiKhoan | 6 | 6 | 6 | 6 |
| KhuyenMai | 5 | 5 | 7 | 13 |
| HoaDon | 20 | 20 | 20 | 30 |
| PhieuNhap | 10 | 10 | 10 | 10 |
| TaiKhoanKhachHang | Không có | Không có | 5 | 8 |
| YeuCauCuaHang | Không có | Không có | 6 | 26 |

Test thêm 29 sản phẩm, 6 KM, 3 khách/tài khoản fixture, 3 journal đăng ký fixture và 17 journal đặt hàng (10 thành công, 7 thất bại). Tổng Test từ 109 thành 180 document. Không còn order hoặc registration pending; preflight READY. Không dựng lại dữ liệu để số Test giống Main.

Main fingerprint trước = sau: `bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916`.

Test fingerprint trước: `e0cfdcc3e6c183f5a4c17346ffd19ac5a1e6479c7d6c3beeaa0e57ca033f4aca`.

Test fingerprint sau: `4d3551bebc7a8da85ba1bf2388660dd95b44ee3d7f130714095f6de31f8dc3cc`.

Đọc Main lúc `2026-11-15T15:00:41.638Z` (22:00:41 giờ Việt Nam): chỉ KM003 có hiệu lực, cần **100 điểm**, giảm tối đa 30.000 ₫. **Chưa có mã nào dùng được cho khách mới 0 điểm trên DB chính.** Mã thử/khách 100 điểm chỉ được tạo trên Test, không seed hoặc kéo dài KM trên Main.

## 8. SHA-256 file bảo vệ — 12/12 giữ nguyên

| File | SHA-256 trước = sau |
|---|---|
| `01_create_database.js` | `01FAF2485886D4EC9D0C4EF44D616B0256D1DB07E6142C7730D059A33549B730` |
| `02_insert_master_data.js` | `83B69C1EB351FCB0A704E7D9DD1E93EC63AF24705DBD1DC5E0ACB7765186045E` |
| `03_insert_transactions.js` | `6EC914626B310B5662377F88F12170298038CC2B2C4DF2C0B154322593825663` |
| `04_basic_queries.js` | `A242945B130961B30C5FB73855DD417CC4DC8D615E7725301743A3BB97872449` |
| `05_advanced_queries.js` | `A786B86F3104F0068BFAA394BC0642A66570A1F32CB8A19DCDC2331C954DD570` |
| `06_update_delete_queries.js` | `11B71AD7BF521A3DEE54BF369E0F7C9015C809E9B7572963162A39B703AB5838` |
| `07_indexes.js` | `5A3FF221B6A9A61DAAE089400276552D0928B01BF04094FEDDE5AB57ECACCDA4` |
| `08_import_export.md` | `8AE3C037BD887D222E92AA086AE4F01AFA6F4C7C5D006A37AE814DB313E8B2E2` |
| `09_backup_restore.md` | `4206C53F5AF686B1162AC4D07A9A24D7DBB58BA42B5EC72DF2B77939BF885938` |
| `README.md` | `F9DAB63CCED817FDBBD4041A267ADBC6E6E2E0030A4C014CADFA8634857E3C52` |
| `SRS.md` | `0A18A8E680D217D8C8448DCE3FE84CE594382D6A3B8DE9A17D2CEF8AF1B32B89` |
| `webapp/SRS_STORE.md` | `177B34EB15630B0EA53DE38CD2FCA964BCC4505F7FA05E54778DF007CB7995C6` |

## 9. Chạy và giới hạn còn lại

Server Test hiện chạy tại `http://localhost:3001`; trang `http://localhost:3001/shop/#/thanh-toan`. Đăng nhập/đăng ký tài khoản Test của người dùng để tự kiểm tra, không cung cấp mật khẩu fixture. Các tài khoản fixture chỉ có hash; harness không in mật khẩu.

Nếu khởi động lại, dừng server Test cũ bằng Ctrl+C rồi chạy `npm run start:test` từ webapp. Không đồng thời chạy harness ghi và server store khác vào cùng DB. Checkout Main vẫn bị chặn; không bật STORE_WRITE_ENABLED/STORE_CHECKOUT_ENABLED cho Main. Không chuyển tên DB để né guard.

Không có lỗi test trong lượt thực hiện. Các lỗi 403/409/429/503 nêu trong ca kiểm thử là kết quả mong đợi, không phải ca kiểm chứng thất bại. Không có khóa runtime vì mọi ST đạt. Các giới hạn standalone, bộ nhớ session/quote và UI chưa xác minh đã nêu ở mục 1, 4; không coi demo này là nghiệm thu nhiều instance hoặc lỗi mạng thực tế.

**DỪNG tại S3, chờ người dùng duyệt trước S4.**
