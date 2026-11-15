# SRS — Đăng nhập và phân quyền xem trang quản trị

## Lịch sử thay đổi

| Phiên bản | Nội dung | Trạng thái |
|---|---|---|
| 1.0 dự thảo | Bổ sung xác thực nhân viên, quyền xem theo 4 role, setup mật khẩu băm thủ công trên Test/Demo và kế hoạch kiểm thử | Chờ người dùng duyệt |

Đây là tài liệu bổ sung độc lập cho SRS.md v1.1 và SRS_STORE.md. Yêu cầu mới của người dùng cho phép **thiết kế** đăng nhập/phân quyền quản trị, không cho viết code hay chạy setup trong bước này. Không sửa các SRS cũ, file 01–09 và README.md gốc.

Đề xuất cũ ADMIN_AUTH_PROPOSAL.md chỉ là tài liệu tham khảo. Ma trận ở tài liệu này thay thế đề xuất cũ khi được duyệt, đặc biệt quyền Bán hàng xem Hóa đơn/Khách hàng/Khuyến mãi/Cảnh báo kho theo chỉ đạo mới.

## 1. Mục tiêu, phạm vi và giới hạn

- Nhân viên đăng nhập bằng TenDangNhap/mật khẩu; server xác định VaiTro từ TaiKhoan, không có ô chọn role hoặc nhận role từ client.
- Mọi dữ liệu nghiệp vụ quản trị tiếp tục chỉ đọc bằng find, aggregate, countDocuments. Không tạo/sửa/xóa hóa đơn, phiếu nhập, tồn kho, điểm hay hồ sơ.
- Mọi route /api được xác thực và phân quyền tại server; ẩn menu chỉ là trải nghiệm bổ sung. /api tiếp tục chỉ GET, method khác trả 405.
- POST xác thực đặt riêng dưới /admin-auth, chỉ thay đổi session/rate limit trong RAM; runtime không ghi DB ngay cả khi đăng nhập/đăng xuất.
- Setup collection/index/validator và thông tin xác thực do **người dùng chạy script Node thủ công** sau khi review, chỉ trên QLSieuThiMini_Test hoặc QLSieuThiMini_Demo đã tồn tại. Không chạy trên DB chính, không chạy bằng mongosh/IntelliShell.
- Giữ Node + Express + mongodb driver, HTML/CSS/JS thuần, không build, không thêm framework hay thư viện test/xác thực.
- Ngoài phạm vi: đăng ký nhân viên, chọn/sửa role, đổi/quên mật khẩu qua web, OTP, CRUD nghiệp vụ, tạo DB Demo, production/hosting, nhiều instance, tự bật replica set hoặc tự chạy setup khi khởi động.
- Toàn bộ thành phần tương lai thuộc webapp/. Bước hiện tại chỉ tạo SRS_ADMIN_AUTH.md.

## 2. Khảo sát chỉ đọc và phối hợp project

### 2.1. Chat đang làm việc

Đã kiểm tra danh sách chat Codex ở chế độ recent và history. Trong cùng thư mục project:
- “Phân tích project QLSieuThiMini”: chat hiện tại, active.
- “Xây dựng thực hành MongoDB siêu thị”: notLoaded.

Không phát hiện chat khác đang chạy/sửa cùng project trong kết quả hiện có; không gửi lệnh tiếp tục hoặc khởi chạy chat cũ. Không có chat khác cần dừng. Khi bước xây dựng được duyệt phải kiểm tra lại, nếu có writer khác thì yêu cầu dừng và chờ xác nhận dừng trước khi sửa file; không chỉ nhắn rồi sửa đồng thời. Các tiến trình npm đang phục vụ web không được coi là chat sửa mã; bước tài liệu không khởi động lại hoặc dừng server.

### 2.2. Tài liệu/mã đã đối chiếu

Đã đọc các phần liên quan của:
- SRS.md: ngoài phạm vi cũ, TC-08/09/10, bảo mật/mật khẩu và nghiệp vụ chỉ đọc; SRS_STORE.md và báo cáo kiểm thử hiện có là bối cảnh giữ nguyên luồng khách.
- ADMIN_AUTH_PROPOSAL.md.
- src/routes/api.js (đầy đủ 21 mẫu route hiện có), src/app.js (chốt method, mount router), src/config.js.
- src/store/sessions.js, rate-limit.js, passwords.js: cookie/session, CSRF, rate limit, KDF/pool hiện có.
- src/utils/projections.js, src/pipelines/joins.js, src/services/products.service.js: field trả ra, giá nhập/NCC lồng trong sản phẩm.
- Giao diện bộ lọc hóa đơn/phiếu nhập và vị trí gọi API trong test cũ, tests/results/admin-readonly-api.json.

Không chạy các file 01–07. Khảo sát tài khoản dùng projection chỉ VaiTro/TrangThai/MaNV và lookup NhanVien.TrangThai; không lấy MatKhau, hash hoặc salt, không in mật khẩu hay MONGO_URI.

### 2.3. Kết quả TaiKhoan thật

Cả QLSieuThiMini và QLSieuThiMini_Test đều có 6 tài khoản, cùng kết quả sau:

| Role | TaiKhoan.TrangThai | NhanVien.TrangThai | Số tài khoản |
|---|---|---|---:|
| Quản trị | Hoạt động | Đang làm | 1 |
| Thu ngân | Hoạt động | Đang làm | 2 |
| Kho | Hoạt động | Đang làm | 1 |
| Bán hàng | Hoạt động | Đang làm | 2 |

Hiện không có tài khoản liên kết nhân viên tạm nghỉ trong kết quả thực tế. Ca tạm nghỉ phải dùng fixture bộ nhớ hoặc Test được duyệt riêng; không kết luận đang có ca bị chặn trên DB thật.

Main chưa có NV_ONLINE; Test có 1 nhân viên NV_ONLINE nhưng **0 tài khoản TaiKhoan** gắn mã này. Thiết kế vẫn chặn rõ NV_ONLINE, kể cả sau này xuất hiện tài khoản.

QLSieuThiMini_Demo hiện **chưa tồn tại**. Không tự tạo/restore Demo. Tài khoản chưa có thông tin xác thực mới nên các điều kiện hoạt động nêu trên chưa đồng nghĩa có thể đăng nhập ngay.

## 3. Ma trận quyền

### 3.1. Quyền theo trang

C = có quyền xem; — = không có quyền. “Tất cả” của Quản trị chỉ gồm chức năng đã triển khai, vẫn không được xem mật khẩu/hash/salt/marker/journal.

| Trang/hash quản trị | Quản trị | Thu ngân | Kho | Bán hàng |
|---|---|---|---|---|
| Tổng quan #/dashboard | C | — | — | — |
| Sản phẩm #/san-pham | C | C | C | C |
| Chi tiết sản phẩm #/san-pham/:ma | C | C | C | C |
| Hóa đơn #/hoa-don | C | C | — | C |
| Chi tiết hóa đơn #/hoa-don/:ma | C | C | — | C |
| Khách hàng #/khach-hang | C | C | — | C |
| Hồ sơ/lịch sử mua #/khach-hang/:ma | C | C | — | C |
| Khuyến mãi #/khuyen-mai | C | C | — | C |
| Cảnh báo kho #/canh-bao-kho | C | — | C | C |
| Phiếu nhập #/phieu-nhap | C | — | C | — |
| Chi tiết phiếu nhập #/phieu-nhap/:ma | C | — | C | — |
| Nhân viên #/nhan-vien | C | — | — | — |
| Báo cáo doanh thu #/bao-cao?tab=doanh-thu | C | — | — | — |
| Báo cáo sản phẩm #/bao-cao?tab=san-pham | C | — | — | — |
| Báo cáo khách #/bao-cao?tab=khach-hang | C | — | — | — |
| Kiểm tra dữ liệu #/kiem-tra-du-lieu | C | — | — | — |

Giữ đúng quyền trang người dùng đề xuất; không tự mở dashboard/báo cáo cho role khác chỉ để thuận tiện điều hướng. Trang đầu sau đăng nhập: Quản trị → dashboard; ba role còn lại → sản phẩm. Quyền xem hóa đơn/khách là xem dữ liệu nghiệp vụ của trang đó, **không tự giới hạn theo MaNV người đăng nhập**; điều này khác quyền sở hữu đơn của khách cửa hàng và không thay /store-api.

### 3.2. Quyền theo từng endpoint hiện có

Tất cả dòng là **GET** và đều cần session nhân viên hợp lệ, kể cả health. Không có ngoại lệ public cho /api.

| Endpoint /api | Quản trị | Thu ngân | Kho | Bán hàng |
|---|---|---|---|---|
| /api/health | C | C | C | C |
| /api/danh-muc | C | C | C | C |
| /api/nha-cung-cap | C | — | C | — |
| /api/phuong-thuc-thanh-toan | C | C | — | C |
| /api/dashboard | C | — | — | — |
| /api/san-pham | C | C* | C | C* |
| /api/san-pham/:maSP | C | C* | C | C* |
| /api/hoa-don | C | C | — | C |
| /api/hoa-don/:maHD | C | C | — | C |
| /api/phieu-nhap | C | — | C | — |
| /api/phieu-nhap/:maPN | C | — | C | — |
| /api/khach-hang | C | C | — | C |
| /api/khach-hang/:maKH | C | C | — | C |
| /api/nhan-vien | C | — | — | — |
| /api/khuyen-mai | C | C | — | C |
| /api/canh-bao-kho | C | — | C | C* |
| /api/bao-cao/tong-quan | C | — | — | — |
| /api/bao-cao/doanh-thu | C | — | — | — |
| /api/bao-cao/san-pham | C | — | — | — |
| /api/bao-cao/khach-hang | C | — | — | — |
| /api/kiem-tra-du-lieu | C | — | — | — |

Quyền helper /danh-muc cho các role dùng Sản phẩm; /nha-cung-cap cho Quản trị/Kho dùng lọc Sản phẩm/Phiếu nhập; /phuong-thuc-thanh-toan cho các role dùng Hóa đơn. Helper thanh toán chỉ trả tên phương thức như hiện tại, không mở báo cáo thanh toán.

### 3.3. Đề xuất bổ sung quyền field và bộ lọc (*)

Đây là phần chỉnh hợp lý hơn so với chỉ ẩn trang, cần duyệt cùng tài liệu:
- Thu ngân/Bán hàng xem sản phẩm và giá bán nhưng không nhận DonGiaNhap, MaNCC, TenNCC, NhaCungCap hoặc thông tin NCC lồng nhau. Cùng projection theo role phải áp dụng cho danh sách, chi tiết và Cảnh báo kho của Bán hàng.
- Quản trị/Kho được xem giá nhập/NCC trên những trang đã cấp. Thu ngân không được mở Cảnh báo kho dù sản phẩm vẫn có số tồn như quyền Sản phẩm.
- Thu ngân/Bán hàng không có dropdown NCC và không gọi /nha-cung-cap. Nếu cố gửi maNCC trên /san-pham, server trả 403 trước truy vấn dữ liệu, không dùng bộ lọc làm đường suy luận NCC.
- /nhan-vien trả thống kê doanh thu nên không cấp chỉ để lấy tùy chọn bộ lọc. Hóa đơn/Phiếu nhập dùng ô nhập mã nhân viên đã có; tên/chức vụ nhân viên đi kèm giao dịch vẫn được hiển thị trong phạm vi giao dịch được cấp.
- Query/cột/link giao diện phải theo quyền hiện có, không phát sinh 403 do tự gọi helper bị cấm khi tải trang.
- Không thêm endpoint nhân viên rút gọn, trang NCC hoặc chức năng mới trong đợt này.
- Không trả lương, thông tin xác thực hoặc field nội bộ mới chỉ vì role là Quản trị. Bảo toàn projection nghiệp vụ; bổ sung whitelist sâu cho mọi response.

Các endpoint/tab chưa xây như báo cáo NCC/thanh toán riêng không mặc nhiên được cấp quyền. Mỗi route mới cần khai báo chính sách và test; thiếu chính sách là từ chối.

## 4. Xác thực và chặn quyền tại API

Thứ tự xử lý bắt buộc:
1. Chốt method trên prefix /api: **mọi method khác GET**, gồm POST/PUT/DELETE/HEAD/OPTIONS, trả 405, Allow: GET; không thay bằng 401 vì chưa đăng nhập.
2. Với GET ở mọi đường /api, kiểm session và trạng thái hiện hành. Thiếu/hết phiên/không còn hợp lệ → 401 ADMIN_AUTH_REQUIRED, không đọc dữ liệu nghiệp vụ trước.
3. Route tồn tại nhưng role không được cấp → 403 ADMIN_FORBIDDEN; field/query bị cấm theo role cũng 403. Không lookup document để xác định tồn tại trước khi xét quyền.
4. Sau khi được cấp quyền mới validate query/mã và đọc nghiệp vụ như cũ. Param lạ/lặp, limit>100 vẫn 400; mã không có trên route được cấp vẫn 404.
5. GET đường /api không có route: anonymous vẫn 401, nhân viên hợp lệ nhận 404. Route có handler nhưng quên đăng ký chính sách phải bị chặn 403; không mặc định cho qua.
6. Chuẩn hóa/match path nhất quán với router, không dùng startsWith mơ hồ để cấp quyền; thử cả slash cuối, chữ hoa/thường, mã URL-encode và đường gần giống để tránh bypass.

Không có ngoại lệ auth=false, chế độ bỏ xác thực cho test, role từ header/body/query, hoặc cờ để biến /api thành public. Đọc lại role/trạng thái/liên kết và phiên bản xác thực ở mỗi request bảo vệ; không tin role cũ trong session vô hạn.

Đổi role, MaNV, khóa tài khoản, nhân viên nghỉ hoặc thông tin xác thực đổi phiên bản làm session cũ vô hiệu → 401, yêu cầu đăng nhập lại. Role không được nhận diện hoặc dữ liệu liên kết mâu thuẫn bị chặn. Lỗi DB khi kiểm chứng không cho qua: 503 chung, không biến thành phiên hợp lệ.

## 5. Hợp đồng /admin-auth và session

### 5.1. Endpoint

| Method/đường dẫn | Đầu vào | Kết quả |
|---|---|---|
| GET /admin-auth/session | Không query, không mật khẩu | 200 bootstrap session RAM ẩn danh/đã xác thực; authenticated, csrfToken; nếu có phiên hợp lệ: tên nhân viên, TenDangNhap, role, permissions hiển thị tối thiểu |
| POST /admin-auth/dang-nhap | JSON tenDangNhap, matKhau; CSRF + Origin | 200 và cookie mới khi đúng; không tự cấp quyền do client yêu cầu |
| POST /admin-auth/dang-xuat | JSON rỗng; CSRF + Origin | 200; hủy session nhân viên, hết hạn đúng cookie/path; không tác động session cửa hàng |

Query lạ/lặp, field body ngoài hợp đồng (role, MaNV, điểm...) bị từ chối. Tên đăng nhập case-sensitive theo DB, trim hai đầu, tối đa 64 ký tự chữ/số/gạch dưới/chấm/gạch ngang; mật khẩu không trim/không ép kiểu. JSON giới hạn nhỏ (đề xuất 4 KiB); không gửi password bằng URL/query hoặc log body.

Sai method nhóm /admin-auth trả 405 với Allow đúng route. GET session không ghi DB. Mọi phản hồi xác thực/dữ liệu nhạy cảm Cache-Control: no-store. csrfToken là token chủ động được phép trả cho frontend; SID không có trong JSON.

### 5.2. Cookie và phiên

- Cookie riêng **admin_sid**, httpOnly, SameSite=Strict, không Domain. Path=/ vì /api và /admin-auth không có prefix chung hẹp hơn. Cookie này có thể được trình duyệt gửi kèm /store-api do Path=/, nhưng router cửa hàng phải **bỏ qua hoàn toàn**; hai hệ thống không dùng chung token hay session map.
- store_sid giữ Path=/store-api và hành vi hiện tại. admin_sid không được dùng để xác thực khách; store_sid không được dùng để xác thực nhân viên.
- Secure=true khi HTTPS; local HTTP của bản demo dùng Secure=false, không tuyên bố chống nghe lén như HTTPS.
- SID ngẫu nhiên crypto tối thiểu 32 byte, không trong localStorage/sessionStorage/URL/JSON; server lưu khóa tra cứu băm trong RAM riêng. Giới hạn tối đa 1.000 session và có dọn phiên hết hạn.
- Idle 30 phút, tuyệt đối 8 giờ; tới đúng mốc là hết hạn. Cookie Max-Age tối đa 8 giờ. GET bootstrap/poll session không kéo dài idle để tránh tự giữ phiên chỉ do polling.
- Đăng nhập thành công xoay SID và CSRF; SID cũ không dùng lại. Đăng xuất/hết hạn xóa phiên; cookie malformed/trùng tên bị từ chối, không chọn cookie ngẫu nhiên.
- Restart process làm mất phiên, CSRF và rate-limit RAM. Đọc lại session sau restart cho authenticated=false, không phục hồi từ giá trị cookie cũ; /api trả 401. Không coi cookie còn trên trình duyệt là bằng chứng đăng nhập.
- Không lưu giỏ hàng, MaKH hoặc quote cửa hàng trong session nhân viên. Thay đổi auth của một nhóm không làm đăng xuất nhóm còn lại.

### 5.3. CSRF, Origin, rate limit và lỗi chung

- Mọi POST /admin-auth cần X-CSRF-Token gắn session + Origin bằng chính xác ADMIN_ORIGIN cấu hình (scheme/host/port). Thiếu/sai Origin hoặc token → 403; không chấp nhận Origin thiếu/null, không dựa vào CORS làm bảo vệ.
- ADMIN_ORIGIN lấy từ env hoặc origin local xây từ PORT được kiểm tra; không hard-code URI MongoDB, không tự đổi localhost và 127.0.0.1 cho qua kiểm tra.
- Chặn trước kiểm chứng mật khẩu khi đã quá hạn mức: tối đa 5 lần sai cho cặp IP + TenDangNhap/15 phút, 20 lần sai/IP/15 phút; lỗi tiếp theo 429 và Retry-After. Dùng key băm trong bộ nhớ, giới hạn bucket; không tự quên bucket chưa hết hạn để tránh đầy bộ nhớ.
- Đăng nhập thành công không xóa lịch sử sai của IP để kẻ thử nhiều tài khoản không lách rate limit. Giới hạn KDF tối đa 2 tác vụ đồng thời, hàng đợi tối đa 8 như cơ sở hiện có.
- Giữ lượt thử trong RAM trước khi await KDF để các request đồng thời không cùng vượt ngưỡng; khi thành công chỉ hoàn lượt tạm của chính request đó, không xóa các lần sai trước của IP. Kiểm thử phải có gửi đồng thời thật tới HTTP.
- Tài khoản không tồn tại, password sai, inactive, nhân viên nghỉ, NV_ONLINE, hash riêng thiếu/hỏng đều cùng 401 ADMIN_INVALID_CREDENTIALS và thông báo “Tên đăng nhập hoặc mật khẩu không đúng”; đường không có tài khoản cũng kiểm chứng KDF giả.
- Body sai cấu trúc có thể 400; đó không phải thông báo tài khoản tồn tại. Không trả nguyên lỗi driver/stack, MatKhau, hash, salt, tham số băm, SID, marker, journal hoặc MONGO_URI trong bất kỳ response/log nào.
- Khi toàn bộ môi trường chưa setup collection bảo mật: 503 ADMIN_AUTH_SETUP_REQUIRED chung; không dò từng tài khoản rồi báo riêng “tài khoản chưa băm”.

## 6. Điều kiện đăng nhập và dữ liệu mật khẩu

### 6.1. Điều kiện đồng thời

Chỉ thành công khi:
- TaiKhoan có đúng TenDangNhap và TrangThai = **Hoạt động**.
- Liên kết MaNV khớp giữa TaiKhoan, TaiKhoanQuanTri và NhanVien.
- NhanVien.TrangThai = **Đang làm**.
- MaNV không phải **NV_ONLINE**, không cấp tài khoản đăng nhập hệ thống.
- Role thuộc đúng bốn giá trị ở ma trận; bản ghi bảo mật hoạt động, hash/salt/KDF đúng phiên bản; mật khẩu đúng.

Không tự dùng ChucVu thay cho VaiTro. “Tạm nghỉ”, “Nghỉ việc”, thiếu nhân viên, trạng thái lạ hoặc trùng liên kết đều không được coi là Đang làm.

### 6.2. Collection mới đề xuất TaiKhoanQuanTri

| Field | Kiểu/ràng buộc |
|---|---|
| _id | ObjectId kỹ thuật, không trả API |
| MaTKQT | string mã ngẫu nhiên, unique |
| TenDangNhap | string liên kết TaiKhoan, unique |
| MaNV | string liên kết NhanVien; không áp đặt unique khi schema gốc không bảo đảm một tài khoản/nhân viên |
| MatKhauBam | string base64 khóa dẫn xuất, không phải plaintext |
| Salt | string base64, ngẫu nhiên tối thiểu 16 byte |
| ThamSoBam | object algorithm=scrypt, version=1, N=131072, r=8, p=1, keylen=64 |
| ChinhSachMatKhau | IMPORT_DEMO hoặc DAT_LAI; phân biệt mật khẩu mẫu nhập từ nguồn và mật khẩu đặt lại riêng |
| TrangThaiBaoMat | HoatDong hoặc Khoa |
| PhienBanXacThuc | số nguyên dương, tăng khi reset/thay credential/khóa thủ công |
| NgayTao, NgayCapNhat | BSON Date |

Không lưu mật khẩu rõ, bản sao VaiTro làm nguồn quyền, hash nhanh của mật khẩu nguồn, SID hay CSRF. Unique index theo MaTKQT và TenDangNhap; validator strict trên collection mới. Không sửa validator/index/TaiKhoan gốc. Runtime chỉ đọc repository xác thực; không có API trả danh sách tài khoản/collection mới.

### 6.3. Script setup thủ công bằng Node (thiết kế, chưa tạo/chạy)

Tên dự kiến dưới webapp/scripts/: setup-admin-auth.js. Người dùng review rồi tự chạy Node trong PowerShell; không chạy script này trong Studio 3T. Đọc MONGO_URI/DB_NAME từ env đã chọn, không hard-code kết nối hoặc password trên command line.

Guard nhiều lớp trước bất kỳ ghi nào:
1. DB_NAME phải đúng allowlist chính xác QLSieuThiMini_Test hoặc QLSieuThiMini_Demo; tuyệt đối chặn QLSieuThiMini và tên gần giống.
2. DB thực tế trên connection phải trùng config; DB đích phải tồn tại cùng các collection nguồn. Demo hiện chưa có nên chọn Demo phải dừng, không tạo ngầm.
3. Kiểm tra metadata/schema/index nguồn và mapping; sai/mâu thuẫn dừng, không tự sửa dữ liệu nguồn.
4. Kế hoạch dry-run mặc định chỉ đếm/kiểm tra; chế độ apply phải được người dùng chọn rõ, có guard Test/Demo. Không chạy lại từ server hay test trước khi được cho phép.

Import ban đầu:
- Đọc TaiKhoan với whitelist nội bộ gồm thông tin định danh và **MatKhau chỉ trong RAM của script**; không log, in, ghi temp file hoặc đưa plaintext vào report/journal. Không đọc MatKhau trên DB chính.
- Tạo schema/index TaiKhoanQuanTri idempotent; khác định nghĩa đã duyệt thì dừng, không drop/rebuild tùy tiện.
- Chỉ tạo thông tin xác thực cho nguồn role hợp lệ, tài khoản hoạt động và nhân viên đang làm; loại NV_ONLINE. Băm scrypt với salt riêng, maxmem 256 MiB; không thay password hoặc bản ghi TaiKhoan.
- Với record chưa có: tạo record băm và mapping. Với IMPORT_DEMO đã có: verify password nguồn với hash trong RAM; khớp và mapping không đổi thì skip hoàn toàn, giữ nguyên hash/salt/ngày/phiên bản.
- Nếu mapping, credential hoặc password nguồn khác: dừng/báo số bản ghi xung đột, không âm thầm cập nhật. KDF giả không được coi là dữ liệu hợp lệ để ghi.
- Script dừng khi lỗi; không tuyên bố nguyên tử toàn bộ nhiều tài khoản. Các bản ghi đã tạo đúng được giữ; chạy lại nhận diện/skip để tiếp tục, không rollback bằng drop/delete hay tạo trùng.
- Output chỉ tổng tạo/skip/bị chặn/xung đột và DB đích; không in password/hash/salt, log lỗi driver nguyên bản hoặc URI.
- Chạy lần hai phải không đổi dữ liệu khi nguồn và đích không đổi.

**Mật khẩu mẫu và giới hạn an toàn:** bước khảo sát này không đọc mật khẩu hoặc độ dài. Khi import có thể gặp mẫu ngắn hơn 12 ký tự. Đề xuất chỉ trong Test/Demo: chế độ IMPORT_DEMO chấp nhận chuỗi nguồn không rỗng tối đa 128 ký tự, giữ đúng mật khẩu cũ để minh họa; không nới chính sách khách hàng cửa hàng. Runtime quản trị nhận tối đa 128 ký tự, kiểm chứng KDF; không trim. Băm không làm mật khẩu yếu trở nên mạnh, không tuyên bố phù hợp production. Chuỗi rỗng/quá dài/sai kiểu phải dừng record, không cắt/đổi tự động. Nếu người dùng muốn không dùng mật khẩu mẫu ngắn, sử dụng chế độ đặt lại riêng bên dưới với password mới 12–128 ký tự; đây là chính sách cần duyệt cùng SRS.

Hàm KDF cửa hàng hiện gắn validation 12–128 ký tự: không gọi nguyên trạng để import mẫu ngắn rồi tự nới validator chung. Module/adapter nhân viên giữ tham số scrypt và giới hạn tài nguyên, có chính sách legacy riêng; test phải chứng minh mật khẩu khách hàng vẫn tối thiểu 12 ký tự.

### 6.4. Password đổi sau khi băm

Nguồn xác thực password **sau import là TaiKhoanQuanTri**. TaiKhoan tiếp tục là nguồn TenDangNhap/MaNV/VaiTro/TrangThai, **không phải nguồn password runtime**:
- Ứng dụng không đọc/so sánh trực tiếp TaiKhoan.MatKhau khi đăng nhập, không fallback plaintext khi thiếu hash.
- Nếu ai sửa TaiKhoan.MatKhau ngoài ứng dụng, password băm không tự đổi. Đây là hành vi công bố rõ, không hứa phát hiện ngay khi runtime không đọc plaintext.
- Chế độ import mặc định phát hiện khác biệt trên IMPORT_DEMO thì dừng, không ghi đè. Đồng bộ có chủ ý từ password nguồn cần chế độ thủ công riêng sync-source, chọn rõ tài khoản, dry-run/review rồi apply, chỉ Test/Demo.
- Cách đổi password được khuyến nghị: script Node thủ công chế độ reset, nhập password mới 12–128 ký tự qua terminal ẩn ký tự (không argv, log hay echo), chỉ cập nhật TaiKhoanQuanTri, đặt DAT_LAI, salt/hash mới và tăng PhienBanXacThuc.
- Record DAT_LAI không bị import thường ghi đè về password mẫu cũ; import chỉ kiểm mapping rồi skip. Muốn chuyển lại nguồn mẫu phải chỉ định rõ thao tác riêng sau review.
- Khi reset/sync tăng phiên bản, mọi session nhân viên cũ bị vô hiệu ở request bảo vệ kế tiếp; bắt đăng nhập lại. Thao tác ghi script là nguyên tử trên một credential; thất bại không báo đã đổi thành công.
- Không có API/UI đổi password trong phạm vi này; không sửa TaiKhoan gốc để “đồng bộ ngược”.

## 7. Phạm vi Test/Demo và DB chính

- Bước xây dựng/kiểm thử auth chỉ chạy QLSieuThiMini_Test. Demo chỉ khi đã có, đúng tên allowlist, được người dùng chọn/duyệt; không tạo Demo trong đợt auth.
- Không chạy setup/import/reset/sync trên QLSieuThiMini, không ghi tài khoản/nhân viên/mật khẩu gốc. Không sửa/cắt MatKhau rõ đang có trong dữ liệu mẫu; vì vậy **không tuyên bố DB gốc đã loại plaintext**.
- App không tạo TaiKhoanQuanTri/index/validator ngầm khi thiếu. Runtime không ghi collection bảo mật; chỉ script thủ công được thực hiện sau khi duyệt riêng.
- Đề xuất triển khai bản có auth trước trên Test/3001. Nếu vô tình chạy bản auth với Main: không có fallback public; GET /api anonymous vẫn 401, POST/PUT/DELETE vẫn 405; POST đăng nhập bị chặn 503 ADMIN_AUTH_TARGET_FORBIDDEN mà không lấy MatKhau hoặc ghi Main.
- Do đó việc áp dụng build auth vào server Main sẽ không giữ khả năng xem /api ẩn danh như trước. **Không thể vừa bảo vệ mọi /api vừa giữ Main public** bằng một cờ. Chưa triển khai đăng nhập Main trong SRS này; cần duyệt riêng khi muốn dùng thật trên Main.
- Giữ .env/.env.test ngoài Git. Không tự thay DB đích nếu guard thất bại; báo đúng tên đích bị chặn mà không log URI.
- Runtime store giữ nguyên guard/phạm vi đã duyệt; không dùng việc thêm admin auth để mở ghi Demo hoặc Main cho cửa hàng.

## 8. Giao diện và trải nghiệm

- Trang #/dang-nhap quản trị riêng với nhãn Tên đăng nhập, Mật khẩu; không dùng form SĐT cửa hàng, không chọn role. Password không nằm trong HTML mặc định hoặc lưu trình duyệt bằng JS.
- Bootstrap qua GET /admin-auth/session trước khi tải nghiệp vụ. Anonymous chỉ thấy đăng nhập; không gọi dashboard/danh mục/... để lấy dữ liệu trước xác thực.
- Header sau login có HoTen nhân viên + role thực tế + nút Đăng xuất. Menu chỉ chứa trang được phép; đầu trang phù hợp role.
- Khi 401: dừng request đang chạy, hủy chart/xóa dữ liệu nhạy cảm trong DOM, chuyển đăng nhập với thông báo hết phiên. Chỉ lưu đường quay lại nội bộ được role cho phép; không chấp nhận redirect ra URL ngoài, javascript: hoặc trang cấm.
- Khi 403: giữ phiên, hiển thị “Bạn không có quyền xem mục này”, có link về trang được phép; không lặp redirect đăng nhập hoặc giả thành kết quả rỗng.
- Đăng xuất cần CSRF/Origin; xóa DOM nhạy cảm/session RAM client, không đăng xuất cửa hàng. History/back/tab khác khi truy cập lại phải kiểm session, không giữ dữ liệu cache hiển thị như đã đăng nhập.
- Dùng textContent/DOM API an toàn, không innerHTML; label rõ, focus lỗi/form và focus nội dung khi chuyển trang; loading/lỗi/rỗng, bàn phím/mobile. Không hiện link/cột/bộ lọc mà role không dùng được.
- Wireframe: header [MiniMart] [Họ tên · Role] [Đăng xuất]; sidebar [Các mục được cấp]; vùng nội dung [tiêu đề/bộ lọc/bảng]. Anonymous: [Đăng nhập quản trị] [Tên đăng nhập] [Mật khẩu] [Lỗi chung] [Đăng nhập].
- Nghiệm thu UI phải mở trình duyệt thật; HTTP 200/test pass không đủ để khẳng định UX đạt.

## 9. Ảnh hưởng tới test cũ và cách cập nhật

Hiện có 115 unit test cũ (44 + 36 + 22 + 10 + 3), cộng 4 unit quản trị mới và 2 integration đọc Main/Test của đợt rút gọn. Một số bài có HTTP dù nằm trong nhóm unit; có bài kỳ vọng anonymous GET /api/health = 200.

Không giữ kỳ vọng này bằng bypass:
- Thêm helper đăng nhập thực: GET /admin-auth/session → lấy cookie + CSRF → POST đăng nhập kèm Origin → giữ cookie mới → gọi /api. Test tích hợp phải đi qua đúng middleware production, không gán role trực tiếp vào request hoặc dùng tài khoản “test” bỏ qua KDF.
- Unit hàm thuần không bị thay đổi ý nghĩa; fixture auth repository trong RAM cho test HTTP bộ nhớ, vẫn kiểm chứng KDF/session/CSRF/role thật của module. Không phụ thuộc NODE_ENV để tự cho phép /api.
- Test kỳ vọng API dữ liệu 200/400/404 phải đăng nhập đúng role trước; vẫn giữ toàn bộ assertion dữ liệu. Thêm ca anonymous 401 tương ứng, không đổi 200 thành 401 rồi bỏ phần kiểm số liệu.
- Test /api non-GET vẫn kiểm 405 cả trước và sau đăng nhập, không cần login để giữ assertion này.
- Cập nhật tests/store-routes.test.js và store-catalog-cart-api.test.js tại ca health, cùng admin-readonly-api.test.js, các harness createApp có gọi dữ liệu quản trị và script smoke. Test cửa hàng không lấy admin_sid để truy cập route khách.
- Hàm tạo app không được để thiếu dependency auth thì tự mở API. Cấu hình thiếu phải chặn hoặc fail khởi động rõ ràng; fixture trong bộ nhớ phải cung cấp module auth đầy đủ.
- Tách test tích hợp: kiểm dữ liệu API authenticated trên Test sau khi người dùng chạy setup; Main kiểm 401/405 và guard không cho setup/login. Giữ đối chiếu 4.400.000 ₫/20 HD Main bằng truy vấn đọc trực tiếp hoặc kiểm chứng service chỉ đọc độc lập, không mở lại API Main ẩn danh để giữ test cũ.
- Chưa có credential Test: HTTP test phải **báo prerequisite chưa đạt**, không âm thầm skip rồi tuyên bố pass. Không chạy setup hoặc băm/insert tài khoản trong test API.
- Test có ghi DB tiếp tục chỉ Test và phải có phê duyệt/guard riêng. Các ca trạng thái/role đổi, tạm nghỉ, NV_ONLINE giả và password thay đổi ưu tiên fixture bộ nhớ; không sửa TaiKhoan/NhanVien thật chỉ để test.

## 10. Kế hoạch kiểm thử và tiêu chí nghiệm thu

| Mã | Ca kiểm thử bắt buộc | Kỳ vọng |
|---|---|---|
| AA-01 | Anonymous GET đủ 21 mẫu /api, list/detail, mọi tab báo cáo, dashboard, audit, health | 401; không truy vấn dữ liệu nghiệp vụ trước auth |
| AA-02 | Bốn role × đủ 21 mẫu route, gồm mã tồn tại và không tồn tại | Đúng bảng C→200 (khi dữ liệu hợp lệ), cấm→403 trước lookup mã; không rò dữ liệu |
| AA-03 | POST/PUT/DELETE/HEAD/OPTIONS mọi /api trước/sau login | 405, Allow GET; không side effect |
| AA-04 | CSRF thiếu/sai/phiên khác; Origin thiếu/sai/null trên login/logout | 403; không đăng nhập/đăng xuất nhầm |
| AA-05 | Sai password, không tồn tại, trạng thái tài khoản lạ/khóa | 401 cùng mã/thông báo; dummy KDF, không lộ sự tồn tại |
| AA-06 | Tài khoản hoạt động nhưng NV tạm nghỉ/nghỉ việc/thiếu; role lạ; NV_ONLINE kể cả có hash giả lập | Từ chối; không tự dùng ChucVu suy ra role |
| AA-07 | Giới hạn cặp IP/tên và IP tổng; đổi tên để né; thành công xen giữa; đầy bucket/KDF | 429 + Retry-After đúng; không vượt pool/queue, không reset IP sai cách |
| AA-08 | SID/CSRF xoay sau login; fixation; cookie trùng/malformed | SID cũ không dùng được, token cũ 403, cookie đúng thuộc tính |
| AA-09 | Idle/absolute đúng mốc và +1ms, logout | 401 và redirect; không ghi DB |
| AA-10 | Đọc session/call API sau restart server | authenticated=false; API 401, login lại đúng luồng; không phục hồi từ cookie cũ |
| AA-11 | TaiKhoan đổi role/TrangThai/MaNV, nhân viên nghỉ, credential đổi version (RAM) | Session cũ vô hiệu ở request kế tiếp |
| AA-12 | store_sid + CSRF khách thử /api/admin-auth và ngược lại; login/logout hai bên | Không chia sẻ quyền; đăng xuất một bên không đăng xuất bên kia |
| AA-13 | Thu ngân/Bán hàng gọi list/detail SP; Bán hàng gọi cảnh báo; cố lấy NCC/giá nhập/maNCC filter | Không có field lồng nhạy cảm; route/query cấm 403; UI không tự gọi helper cấm |
| AA-14 | Gọi trực tiếp URL, biến thể slash/case/encode, route mới thiếu policy | Không bypass; route có handler thiếu policy bị chặn |
| AA-15 | Param lạ/lặp, limit101, regex, ngày sai sau login đúng role | Giữ 400/literal regex/quy tắc ngày cũ; không làm yếu validation |
| AA-16 | Quét mọi phản hồi/log, lỗi DB/KDF/body; dữ liệu lồng nhau | Không plaintext/hash/salt/KDF/SID/URI/marker/journal; chỉ CSRF token bootstrap được trả chủ ý |
| AA-17 | Guard setup sai DB/Main/Demo chưa tồn tại, dry-run | Dừng trước ghi; không tự đổi đích hay tạo DB |
| AA-18 | Setup Test thủ công lần 1/lần 2, xung đột mapping/password | Chỉ collection mới; lần 2 không đổi hash/salt/ngày/version khi không thay nguồn; xung đột dừng |
| AA-19 | Import/reset/sync password, DAT_LAI không bị import thường ghi đè | Login đúng nguồn băm mới, phiên cũ hết hiệu lực; TaiKhoan không đổi |
| AA-20 | DB lỗi/setup thiếu/cấu hình auth thiếu/khởi động Main | Fail closed; không public fallback, không auto setup |
| AA-21 | 115 test cũ + 4 unit quản trị, HTTP nghiệp vụ đủ dữ liệu sau auth | Giữ assertion dữ liệu và 405; báo rõ prerequisite/ca chưa chạy |
| AA-22 | UI đủ bốn role, 401/403, Tab/focus, mobile, cache/back sau logout | Menu đúng, không hiển thị lại dữ liệu nhạy cảm, nghiệm thu bằng trình duyệt thật |

AA-18/19 có ghi chỉ chạy sau khi người dùng duyệt và thực hiện trên Test/Demo; không chạy ở bước tài liệu. Script Node setup do người dùng chạy, agent không tự thực hiện chỉ vì SRS được duyệt. Ca biên không ghi dùng RAM.

## 11. Thứ tự triển khai sau khi tài liệu được duyệt

1. Kiểm tra lại chat sửa project, checksum các file bảo vệ; rà cấu trúc auth/code/test sẽ đổi và giữ chỉ một bên sửa.
2. Viết script Node setup có dry-run/guard và module KDF nhân viên; người dùng review script, tự chạy Test. Dừng nếu đích sai, Demo thiếu hoặc credential xung đột; không tự xử lý trên Main.
3. Viết /admin-auth, session/rate limit/CSRF, middleware quyền trên mọi /api và projection theo role; cập nhật test helper.
4. Giao diện login/header/menu/401/403; hồi quy unit và HTTP authenticated trên Test, UI thật nếu công cụ cho phép.
5. Báo cáo file/lệnh/kết quả thật, đếm trước/sau hai DB, checksum, phần chưa kiểm chứng; dừng chờ nghiệm thu. Main không được setup hay mở đăng nhập trong đợt này.

Mỗi bước gặp prerequisite cần người dùng chạy thủ công phải báo rõ việc cần làm, không vòng guard. Không tuyên bố đạt test chưa chạy. Báo cáo tách ĐÃ HOÀN THÀNH / CHƯA HOÀN THÀNH / CHƯA KIỂM CHỨNG.

## 12. Bảo toàn và checksum

Bước tài liệu chỉ tạo webapp/SRS_ADMIN_AUTH.md; không viết code ứng dụng, script setup hoặc test mới, không restart server, không ghi DB. Hash trước bước này của 10 file gốc và hai SRS cũ:

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

Khi hoàn tất phải so lại 12 hash này; mọi sai khác phải báo, không sửa ngược để che thay đổi. Các đợt sau cũng giữ các file đã được yêu cầu bảo vệ; nếu cần điều chỉnh đặc tả auth phải sửa SRS_ADMIN_AUTH.md theo phiên bản được duyệt, không sửa hai SRS cũ.
