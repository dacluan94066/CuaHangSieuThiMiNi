# Báo cáo xây dựng đăng nhập và phân quyền quản trị

Phạm vi người dùng đã chốt qua câu trả lời: **“Làm đăng nhập/phân quyền trước, chốt nghiệp vụ ghi sau”**. Không triển khai lập/chốt hóa đơn, phiếu nhập, CRUD hoặc quản trị tài khoản qua web. SRS_ADMIN_AUTH.md được giữ nguyên theo yêu cầu bảo vệ file, kể cả dòng trạng thái lịch sử; việc triển khai dựa trên phê duyệt trong hội thoại.

Chỉ chat hiện tại active trong cùng workspace; chat “Xây dựng thực hành MongoDB siêu thị” notLoaded. Không có chat khác đang sửa mã cần dừng.

## ĐÃ HOÀN THÀNH

- Backend /admin-auth/session (GET), /admin-auth/dang-nhap và /dang-xuat (POST).
- Session nhân viên riêng admin_sid, httpOnly/SameSite Strict/Path=/, CSRF + Origin, xoay SID/CSRF sau login, idle 30 phút/absolute 8 giờ, giới hạn session và rate limit có giữ lượt trước KDF.
- Scrypt N=131072/r=8/p=1/keylen64/salt16/maxmem256 MiB, pool2/queue8. Adapter legacy nhân viên riêng, không nới validator password khách cửa hàng.
- Runtime chỉ đọc TaiKhoan/VaiTro/TrangThai/MaNV và credential băm riêng; không dùng TaiKhoan.MatKhau. Trạng thái/role/mapping/version được kiểm lại trên request bảo vệ.
- Tài khoản phải Hoạt động và nhân viên Đang làm; chặn tạm nghỉ, role lạ, NV_ONLINE, mapping/hash hỏng; lỗi login chung.
- Chặn quyền tại đủ 21 mẫu endpoint, gồm health/dashboard/báo cáo/audit. Anonymous 401, role thiếu quyền 403 trước đọc nghiệp vụ; mọi non-GET /api vẫn 405.
- Thu ngân/Bán hàng không nhận giá nhập/NCC kể cả lồng nhau, không có dropdown NCC; cố lọc maNCC bị 403. Role Kho giữ quyền giá nhập/NCC trên trang được cấp. Không mở /nhan-vien chỉ để lấy tùy chọn.
- Trang đăng nhập quản trị, header tên/role/đăng xuất, menu theo role, xử lý 401/403, xóa nội dung khi logout/hết phiên và kiểm lại khi trở lại tab/BFCache. Giao diện dùng DOM an toàn.
- Script Node thủ công có guard Test/Demo, dry-run mặc định, import, reset riêng 12–128 ký tự và sync-source; không auto chạy từ app. Chỉ collection/index/credential mới, không sửa TaiKhoan. Xung đột dừng, không drop.
- Đã cập nhật helper đăng nhập cho kiểm thử HTTP bộ nhớ và giữ assertion health 200 sau login, bổ sung anonymous/customer SID 401; không thêm cờ bypass auth.
- README_ADMIN_AUTH.md có hướng dẫn review/chạy setup, reset/sync và chạy API test bằng credential qua env mà không ghi password vào lịch sử lệnh.

## Ma trận role đã triển khai

| Role | Trang được xem |
|---|---|
| Quản trị | Tất cả trang hiện có |
| Thu ngân | Sản phẩm, Hóa đơn, Khách hàng, Khuyến mãi |
| Kho | Sản phẩm, Cảnh báo kho, Phiếu nhập |
| Bán hàng | Sản phẩm, Cảnh báo kho, Hóa đơn, Khách hàng, Khuyến mãi |

Không chia thành ba website. Dùng chung quản trị, chính sách server quyết định quyền, giao diện chỉ hiện phần được cấp. Không tin role từ form/header/query. /store-api giữ nguyên nghiệp vụ và cookie store_sid; logout nhân viên không logout khách.

## File tạo/sửa

Đường dẫn tương đối với webapp/:

| Nhóm | File |
|---|---|
| Tạo backend | src/admin-auth/index.js, security.js, policy.js, repository.js, schema.js |
| Sửa backend | src/app.js, src/routes/api.js, src/config.js, server.js |
| Tạo script thủ công | scripts/setup-admin-auth.js |
| Sửa smoke chỉ đọc | scripts/s1-readonly-smoke.js |
| Tạo frontend | public/js/auth-session.js, public/js/pages/login.js |
| Sửa frontend | public/index.html, public/css/app.css, public/js/app.js, public/js/api.js, public/js/pages/products.js |
| Tạo test | tests/admin-auth.test.js, tests/helpers/admin-memory.js |
| Sửa test cũ | tests/store-routes.test.js, tests/store-catalog-cart-api.test.js, tests/admin-readonly-api.test.js |
| Sửa lệnh/mẫu config | package.json, .env.example, .env.test.example; không sửa .env thật hay dependency |
| Tạo tài liệu | README_ADMIN_AUTH.md, báo cáo này |
| Sửa tài liệu webapp | README_WEBAPP.md, README_STORE.md để phản ánh /api đã được bảo vệ |
| Bằng chứng | tests/results/admin-auth-readonly-api.json (Main/partial), tests/results/admin-auth-build-audit.json |

Không sửa 10 file gốc hoặc ba SRS. Không sửa luồng /shop trong đợt auth này; các test UI cửa hàng tiếp tục đạt.

## Lệnh và kết quả thật

| Lệnh/kiểm tra | Kết quả |
|---|---|
| npm run test:admin:auth | **10/10 pass**; HTTP thật, KDF thật nhưng repository/dữ liệu bộ nhớ |
| npm run test:regression | **115/115 pass**; các assertion dữ liệu cũ được giữ sau helper login |
| node --test tests/store-auth-ui.test.js tests/admin-analytics.test.js | **13/13 pass** (9 UI shop + 4 analytics) |
| Tổng ba nhóm trên | **138/138 pass**, không ghi DB |
| npm run test:admin:api | **1 pass / 1 fail prerequisite**: Main guard/service đạt; Test chưa có TaiKhoanQuanTri do chưa chạy setup thủ công |
| node scripts/s1-readonly-smoke.js --test | 34 kiểm tra đạt, mode ANONYMOUS_GUARDS_ONLY, authenticatedDataChecks=false; không gọi đó là kiểm chứng dữ liệu sau login |
| node --check toàn bộ JS trừ node_modules | 99 file đạt ở lượt kiểm toàn bộ; các file chỉnh sau đó cũng được check riêng |
| rg innerHTML/outerHTML/insertAdjacentHTML/eval trong public/js | Không có kết quả |
| npm start và npm run start:test | Cả hai đã khởi động thật, nạp auth; không có URI trong log startup |
| Smoke HTTP trên hai server npm | Mỗi server: 21 route GET anonymous=401, 63 POST/PUT/DELETE=405, 6 asset=200, bootstrap=200, thiếu CSRF=403 |
| Login probe giả trên server npm | Main 503 ADMIN_AUTH_TARGET_FORBIDDEN; Test 503 ADMIN_AUTH_SETUP_REQUIRED |
| Snapshot/hash trước/sau | Hai DB và 13 file bảo vệ giữ nguyên |

**630** lượt HTTP thuộc ma trận 21 route × anonymous/4 role/method trong bộ nhớ đã đạt; còn các request auth/CSRF/restart/DTO ngoài số ma trận đó. Không xem con số này là đăng nhập tài khoản thật trên Test.

Các ca đã đạt trong bộ nhớ: full role matrix, chặn trước đọc dữ liệu khi 401/403, giữ 405, cookie khách không được dùng cho admin và ngược lại, CSRF cũ/sai, SID xoay, logout, nhân viên tạm nghỉ, role lạ, NV_ONLINE, hash hỏng, version credential đổi, request login sai đồng thời (5×401 + 1×429), pool/rate limit, session hết hạn, app mới không nhận SID cũ, lọc sâu field nhạy cảm và kế hoạch import chạy lại không tạo mới.

Script setup **chưa được chạy**, kể cả dry-run trên DB thật. Unit chỉ import hàm planAdminImport với dữ liệu RAM, không gọi main script. Không test GHI thật nào được thực hiện trong đợt này.

## DB trước/sau

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
| TaiKhoanQuanTri | Không có | Không có | Không có | Không có |

Main giữ chuẩn 6/6/20/10/6/6/5/20/10, thực thu service đối chiếu 4.400.000 ₫/20 HD. Test đã có 22 khách, 36 HD và fixture S1–S4 từ trước; đợt này không tăng document, không đổi tồn/điểm, không tạo TaiKhoanQuanTri.

Fingerprint Main trước/sau: bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916

Fingerprint Test trước/sau: 2454ca58d2dd2d75ca170a699c128dceef3203e72668b8b89cc31c68095754b2

Fingerprint gồm dữ liệu/số đếm/validator/index của mọi collection; cả hai đều giữ nguyên.

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

## Lỗi gặp và cách sửa

- Fixture DB bộ nhớ ban đầu thiếu dữ liệu nhánh customerDetail nên một assertion 200 nhận 404; đã bổ sung fixture đúng cách service đọc, không nới assertion hoặc sửa DB.
- Ca thử cookie admin với /store-api ban đầu thiếu storeOrigin trong config fixture, nhận 500; đã bổ sung config chuẩn, ca đảo chiều hiện trả đúng 401.
- API Test thật dừng vì thiếu setup: **chưa xử lý bằng cách tự seed**. Cần người dùng review/chạy script Node theo yêu cầu trước. Đây là prerequisite chưa hoàn thành, không tuyên bố API test tất cả pass.
- Ctrl+C các phiên npm trả exit 1 do hủy tiến trình; lần khởi động sau thành công, không có dữ liệu tác vụ treo trước restart.
- Cookie không phân biệt cổng: đã dừng Main/3000 sau phép thử để chỉ để Test/3001 hoạt động trong đợt auth, tránh bootstrap Main trên cùng localhost ghi đè cookie Test. Đã ghi giới hạn nhiều realm cùng host trong README_ADMIN_AUTH.md.
- Không sửa lỗi bằng auth=false, bằng cách bỏ KDF, cho qua khi DB lỗi hay mở lại Main public.

## CHƯA HOÀN THÀNH — cần người dùng chạy thủ công

Theo chỉ đạo trước **“script do TÔI chạy thủ công (Node, không phải mongosh)”**, agent không được tự chạy migration ghi. Review scripts/setup-admin-auth.js, sau đó tại webapp:

1. Dừng server Test bằng Ctrl+C.
2. node scripts/setup-admin-auth.js --test (dry-run, xem đích Test và số liệu).
3. Khi đồng ý: node scripts/setup-admin-auth.js --test --apply.
4. Chạy lại apply lần hai, đối chiếu create=0/skip theo thực tế và hash/salt/version không đổi.
5. npm run start:test, mở http://localhost:3001/#/dang-nhap.
6. Dùng TenDangNhap/password mẫu đã import hoặc password đặt lại riêng; không gửi password vào chat.
7. Đặt ADMIN_TEST_USERNAME/ADMIN_TEST_PASSWORD qua nhập ẩn như README_ADMIN_AUTH.md, rồi npm run test:admin:api để kiểm chứng dữ liệu API thật sau login.

Chưa có import/reset/sync/idempotent lần hai trên DB thật, chưa có đăng nhập đủ bốn role bằng credential thật, và chưa đạt trọn bộ test:admin:api. Không tự chạy setup trên Main/Demo hoặc tạo Demo.

## CHƯA KIỂM CHỨNG

- Chưa mở trình duyệt thật để nghiệm thu login, header tên/role, menu từng role, hidden NCC/giá nhập, 401/403, focus, logout/back/tab/mobile.
- Session sau restart đã thử bằng HTTP với app/session map mới trong bộ nhớ; chưa thử process restart với một phiên đã đăng nhập bằng credential DB thật.
- Chưa khẳng định quy trình Node nhập password ẩn/idempotent/apply hoạt động trên DB thật, vì script cần người dùng chạy.
- Chưa kiểm chứng production/HTTPS/multiple instance; đây là bản demo local, RAM session/rate limit và chỉ một realm admin Test trên localhost.
- Nghiệp vụ ghi theo role chưa thiết kế/xây dựng, đúng lựa chọn làm auth trước của người dùng.

## Trạng thái server và bước tiếp theo

Test/3001 đã chạy bản có auth và được smoke kiểm chứng, sau đó đã dừng để bàn giao bước setup thủ công cho người dùng (trước khi dừng đã kiểm pending=0). Main/3000 cũng đã dừng sau smoke; MongoDB và dữ liệu Main vẫn nguyên vẹn. Sau setup, chạy npm run start:test để mở admin và /shop. Session cũ đã mất khi restart/dừng server nhưng dữ liệu DB không đổi.

Dừng chờ người dùng review/chạy script thủ công và cung cấp kết quả không chứa bí mật. Không tự chuyển sang nghiệp vụ ghi.
