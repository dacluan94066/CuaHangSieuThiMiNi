# S1 — Kết quả chuẩn bị và kiểm chứng DB Test

Ngày thực hiện: 15/11/2026. Báo cáo bổ sung cho `BATCH_STORE_S1_REPORT.md`.

Người dùng cho phép ngoại lệ có giới hạn: tự backup DB chính, restore sang Test trống, chạy các script setup Test hai lần và kiểm thử S1 trên Test. Ngoại lệ này không mở quyền ghi DB chính và không sửa SRS_STORE.md.

## 1. Kết luận và điểm dừng

**ĐÃ HOÀN THÀNH:** các bước 1–5, kiểm thử S1 trên MongoDB Test thật và hồi quy. Backup/restore thành công, script setup idempotent, không có test thất bại. DB chính giữ nguyên dữ liệu và cấu trúc; các file được bảo vệ giữ nguyên SHA-256.

**CHƯA HOÀN THÀNH:** khởi động thật bằng `npm start`. Lệnh đã bị cơ chế phê duyệt tự động chặn trước chạy với lý do duy nhất “blocked by policy”. Đã dừng thao tác tại đây theo yêu cầu; không thử phương thức khởi động khác. Mục 8 có lệnh để người dùng chạy thủ công.

**CHƯA KIỂM CHỨNG:** startup log/tiến trình tạo bởi npm start, cookie trong trình duyệt thật/HTTPS; crash hoặc mất mạng thật trong lúc đăng ký. Hai trạng thái đăng ký bị gián đoạn đã được tạo và phục hồi trên DB Test thật, nhưng không dùng việc đó để tuyên bố đã thử kill process/mất mạng thực tế. Không làm S2 hoặc giao diện catalog/giỏ/đặt hàng.

## 2. Công cụ và backup — bước 1, 2

Đã tìm thấy MongoDB Database Tools đi kèm Studio 3T, ngoài PATH:

```text
C:\Users\Admin\.3T_community\third-party\2025.1.0\tools\100.9.x\mongodump.exe
C:\Users\Admin\.3T_community\third-party\2025.1.0\tools\100.9.x\mongorestore.exe
```

Đã chạy `--version` lần lượt và cả hai đều thành công: **100.9.4**, windows/amd64, Go 1.20.12. Không cài công cụ hoặc sửa PATH.

Đã chạy mongodump bằng đường dẫn đầy đủ, các tham số:

```powershell
--uri="mongodb://localhost:27017" --db=QLSieuThiMini --out="D:\MongoBackup\truoc_cua_hang"
```

Hoàn tất lúc khoảng 20:03:51 giờ Việt Nam. Thư mục `D:\MongoBackup\truoc_cua_hang\QLSieuThiMini\` có đủ **9 BSON và 9 metadata JSON** tương ứng. Tổng **89 document**, không có lỗi dump. Đã kiểm tra đúng tên từng file, không chỉ tổng số file. Không phục vụ thư mục backup qua web.

## 3. Kiểm tra đích trống và restore — bước 3, 4

Trước restore đã đọc `getCollectionInfos` trên đúng `QLSieuThiMini_Test`: **0 collection**, đích trống. Không drop hoặc dùng --drop.

Đã chạy mongorestore bằng đường dẫn đầy đủ, các tham số:

```powershell
--uri="mongodb://localhost:27017" --nsInclude="QLSieuThiMini.*" --nsFrom="QLSieuThiMini.*" --nsTo="QLSieuThiMini_Test.*" "D:\MongoBackup\truoc_cua_hang"
```

Kết quả: **89 document restored successfully, 0 failed**, khoảng 20:04:13 giờ Việt Nam. Sau restore:

- Test có đúng 9 collection, số đếm **6/6/20/10/6/6/5/20/10**.
- Đã đối chiếu options/validator và toàn bộ index từng collection với DB chính, bỏ riêng thông tin namespace/build UUID khi so sánh. Thứ tự field của compound index cũng được đối chiếu.
- **9/9 validator/options và 9/9 bộ index khớp**, tổng 22 index, gồm các index `_id_`.
- DB chính vẫn đúng số đếm chuẩn ở thời điểm kiểm tra này.

## 4. Chạy setup và kiểm tra idempotent — bước 5

Đã đọc guard của cả ba script: DB_NAME phải đúng `QLSieuThiMini_Test` và bằng `db.getName()` trước mọi ghi. Không sửa guard hoặc tự đổi đích khi chạy.

Mỗi script chạy bằng mongosh 2.4.2 đi kèm Studio 3T, kết nối rõ `/QLSieuThiMini_Test`, tham số `--quiet --norc --file`. Không chạy lại các file 01–07 gốc.

| Script | Lần 1 | Lần 2 | Đối chiếu sau lần 2 |
|---|---|---|---|
| `01_store_schema_indexes.js` | Tạo 2 collection, mở rộng 3 validator, tạo 9 index | 0 collection, 0 validator, 0 index cần tạo/sửa | Toàn bộ dữ liệu và metadata giữ nguyên |
| `02_online_employee.js` | Tạo NV_ONLINE, không tạo TaiKhoan nhân viên | Nhận ra nhân viên đã tồn tại, giữ ngày vào làm | Toàn bộ dữ liệu và metadata giữ nguyên |
| `90_test_fixtures.js` | Tạo TEST_SP_LAST và 2 KM Test | Không đặt lại tồn/điểm/ngày KM | Toàn bộ dữ liệu và metadata giữ nguyên |

Sau lần 1 của cả ba script, Test có 11 collection, 33 index. Số gốc thay đổi có chủ ý chỉ trên Test: SanPham 21, NhanVien 7, KhuyenMai 7; các số khác vẫn như sau restore. Hai collection mới chưa có document.

Trước khi chạy lần 2 đã lấy dấu kiểm toàn bộ document theo EJSON chuẩn hóa, count, options/validator và index. Sau **từng script** lần 2 đã so lại cả Main và Test, đều không đổi:

| Database | Fingerprint trước/sau từng lần chạy lại |
|---|---|
| QLSieuThiMini | `bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916` |
| QLSieuThiMini_Test | `6dd27c2701cf46115cc2db4d3c1c3e3040ed455adba119d2b79907eabb59b123` |

Đã chạy preflight chỉ đọc sau setup: MongoDB **8.3.8**, **standalone**, `ready=true`, `setupReady=true`, problems rỗng, pending registration/order đều 0.

## 5. Kiểm thử S1 — bước 6

Không có server cửa hàng Test khác chạy đồng thời. Harness mở server cổng ngẫu nhiên và đóng khi xong; mọi writer/fixture đều guard DB Test, không dùng server Main cổng 3000.

| Lệnh đã chạy | Kết quả |
|---|---|
| `node --check tests/store-api.test.js` | Thành công |
| `npm run test:store:unit` | **36/36 pass**, 0 fail; khoảng 2,32 giây |
| `npm run test:unit` | **44/44 pass**, 0 fail; khoảng 0,17 giây |
| `npm run test:store:api` | **1/1 integration test pass**, bao gồm **26 kiểm tra HTTP**, 0 fail; khoảng 5,49 giây |

Harness ghi dùng cấu hình Test rõ ràng, STORE_WRITE_ENABLED=true và cờ xác nhận restore. Lần này việc restore/setup do agent thực hiện theo ngoại lệ được người dùng cấp; không phải tự bỏ qua yêu cầu phê duyệt.

### 5.1. HTTP với DB thật

| Tình huống | Kết quả đã quan sát |
|---|---|
| GET session ẩn danh | 200, có CSRF token |
| GET tài khoản chưa đăng nhập | 401 AUTH_REQUIRED |
| Thiếu CSRF trên signup/login/logout | Cả 3 đều 403 CSRF_INVALID |
| Đăng ký khách mới | 201; khách mới có 0 điểm |
| Đăng ký trùng SĐT | 409 REGISTRATION_UNAVAILABLE |
| Mật khẩu sai | 401 INVALID_CREDENTIALS |
| Đăng nhập đúng / GET hồ sơ | 200 / 200, đúng MaKH |
| Logout với token sai | 403 CSRF_INVALID |
| Logout hợp lệ / GET hồ sơ sau logout | 200 / 401 |
| Login với SĐT không có: 5 lần đầu | 401 cùng INVALID_CREDENTIALS |
| Lần thứ 6 cùng SĐT/IP | 429 TOO_MANY_ATTEMPTS, Retry-After dương |
| Login khi có đăng ký cần phục hồi | 503 RECOVERY_PENDING |
| Signup hợp lệ kích hoạt recovery | 201 sau khi xử lý tác vụ cũ |

Tất cả 26 response được scan không có field MatKhau/hash/salt/ThamSoBam hoặc chuỗi URI MongoDB. Không in mật khẩu, hash hoặc SID ra log. Ca hết cửa sổ rate limit 15 phút được kiểm tra bằng đồng hồ giả ở unit; không tuyên bố đã chờ đủ 15 phút ngoài thực tế.

### 5.2. Hai ca phục hồi trên DB Test thật

1. Tạo fixture journal `DANG_XU_LY`, tài khoản `DangTao` và khách thuộc cùng MaYeuCauDangKy. Đọc preflight thấy 1 pending, login bị chặn. Một signup hợp lệ thực hiện recovery: xóa đúng tài khoản/khách chưa kích hoạt thuộc tác vụ, journal chuyển `THAT_BAI`. Không sửa dữ liệu khách legacy.
2. Tạo fixture tài khoản đã `HoatDong`, có khách nhưng journal còn `DANG_XU_LY`. Signup tiếp theo phục hồi tiến về trước: giữ tài khoản/khách, chuyển journal `HOAN_TAT`. Đã đăng nhập và GET hồ sơ của tài khoản được phục hồi thành công, sau đó logout.

Kết thúc harness: không còn journal `DANG_XU_LY`/`CAN_PHUC_HOI`, preflight READY. Có 4 khách/tài khoản Test được giữ làm bằng chứng, 5 journal; không xóa toàn bộ fixture sau test hoặc đặt lại dữ liệu để ép khớp số gốc.

## 6. Số đếm trước/sau của cả hai DB

Test trước restore: chưa có collection. Cột Test sau restore là mốc trước setup và test ghi. Cột sau cùng là lần đọc ngay trước thử npm start; lệnh startup bị chặn trước khi tạo process nên không có thao tác DB tiếp theo.

| Collection | Main trước | Main sau | Test sau restore | Test sau setup + kiểm thử |
|---|---:|---:|---:|---:|
| DanhMuc | 6 | 6 | 6 | 6 |
| NhaCungCap | 6 | 6 | 6 | 6 |
| SanPham | 20 | 20 | 20 | 21 |
| KhachHang | 10 | 10 | 10 | 14 |
| NhanVien | 6 | 6 | 6 | 7 |
| TaiKhoan | 6 | 6 | 6 | 6 |
| KhuyenMai | 5 | 5 | 5 | 7 |
| HoaDon | 20 | 20 | 20 | 20 |
| PhieuNhap | 10 | 10 | 10 | 10 |
| TaiKhoanKhachHang | Không có | Không có | Không có | 4 |
| YeuCauCuaHang | Không có | Không có | Không có | 5 |

Test tăng đúng phạm vi: +1 sản phẩm fixture, +1 nhân viên online, +2 KM fixture, +4 khách/tài khoản qua đăng ký và ca recovery. Có 3 đăng ký mới hoàn tất qua API và 1 tài khoản fixture active được phục hồi; fixture chưa active đã được hoàn tác. Không tạo hóa đơn hoặc phiếu nhập mới.

DB chính vẫn **9 collection, 89 document, 22 index**; Test **11 collection, 106 document, 33 index**.

Fingerprint Main sau toàn bộ test vẫn `bd88b53eb58beff44dd294e2c6bc3d1f7ceb5ee6c6d4b28ed15b564fbe928916`, bằng trước test/chạy lại script. Đã đọc và so nội dung 89 document Main với BSON backup theo EJSON chuẩn hóa: **9/9 collection khớp**, không xuất dữ liệu document/mật khẩu. Điều này bổ sung bằng chứng cho số đếm; không chỉ kiểm tra count.

Fingerprint Test sau test: `5a96c394acce7bab79ade5283899a159fd3e5120c23fa23b112b52e04a74f15a`.

## 7. File tạo/sửa và checksum bảo toàn

Trong lượt bổ sung này:

- Tạo `scripts/s1-verification-snapshot.js`: chỉ đọc cả hai DB, xuất count/hash/index count, không xuất document.
- Sửa `tests/store-api.test.js`: thêm ca CSRF cho cả 3 POST, rate limit thật và hai trạng thái recovery bằng fixture Test có guard; không thêm failpoint vào API public hoặc sửa code ứng dụng.
- Tạo báo cáo `BATCH_STORE_S1_TEST_REPORT.md` này. Giữ báo cáo S1 trước làm lịch sử.
- Backup tạo các file BSON/metadata tại đường dẫn ngoài project được người dùng chỉ định.

Không sửa script setup, `.env`, SRS hoặc code nghiệp vụ trong lượt này. Không thay mongod, không drop/--drop, không chạy lại script dữ liệu gốc. SHA-256 trước/sau: **12/12 giữ nguyên**.

| File được bảo vệ | SHA-256 trước = sau |
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

## 8. npm start bị chặn — người dùng chạy thủ công

Không có script/test bị lỗi trước bước này. Lệnh mở tiến trình npm start trên Test cổng 3001 bị automatic approval review từ chối trước khi chạy, chỉ nêu “blocked by policy”. Không có lý do chi tiết hơn từ công cụ. Theo yêu cầu, agent dừng, không thử chạy vòng bằng cách khác.

Người dùng có thể chạy trong PowerShell riêng; đảm bảo không có server store Test khác đang dùng cùng DB:

```powershell
Set-Location -LiteralPath 'D:\DaiHocNam4\DoAnNoSQL\QLSieuThiMini_Studio3T\webapp'
$env:MONGO_URI = 'mongodb://localhost:27017'
$env:DB_NAME = 'QLSieuThiMini_Test'
$env:PORT = '3001'
$env:STORE_ORIGIN = 'http://localhost:3001'
$env:STORE_WRITE_ENABLED = 'true'
if ($env:DB_NAME -cne 'QLSieuThiMini_Test') { throw 'DỪNG: sai DB Test' }
npm start
```

Kỳ vọng để người dùng kiểm tra, **chưa quan sát bằng npm start trong lượt này**: server tại localhost:3001, preflight standalone/READY. Có thể mở `http://localhost:3001/store-api/session` để kiểm tra JSON session ẩn danh; không có UI shop ở S1. Không sửa `.env` Main, không mang cờ Test sang terminal chạy Main. Dừng server Test bằng Ctrl+C khi xong, trước khi chạy lại harness.

**Điểm dừng:** chờ người dùng kiểm tra startup thủ công và duyệt S1; không chuyển S2.
