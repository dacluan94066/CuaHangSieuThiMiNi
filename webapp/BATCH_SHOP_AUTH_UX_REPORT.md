# Báo cáo cải thiện phản hồi đăng nhập cửa hàng

Phạm vi chỉ giao diện /shop. Không đổi API backend hoặc client API, không sửa SRS/01–09/README.md gốc, không chạy setup hay các script dữ liệu. Không ghi vào Main hoặc Test. Không triển khai đăng nhập/role quản trị đang chờ duyệt SRS_ADMIN_AUTH.md.

## ĐÃ HOÀN THÀNH

- Đăng nhập thành công: toast “Đăng nhập thành công”.
- Đăng ký thành công: toast “Đăng ký thành công, hãy đăng nhập”, chuyển về form đăng nhập như hành vi cũ.
- Header authenticated: “Xin chào, <HoTen>”, link tới tài khoản và nút Đăng xuất ngay trên header.
- Tên được gán textContent; chuẩn hóa khoảng trắng và cắt tên dài còn tối đa 28 code point gồm dấu …, title giữ tên đầy đủ. CSS ellipsis và flex-wrap cho header hẹp; không tạo HTML từ tên trong DB.
- Anonymous: hiện Đăng nhập, ẩn nút Đăng xuất và không dùng tên khách từ trạng thái cũ.
- Nút đăng xuất header và trang tài khoản dùng chung luồng UI, gọi API logout hiện có, cập nhật header và giỏ sau thành công; không đổi CSRF/Origin/session backend.
- Đăng nhập sai: lỗi chung “Số điện thoại hoặc mật khẩu không đúng.”, không phản chiếu thông báo có thể lộ SĐT/tài khoản. Lỗi mạng/rate limit/phiên/server có thông báo an toàn riêng.
- Lỗi đăng nhập được đưa vào errorBox role=alert, tabindex=-1 và focus sau khi gắn DOM. Đã kiểm cơ chế này bằng DOM giả lập, chưa xác nhận trên trình duyệt thật.
- Thành công xác thực không bị đổi thành lỗi đăng nhập chỉ vì request đọc header/giỏ sau đó thất bại; trang đích tiếp tục có cơ chế lỗi/thử lại của chính nó.
- Toast ở ngoài vùng router, hiển thị 6,5 giây như trước và không bị xóa chỉ vì chuyển trang.

## File đã tạo/sửa

Tương đối với webapp/:

| Thao tác | File |
|---|---|
| Sửa | public/shop/index.html: nút header logout và vùng lỗi header |
| Sửa | public/shop/js/app.js: lời chào, luồng logout chung, xử lý lỗi header |
| Sửa | public/shop/js/account.js: thông báo thành công/lỗi chung, dùng logout chung |
| Sửa | public/shop/shop.css: giới hạn độ rộng tên, nút logout và header mobile |
| Tạo | public/shop/js/auth-ui.js: trạng thái header, cắt tên, thông báo lỗi an toàn |
| Tạo | tests/store-auth-ui.test.js: 7 ca bộ nhớ/DOM giả lập |
| Tạo | báo cáo này |

Không sửa public/shop/js/api.js, public/shop/js/dom.js hoặc bất kỳ file backend nào. Focus dùng helper errorBox hiện có, bổ sung ca kiểm chứng và sử dụng lỗi chung khi login.

## Lệnh đã chạy và kết quả thật

| Lệnh/kiểm tra | Kết quả |
|---|---|
| npm run test:regression | **115/115 pass** (44 + 36 + 22 + 10 + 3); exit 0 |
| node --test tests/store-auth-ui.test.js | **7/7 pass**; exit 0 |
| node --check cho app.js/account.js/auth-ui.js cửa hàng | Pass |
| GET /shop/, /shop/js/app.js, /shop/js/account.js, /shop/js/auth-ui.js, /shop/shop.css tại localhost:3001 | **5/5 trả 200**, kiểm có nút và module mới |
| rg innerHTML/outerHTML/insertAdjacentHTML/eval trong public/shop | Không có kết quả |
| node scripts/s1-verification-snapshot.js trước/sau | Hai DB có dữ liệu, số đếm, index/validator giữ nguyên fingerprint |
| Get-FileHash SHA256 trước/sau | **13/13 file bảo vệ giữ nguyên** |

7 ca mới kiểm: anonymous không dùng tên cũ; authenticated và fallback tên; tên Unicode dài; tên chứa markup chỉ textContent; lỗi credential không phản chiếu thông tin; thông báo mạng/rate/server; errorBox nhận focus khi gắn DOM giả lập.

Không chạy các harness HTTP cửa hàng cũ có ghi fixture thật. Test hồi quy kiểm thao tác ghi bằng bộ nhớ; không đăng ký/đặt hàng tự động trên DB thật trong đợt này. Không restart server vì thay đổi là file tĩnh; không làm mất session của người dùng. GET asset 200 không được tính là kiểm chứng render/tương tác trình duyệt.

## Dữ liệu trước/sau

| Collection | Main trước | Main sau | Test trước | Test sau |
|---|---:|---:|---:|---:|
| DanhMuc | 6 | 6 | 6 | 6 |
| NhaCungCap | 6 | 6 | 6 | 6 |
| SanPham | 20 | 20 | 52 | 52 |
| KhachHang | 10 | 10 | 22 | 22 |
| NhanVien | 6 | 6 | 7 | 7 |
| TaiKhoan | 6 | 6 | 6 | 6 |
| KhuyenMai | 5 | 5 | 13 | 13 |
| HoaDon | 20 | 20 | 36 | 36 |
| PhieuNhap | 10 | 10 | 10 | 10 |
| TaiKhoanKhachHang | Không có | Không có | 12 | 12 |
| YeuCauCuaHang | Không có | Không có | 35 | 35 |

Main giữ chuẩn 6/6/20/10/6/6/5/20/10. Test đã có 22 khách/12 tài khoản khách/35 journal ngay trước khi bắt đầu đợt này; không lấy mốc đợt trước để quy chênh lệch đó cho lần sửa UI này.

Fingerprint toàn DB trước/sau:
- Main: bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916
- Test: 2454ca58d2dd2d75ca170a699c128dceef3203e72668b8b89cc31c68095754b2

Hai fingerprint không đổi so với snapshot trước. Không dựng/reset dữ liệu để ép số, không ghi DB chính.

## Checksum SHA-256 sau đợt

10 file gốc và cả ba SRS đều giữ nguyên so với trước:

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
| webapp/SRS_ADMIN_AUTH.md | `B77B29CD9F4D91E3FE7F218D499E0413779D0326E54D6CD8155749604206CA0D` |

## Lỗi và cách xử lý

- Luồng cũ gộp login thành công và tải giỏ/header vào cùng try; lỗi đọc tiếp theo có thể bị hiển thị như login thất bại. Đã tách phần đọc hậu đăng nhập khỏi kết luận xác thực.
- Toast thành công đã có trước nhưng nội dung chưa thống nhất; đã đổi đúng thông báo ngắn yêu cầu.
- Không có test assertion thất bại hoặc lỗi cú pháp trong các kiểm tra đã chạy.

## CHƯA HOÀN THÀNH

- Nghiệm thu của người dùng. Phạm vi sửa mã giao diện đã hoàn thành, không triển khai phần quản trị hoặc thêm chức năng ngoài yêu cầu.

## CHƯA KIỂM CHỨNG

- Chưa mở trình duyệt thật để đăng nhập/đăng ký/đăng xuất bằng giao diện sau sửa, kiểm toast, focus thực, layout/tên dài và responsive mobile.
- Không khẳng định UI đã chạy tốt chỉ từ 122 test bộ nhớ và HTTP asset 200.
- Chưa thử timeout/network bằng trình duyệt thật. Các nhánh phản hồi đã viết và kiểm helper, chưa kiểm toàn bộ tương tác bằng mắt.

Người dùng tải lại trang http://localhost:3001/shop/ (Ctrl+F5 nếu cần nạp JS/CSS mới) để nghiệm thu. Dừng sau đợt này; không tự chuyển sang viết code auth quản trị hoặc ghi DB.
