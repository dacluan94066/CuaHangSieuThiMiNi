# Báo cáo S1 — Nền cửa hàng và tài khoản

Ngày: 15/11/2026. Theo SRS_STORE.md v1.0, hướng standalone đã được duyệt.

## 1. Trạng thái và phạm vi

**ĐÃ HOÀN THÀNH:** mã nền S1, 3 script setup để review/chạy thủ công, module store riêng, preflight chỉ đọc, session/CSRF, tài khoản khách, unit test, harness API có guard, benchmark scrypt và hồi quy quản trị.

**CHƯA HOÀN THÀNH:** chuẩn bị bản sao DB Test và chạy setup do người dùng thực hiện; kiểm thử tích hợp có ghi và nghiệm thu S1 trên DB Test đang chờ các bước thủ công đó. Không tiến S2.

**CHƯA KIỂM CHỨNG:** 3 script trên MongoDB/Studio 3T thật, khả năng chạy lại idempotent thực tế, validator/index sau setup, đăng ký/đăng nhập bằng tài khoản DB thật, phục hồi đăng ký khi mất kết nối thật/crash, hành vi cookie trong trình duyệt/HTTPS. Chỉ unit/memory test không đủ để xác nhận các mục này.

Không làm catalog, giỏ hoặc đặt hàng. Chưa làm giao diện `/shop/` trong S1 này; không khẳng định UI cửa hàng đã hoạt động. Không chạy lại 01–07, không restore, không chạy script setup, không ghi QLSieuThiMini hoặc QLSieuThiMini_Test. Không sửa SRS.md, SRS_STORE.md, 01–09, README.md hoặc `.env` đang dùng.

## 2. File tạo và sửa

Mọi đường dẫn dưới đây tương đối với `webapp/`.

| Loại | File | Nội dung |
|---|---|---|
| Tạo | `db-setup/01_store_schema_indexes.js` | Guard Test trước ghi; lên kế hoạch và kiểm tra xung đột trước DDL; tạo collection/index mới, mở rộng validator bằng AND giữ validator cũ; không drop |
| Tạo | `db-setup/02_online_employee.js` | Chỉ thêm NV_ONLINE nếu thiếu; không ghi đè nhân viên cũ, không tạo TaiKhoan nhân viên |
| Tạo | `db-setup/90_test_fixtures.js` | Fixture tùy chọn, chỉ Test: TEST_SP_LAST, TEST_KM_LIVE, TEST_KM_EXPIRED; chỉ setOnInsert, không reset tồn/điểm/gia hạn khi chạy lại |
| Tạo | `src/store/schema.js` | Contract validator/index dùng khi preflight; manifest trong script 01 khớp bằng unit test, runtime không import/thực thi script setup |
| Tạo | `src/store/database.js`, `guards.js`, `preflight.js` | Kết nối riêng khỏi facade admin; guard đích ghi; kiểm tra metadata/hello/NV/journal chỉ đọc |
| Tạo | `src/store/accounts.js` | Đăng ký có journal/ownership/hoàn tác, đăng nhập và hồ sơ theo MaKH session; không gắn SĐT mới vào khách legacy |
| Tạo | `src/store/passwords.js`, `validation.js` | scrypt bất đồng bộ, pool 2 tác vụ/hàng đợi 8; chuẩn hóa SĐT, validate body allowlist |
| Tạo | `src/store/rate-limit.js`, `sessions.js` | Rate limit, session trong bộ nhớ, xoay SID/CSRF khi login, cookie httpOnly/SameSite/CSRF+Origin |
| Tạo | `src/store/router.js`, `errors.js` | 5 endpoint S1, chốt method/query/body, DTO allowlist, lỗi sạch có requestId |
| Tạo | `tests/store-security.test.js`, `store-contract.test.js` | Bảo mật và guard/schema/preflight, không kết nối DB |
| Tạo | `tests/store-registration.test.js`, `helpers/store-memory.js` | Ca lỗi và phục hồi đăng ký bằng dữ liệu giả trong bộ nhớ |
| Tạo | `tests/store-routes.test.js` | HTTP với service giả trong bộ nhớ: session/auth/CSRF/method/DTO; không MongoDB |
| Tạo | `tests/store-api.test.js` | Harness có ghi DB thật cho người dùng chạy SAU restore/setup; chưa thực thi |
| Tạo | `scripts/benchmark-scrypt.js` | Benchmark CPU/RSS trong process con, không config/DB |
| Tạo | `scripts/inspect-store.js` | Chỉ đọc metadata, hello, version, counts, tên collection và sự tồn tại DB Test |
| Tạo | `scripts/s1-readonly-smoke.js` | Server tạm tự đóng; GET quản trị/GET store và kiểm tra method admin; không request ghi store |
| Tạo | `BATCH_STORE_S1_REPORT.md` | Báo cáo này, hướng dẫn thủ công và checksum |
| Sửa | `server.js` | Gắn store, startup preflight chỉ đọc, đóng kết nối khi dừng; không chạy setup/recovery lúc boot |
| Sửa | `src/app.js` | Mount `/store-api` riêng sau `/api`, giữ nguyên guard GET-only và router admin |
| Sửa | `src/config.js` | STORE_ORIGIN, cookie Secure theo HTTPS, STORE_WRITE_ENABLED mặc định false; S1 chỉ bật ghi khi DB_NAME đúng Test |
| Sửa | `.env.example` | Thêm origin local và cờ ghi false; không sửa `.env` thật |
| Sửa | `package.json` | Thêm lệnh test store/benchmark; giữ dependencies và lệnh chạy 44 test cũ |

Không cài thêm dependency, không chạy npm install, không đổi package-lock.json. Cơ chế session/rate limit một process và mất khi restart đúng giới hạn SRS.

## 3. Guard và hành vi tài khoản

- **S1 chỉ cho ghi `QLSieuThiMini_Test`.** Cả ba script có DB_NAME cố định Test và so với `db.getName()` trước ghi; không tự getSiblingDB sang đích khác. Main không có đường bật ghi S1 chỉ bằng sửa cờ. Nếu sau này cần mở DB chính phải có phê duyệt mới, không nằm trong lần này.
- Runtime đăng ký kiểm tra STORE_WRITE_ENABLED=true và tên cấu hình/DB thực tế đều đúng Test trước writer. Khởi động không gọi writer; thiếu setup trả STORE_SETUP_REQUIRED khi nghiệp vụ cần DB.
- Harness không dùng `.env` dự phòng, yêu cầu DB_NAME chính xác và cờ xác nhận thủ công, kiểm tra actual databaseName và preflight. Tự mở server cổng ngẫu nhiên, không gọi server 3000 đang nối DB chính.
- Tài khoản khách tách khỏi TaiKhoan nhân viên; scrypt N=131072/r=8/p=1, salt 16 byte, key 64 byte, maxmem 256 MiB, không hash nhanh/mật khẩu rõ. Tham số bất thường trong record bị từ chối và kiểm chứng KDF giả, không dùng N do DB/client điều khiển để tiêu thụ tài nguyên tùy ý.
- Login trả cùng lỗi INVALID_CREDENTIALS cho số không có/mật khẩu sai. Attempt được giữ chỗ trước lookup/KDF để request song song không vượt ngưỡng; login thành công không tính là lần sai. 5 lần/SDT+IP và 20 lần/IP trong 15 phút, giới hạn bộ nhớ bucket.
- Session ID/CSRF ngẫu nhiên, cookie httpOnly/SameSite=Strict/Path=/store-api; HTTPS Secure, local HTTP không Secure. Idle 30 phút, tuyệt đối 8 giờ. Cookie SID không nằm trong JSON; chỉ token CSRF được trả có chủ ý ở bootstrap/login.
- Mọi POST S1 đều bắt buộc CSRF và Origin, gồm signup/login/logout; chốt query lạ, body lạ, JSON <=16 KiB. Chưa có PATCH/DELETE store trong S1; method không được khai báo trả 405 hoặc route ngoài phạm vi 404.
- Đăng ký tạo KH_ONL_.../TKKH_..., khách 0 điểm, không tự login. Journal không chứa password/hash. Khi lỗi chỉ hoàn tác bản ghi đúng MaYeuCauDangKy sở hữu; tài khoản đã active thì hoàn thiện tiến về trước.
- Recovery có ghi chỉ diễn ra trong request đăng ký hợp lệ, sau guard Test và dưới hàng đợi một process; **startup/preflight không tự phục hồi có ghi**. GET/login thấy pending trả RECOVERY_PENDING. Tác vụ chưa phân định không bị đoán là thất bại để xóa dữ liệu.
- DTO hồ sơ loại hash/salt/nội bộ. Không log URI, password, cookie, body hoặc lỗi driver thô. Không cung cấp endpoint tài khoản khách khác.

## 4. Lệnh đã chạy và kết quả thực tế

Các lệnh dưới chạy từ thư mục `webapp/`, trừ lệnh checksum/kiểm tra đường dẫn từ root project.

| Lệnh/thao tác | Kết quả thực tế |
|---|---|
| `node -v`, `npm -v` | v24.16.0 và 11.13.0 |
| `npm run test:unit` | **44 tests, 44 pass, 0 fail**, không sửa file test cũ |
| `npm run test:store:unit` | **36 tests, 36 pass, 0 fail**; gồm scrypt thật và test bộ nhớ, không MongoDB; xem kết quả xác nhận cuối lượt S1 |
| `npm run benchmark:scrypt` | Thành công, kết quả mục 5; không DB |
| `node --check` cho server/module/store/script/test | Thành công; chỉ parse script setup, không thực thi thân script |
| Render manifest script 01 từ schema bằng Node/fs | Chỉ ghi file JavaScript để review, không import driver/không kết nối DB/không chạy DDL |
| `node scripts/inspect-store.js` trước/sau | MongoDB 8.3.8, standalone; Main giữ 9 collection/số đếm, chưa có Test; chưa setup cửa hàng |
| `node scripts/s1-readonly-smoke.js` | **34/34 kiểm tra HTTP đạt**, server tạm 127.0.0.1:50471 đã tự đóng, số request ghi store = 0 |
| `Test-Path D:\MongoBackup\truoc_cua_hang` và thư mục con QLSieuThiMini | Cả hai false tại lúc kiểm tra; chưa tìm thấy bản backup ở đường dẫn này |
| `Get-Command mongorestore,mongodump` | Không tìm thấy hai công cụ qua PATH trong phiên kiểm tra; chưa kết luận không cài ở đường dẫn khác |
| `Get-FileHash -Algorithm SHA256` trước/sau | **12/12 file giữ nguyên**, xem mục 9 |
| Thử `npm start` với PORT=3002, origin 3002, ghi false | **Bị cơ chế phê duyệt tự động chặn trước chạy**, công cụ trả “blocked by policy”; không có startup log/npm-start result để khẳng định |
| `npm run test:store:api` | **CHƯA CHẠY**, chờ người dùng restore/setup/xác nhận DB Test |

Test contract chỉ thực thi **đoạn khai báo DB_NAME và guard** trong VM với db.getName giả; không thực thi script setup. Unit mô phỏng phục hồi không chứng minh khả năng phục hồi MongoDB thực tế. Kết quả benchmark, unit và read-only smoke không in URI; luồng lỗi giả chứa secret được kiểm tra trả lỗi chung. Log khởi động thật bằng npm start chưa kiểm chứng vì lệnh bị chặn.

### 4.1. HTTP thật, dữ liệu từ DB chính, không ghi

| GET đã gọi | HTTP | Số liệu khi có phân trang |
|---|---:|---:|
| `/api/health` | 200 | Kết nối được |
| `/api/danh-muc` | 200 | 6 |
| `/api/nha-cung-cap` | 200 | 6 |
| `/api/phuong-thuc-thanh-toan` | 200 | 4 |
| `/api/dashboard` | 200 | Có phản hồi |
| `/api/san-pham` và `/api/san-pham/SP001` | 200 | Danh sách 20 |
| `/api/canh-bao-kho` | 200 | 4 |
| `/api/hoa-don` và `/api/hoa-don/HD009` | 200 | Danh sách 20 |
| `/api/phieu-nhap` và `/api/phieu-nhap/PN001` | 200 | Danh sách 10 |
| `/api/khach-hang` và `/api/khach-hang/KH001` | 200 | Danh sách 10 |
| `/store-api/session` | 200 | Session ẩn danh trong bộ nhớ, không DB write |
| `/store-api/tai-khoan` | 401 | Chưa đăng nhập |
| `/store-api/session?unknown=1` | 400 | UNKNOWN_PARAMETER |
| `/store-api/san-pham`, `/store-api/gio-hang`, `/store-api/don-hang` | 404 | Chưa triển khai, đúng phạm vi S1 |

POST/PUT/DELETE lần lượt vào `/api`, `/api/health`, `/api/san-pham`, `/api/hoa-don`: **12 phản hồi đều 405**. `/api/san-pham?limit=101` và `?unknown=1`: đều **400**. Tất cả 34 phản hồi JSON đã được scan không có MatKhau/hash/salt/URI. Không gửi POST store vào Main dù dự kiến bị guard chặn.

### 4.2. HTTP chỉ trong unit bộ nhớ

Đã thử bootstrap/session, tài khoản 401 trước login; CSRF thiếu/sai/token cũ/Origin sai bị từ chối; đăng nhập sai 401, login giả thành công xoay cookie/token, GET hồ sơ đúng khách, logout vô hiệu cookie. Body dư field 400, JSON sai 400, body quá lớn 413, lỗi service có nội dung bí mật trả 500 chung; HEAD/OPTIONS sai method 405. Đây là HTTP thật với **service giả**, chưa dùng tài khoản MongoDB thật.

## 5. Benchmark scrypt thật trên máy

CPU: AMD Ryzen 5 5500U with Radeon Graphics; RAM hệ thống khoảng 32.091 MiB, Windows, Node v24.16.0. Cấu hình N=131072, r=8, p=1, keylen=64, maxmem=256 MiB/tác vụ. Dùng crypto.scrypt bất đồng bộ; 3 mẫu mỗi chế độ, mỗi chế độ ở process con riêng, lấy mẫu RSS mỗi 5 ms. Không kết nối DB.

| Chế độ | Ba mẫu thời gian (ms) | Trung bình | RSS nền | RSS đỉnh đo được | Chênh RSS |
|---|---|---:|---:|---:|---:|
| 1 phép băm/lần | 313,00 / 296,72 / 301,71 | **303,81 ms/lần** | 48,87 MiB | **177,39 MiB** | 128,52 MiB |
| 2 phép băm đồng thời | 334,43 / 330,10 / 331,90 | **332,14 ms/cặp** | 48,47 MiB | **304,96 MiB** | 256,49 MiB |

`process.resourceUsage().maxRSS` lần lượt 181.644 KiB và 312.276 KiB. RSS là bộ nhớ process, không phải heap JS hoặc phép tính lý thuyết theo N; số lấy mẫu có giới hạn độ phân giải 5 ms. Không suy ra SLA tải thực tế từ 3 mẫu hoặc coi maxmem là mức RSS process tối đa. Giữ độ khó đã duyệt và giới hạn 2 tác vụ; không hạ N.

Tham khảo cách tính/giới hạn API: [Node.js v24 crypto.scrypt](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

## 6. DB thực tế trước/sau S1

Đọc MongoDB Server **8.3.8**, topology **standalone**. Preflight chỉ đọc báo `STORE_SETUP_REQUIRED`: thiếu TaiKhoanKhachHang, YeuCauCuaHang, các validator/index cửa hàng và NV_ONLINE. Đây là trạng thái dự kiến vì chưa chạy setup, không tự sửa.

| Collection | Chuẩn | Trước | Sau | Kết luận |
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

DB chính vẫn chỉ có 9 collection trên. `QLSieuThiMini_Test` chưa xuất hiện trong listDatabases. Chưa có kết quả Test để đối chiếu; không lấy số Main làm kết quả test ghi.

## 7. Việc người dùng cần làm thủ công

**Những lệnh ở mục này là hướng dẫn, CHƯA được chạy.** Chỉ thực hiện sau khi review script. Dùng đúng bản sao; không thay DB_NAME trong script sang Main ở S1.

### Bước 1 — Kiểm tra công cụ và backup trong PowerShell

```powershell
Get-Command mongorestore, mongodump
mongorestore --version
Test-Path -LiteralPath 'D:\MongoBackup\truoc_cua_hang\QLSieuThiMini\SanPham.bson'
Get-ChildItem -LiteralPath 'D:\MongoBackup\truoc_cua_hang\QLSieuThiMini'
```

Hiện đường dẫn backup chưa có và công cụ chưa nằm trong PATH. Kiểm tra vị trí backup thực tế/công cụ theo `09_backup_restore.md`. Nếu tool được cài ngoài PATH, dùng đường dẫn .exe đã xác minh; không đoán đường dẫn rồi chạy. Nếu cần tạo backup mới đúng thư mục yêu cầu, người dùng tự chạy lệnh sau sau khi kiểm tra công cụ; đây là đọc DB chính và ghi file backup, không phải restore/ghi DB chính:

```powershell
mongodump --uri="mongodb://localhost:27017" --db="QLSieuThiMini" --out="D:\MongoBackup\truoc_cua_hang"
```

Không trộn backup cũ với mới trong cùng thư mục. Chỉ restore khi thấy đủ BSON/metadata của bản backup được chọn.

### Bước 2 — Xác nhận đích Test chưa có dữ liệu trong Studio 3T

Chạy đoạn **chỉ đọc** trong IntelliShell trên cùng MongoDB local:

```javascript
var target = db.getSiblingDB("QLSieuThiMini_Test");
if (target.getName() !== "QLSieuThiMini_Test") throw new Error("Sai DB đích");
print("Đích: " + target.getName());
printjson(target.getCollectionNames().sort());
if (target.getCollectionNames().length !== 0) throw new Error("DỪNG: Test đã có collection; không restore chồng, không drop tự động.");
```

Chỉ chọn sibling DB và đọc không tạo database. Nếu đã có collection, dừng và báo lại để quyết định cách chuẩn bị đích; không dùng `--drop`, không xóa Main hoặc tự sửa namespace.

### Bước 3 — Restore ánh xạ namespace trong PowerShell

```powershell
mongorestore --uri="mongodb://localhost:27017" --nsInclude="QLSieuThiMini.*" --nsFrom="QLSieuThiMini.*" --nsTo="QLSieuThiMini_Test.*" "D:\MongoBackup\truoc_cua_hang"
```

Chạy trong PowerShell, **không trong Studio 3T IntelliShell**. Chỉ đích Test, không `--drop`. Cấu trúc backup phải là thư mục trên chứa thư mục con `QLSieuThiMini/` đúng Bước 1. URI local là ví dụ trong hướng dẫn, không hard-code vào code ứng dụng.

### Bước 4 — Đếm/check đúng DB trước setup trong Studio 3T

```javascript
db = db.getSiblingDB("QLSieuThiMini_Test");
if (db.getName() !== "QLSieuThiMini_Test") throw new Error("Sai DB đích");
print("DB chuẩn bị setup: " + db.getName());
printjson(db.getCollectionNames().sort());
["DanhMuc", "NhaCungCap", "SanPham", "KhachHang", "NhanVien", "TaiKhoan", "KhuyenMai", "HoaDon", "PhieuNhap"].forEach(function (name) {
  print(name + ": " + db.getCollection(name).countDocuments({}));
});
printjson(db.KhachHang.getIndexes());
printjson(db.HoaDon.getIndexes());
```

Mốc mong đợi trước setup: **6/6/20/10/6/6/5/20/10**. Lệch thì dừng, báo số thực tế, không chạy lại script 01–07 gốc để sửa.

### Bước 5 — Review và chạy setup thủ công trong Studio 3T

Giữ shell đang chọn `QLSieuThiMini_Test`. Dùng Load file, chạy toàn bộ từng file theo thứ tự:

1. `webapp/db-setup/01_store_schema_indexes.js`.
2. `webapp/db-setup/02_online_employee.js`.
3. `90_test_fixtures.js` là **tùy chọn** cho ca sản phẩm/coupon tương lai, không cần cho auth S1. Không tạo tài khoản hoặc mật khẩu mẫu.

Script tự chặn nếu đang chọn DB chính/admin/khác. Nếu script báo conflict/thiếu index/validator, dừng và gửi kết quả; không drop/rebuild/đổi schema thủ công để bỏ qua. Có thể chạy lại 01/02 để kiểm chứng idempotent sau khi lượt đầu thành công; việc này do người dùng thực hiện. Script 01 giữ validator gốc bằng AND, không thay toàn bộ bằng schema cửa hàng.

Sau 01+02, Test mong đợi: 11 collection, NhanVien **7**, các số khác ở 9 collection gốc giữ nguyên. Nếu chạy 90, có thêm 1 sản phẩm và 2 KM riêng Test: SanPham **21**, KhuyenMai **7**; không đổi tồn/điểm của dữ liệu gốc. Mã TEST_KM_LIVE hết hạn sau 30 ngày từ lần tạo đầu, chạy lại không gia hạn.

### Bước 6 — Kiểm tra preflight Test trong PowerShell

```powershell
Set-Location -LiteralPath 'D:\DaiHocNam4\DoAnNoSQL\QLSieuThiMini_Studio3T\webapp'
$env:MONGO_URI = 'mongodb://localhost:27017'
$env:DB_NAME = 'QLSieuThiMini_Test'
$env:PORT = '3001'
$env:STORE_ORIGIN = 'http://localhost:3001'
$env:STORE_WRITE_ENABLED = 'false'
node scripts/inspect-store.js
```

Phải thấy `dbName=QLSieuThiMini_Test`, `topology=standalone`, `ready=true`, không problem/pending. Đây chỉ đọc, chưa bật ghi. Không chia sẻ nội dung `.env` hoặc URI chứa mật khẩu khi báo lỗi.

### Bước 7 — Chỉ sau xác nhận restore/setup, chạy test ghi Test

Có thể báo lại cho tôi rằng đã hoàn tất các bước trên để tiếp tục kiểm chứng S1. Nếu tự chạy harness đã review, trong terminal Test riêng:

```powershell
if ($env:DB_NAME -cne 'QLSieuThiMini_Test') { throw 'DỪNG: sai DB test' }
$env:STORE_WRITE_ENABLED = 'true'
$env:STORE_API_WRITE_TESTS = 'I_RESTORED_QLSieuThiMini_Test'
npm run test:store:api
```

Trước khi chạy harness, **dừng mọi server cửa hàng khác đang dùng DB Test**; chỉ một process ghi, không chạy server Test và harness đồng thời. Harness tự mở/đóng server cổng ngẫu nhiên, không gọi port 3000 hoặc tự tạo index. Bài test tạo một tài khoản `[TEST] S1 API` với SĐT/mật khẩu ngẫu nhiên, kiểm tra trùng/login/logout/hồ sơ/CSRF, giữ bản ghi Test làm bằng chứng; không in mật khẩu/hash. Mỗi lần thành công tăng Test KhachHang/TaiKhoanKhachHang/journal thêm 1; không kỳ vọng luôn đúng số gốc sau khi đã test. Không có bước dọn/xóa tự động DB chính.

Nếu cần giữ server Test để kiểm tra riêng sau khi review:

```powershell
if ($env:DB_NAME -cne 'QLSieuThiMini_Test') { throw 'DỪNG: sai DB test' }
npm start
```

Mở đúng `http://localhost:3001` theo STORE_ORIGIN; dùng 127.0.0.1 thay localhost trong trình duyệt sẽ không khớp Origin đã cấu hình. Chưa có UI shop S1; API cần cookie/CSRF đúng hợp đồng. Dùng terminal Test riêng, đóng khi xong để không mang cờ Test sang phiên chạy Main. Không sửa `.env` Main.

## 8. Lỗi, xử lý và giới hạn còn lại

- Không có test thất bại trong các lượt unit đã chạy. Khi rà soát đã siết preflight để không chấp nhận index TTL kể cả TTL=0, và làm sạch lỗi harness để node:test không in driver error/URI thô.
- Backup và DB Test chưa có: không tự tạo/restore; chờ người dùng chuẩn bị theo mục 7. Không chạy harness ghi để “thử xem”.
- Lệnh mở npm start bị cơ chế phê duyệt tự động chặn với lý do duy nhất “blocked by policy”. Đã thay phần kiểm tra HTTP bằng server tạm hữu hạn, ghi store=false, tự đóng; không coi đó là kết quả npm start thật.
- Setup mới chỉ parse và kiểm tra contract/guard bằng unit, chưa kiểm chứng hành vi helper mongosh/Studio 3T hoặc DDL thật. Quyền DB, write concern journal và idempotence thực tế còn cần Test.
- Standalone không bảo đảm atomic nhiều document; khả năng recovery mới thử trong bộ nhớ. Chỉ một process, không có hệ thống khác đồng thời sửa bản ghi/marker. Nếu dữ liệu không phân định được phải dừng để xem xét.
- Session/rate limit mất khi restart, không có account management, reset password hay OTP. Không tự nhận tài khoản legacy theo SĐT. Main vẫn bị chặn ghi ngay cả sau setup nếu không có một đợt phê duyệt mở đích riêng.

## 9. SHA-256 trước/sau — 12/12 giữ nguyên

Các hash dưới đây đã được đọc lại sau khi sửa code, so với baseline đầu S1; tất cả bằng nhau. SRS_STORE.md dùng đúng file hiện có khi bắt đầu S1, không sửa để cập nhật trạng thái phê duyệt.

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

**Điểm dừng:** chờ người dùng review mã/script S1, chuẩn bị Test và xác nhận bước kiểm chứng tiếp theo; chưa chuyển S2.
