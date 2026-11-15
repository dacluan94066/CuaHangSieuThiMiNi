# Báo cáo làm lại header cửa hàng theo bố cục bán lẻ

## ĐÃ HOÀN THÀNH

Chỉ sửa phần đầu trang /shop theo yêu cầu từ ảnh:
- Logo, thanh tìm kiếm rộng ở giữa và cụm tài khoản/giỏ riêng.
- Tài khoản dùng disclosure native details/summary, có biểu tượng người dùng; khi đăng nhập hiện lời chào và tên gọn. Bấm mở để xem Tài khoản của tôi, Đơn hàng của tôi, Đăng xuất. Khi anonymous hiện Đăng nhập/Đăng ký.
- Không trải Đơn hàng + Tên khách + Đăng xuất thành hàng dài như trước. Nút đăng xuất ở trong menu tài khoản trên header.
- Giỏ hàng có biểu tượng SVG, số lượng thật từ API hiện có và liên kết giỏ.
- Thanh danh mục riêng, cuộn ngang khi thiếu chỗ. Header có bố cục CSS cho tablet/mobile; ở màn hình nhỏ ưu tiên biểu tượng, tên vẫn có trong menu và nhãn truy cập.
- Menu đóng khi bấm ra ngoài, chọn link, chuyển focus ra ngoài hoặc Escape; Escape trả focus về nút mở. Dùng Tab/Enter/Space của details/summary native, không role=menu giả phải tự cài arrow key.
- Lời chào dùng textContent, giữ cắt tên và thông báo đăng nhập/đăng ký/lỗi từ đợt trước. Không thêm hình sản phẩm giả, ưu đãi hoặc thông tin dịch vụ không có dữ liệu.
- Giữ tông xanh MiniMart, cảnh báo thanh toán giả lập và mọi chức năng cửa hàng.

Không thay backend/client API, DB, SRS, file 01–09 hoặc README.md gốc. Không triển khai auth quản trị. Không restart server vì thay đổi là file tĩnh.

## File tạo/sửa

Tương đối với webapp/:
- Sửa public/shop/index.html: cấu trúc header/menu/giỏ/danh mục.
- Tạo public/shop/header.css: CSS riêng của header, không đổi layout quản trị.
- Sửa public/shop/js/app.js: nối các node header và xử lý menu.
- Sửa public/shop/js/auth-ui.js: cập nhật nội dung dropdown và tương tác disclosure.
- Sửa tests/store-auth-ui.test.js: thêm 2 ca cho trạng thái dropdown và tương tác đóng/focus.
- Tạo báo cáo này.

Không sửa public/shop/shop.css trong lần này; stylesheet header mới nạp sau, có selector riêng để điều chỉnh bố cục cũ.

## Lệnh và kết quả thật

| Kiểm tra | Kết quả |
|---|---|
| npm run test:regression | 115/115 pass, exit 0 |
| node --test tests/store-auth-ui.test.js | 9/9 pass, gồm 7 ca cũ + 2 ca mới; exit 0 |
| node --check app.js/auth-ui.js cửa hàng | Pass |
| GET /shop/, /shop/header.css, /shop/shop.css, /shop/js/app.js, /shop/js/auth-ui.js | 5/5 trả 200; HTML có link CSS mới và các ID cần thiết |
| rg innerHTML/outerHTML/insertAdjacentHTML/eval trong public/shop | Không có kết quả |
| Snapshot chỉ đọc DB trước/sau | Cả hai DB giữ nguyên số đếm/dữ liệu/index/validator |
| SHA-256 trước/sau | 13/13 file bảo vệ giữ nguyên |

Tổng 124 test bộ nhớ đã đạt; test disclosure/focus là DOM giả lập, không thay nghiệm thu trình duyệt. Không chạy harness ghi DB hoặc tự đăng ký/đặt hàng trong lần sửa UI.

## DB trước/sau

| Collection | Main trước → sau | Test trước → sau |
|---|---|---|
| DanhMuc | 6 → 6 | 6 → 6 |
| NhaCungCap | 6 → 6 | 6 → 6 |
| SanPham | 20 → 20 | 52 → 52 |
| KhachHang | 10 → 10 | 22 → 22 |
| NhanVien | 6 → 6 | 7 → 7 |
| TaiKhoan | 6 → 6 | 6 → 6 |
| KhuyenMai | 5 → 5 | 13 → 13 |
| HoaDon | 20 → 20 | 36 → 36 |
| PhieuNhap | 10 → 10 | 10 → 10 |
| TaiKhoanKhachHang | Không có → Không có | 12 → 12 |
| YeuCauCuaHang | Không có → Không có | 35 → 35 |

Fingerprint Main trước/sau: bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916

Fingerprint Test trước/sau: 2454ca58d2dd2d75ca170a699c128dceef3203e72668b8b89cc31c68095754b2

Không có thay đổi DB do đợt này; không reset dữ liệu để ép số.

## SHA-256 giữ nguyên

| File | SHA-256 sau |
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

- Header cũ để nhiều hành động ngang hàng và tên khách chiếm chỗ: chuyển thành menu tài khoản, giới hạn tên và bố cục grid.
- CSS cũ đổi thứ tự search ở breakpoint tablet: stylesheet mới đặt lại order để thanh tìm kiếm giữ đúng cột/hàng trong grid.
- Không có test assertion thất bại trong các lệnh đã chạy.

## CHƯA HOÀN THÀNH

- Nghiệm thu giao diện của người dùng. Phạm vi mã header đã thực hiện; không tự mở rộng thành thiết kế lại toàn bộ các trang sản phẩm/checkout.

## CHƯA KIỂM CHỨNG

- Chưa mở trình duyệt thật để xác nhận hình ảnh desktop/mobile, mở menu native, Tab/Space/Escape/focus thực và thanh cuộn danh mục.
- HTTP asset 200 và test DOM giả lập không chứng minh UI đã được nghiệm thu.
- Không thay đổi hay kiểm thử lại giao dịch ghi DB.

Người dùng Ctrl+F5 ở http://localhost:3001/shop/ để nạp HTML/CSS/JS mới. Bấm cụm biểu tượng tài khoản để xem hồ sơ/đơn/đăng xuất. Dừng sau lần chỉnh này.
