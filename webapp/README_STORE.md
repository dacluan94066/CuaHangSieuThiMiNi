# Cửa hàng MiniMart — vận hành và nghiệm thu S1–S4

Ứng dụng minh họa, thanh toán giả lập, không thu tiền thật. Node.js + Express + driver MongoDB; HTML/CSS/JavaScript ES modules, không build. Trang cửa hàng `/shop/`, quản trị `/` với `/api` chỉ GET. Các thao tác đăng ký/đặt hàng chỉ thuộc `/store-api`.

## 1. Trạng thái được phép chạy

| Chế độ | DB | Cổng | Khả năng hiện tại |
|---|---|---:|---|
| Test cửa hàng | QLSieuThiMini_Test | 3001 | Đăng ký, đăng nhập, giỏ, checkout giả lập, lịch sử/chi tiết đơn riêng |
| Bản chính | QLSieuThiMini | 3000 | Catalog; API quản trị được bảo vệ, chưa mở đăng nhập Main; **chưa mở ghi cửa hàng** |

Guard hiện tại chỉ cho ghi khi DB_NAME đúng `QLSieuThiMini_Test`. Bật cờ ghi với DB chính bị từ chối trước khi lấy writer. S4 không thay guard, không chạy setup DB chính. Vì vậy chưa thể nghiệm thu việc bán hàng đầy đủ trên DB chính; cần duyệt riêng migration và mở ghi trước khi triển khai thật.

Đã kiểm tra trên Node 24.16.0, npm 11.13.0, MongoDB Server 8.3.8 standalone. Node tối thiểu 20.19.0; dependency pin Express 5.2.1, mongodb 7.5.0, dotenv 17.2.3 (`quiet: true`). Cài lại dùng đúng package-lock; không tự đổi mongod sang replica set.

## 2. Chạy bản Test

Mở PowerShell tại thư mục project:

```powershell
Set-Location 'D:\DaiHocNam4\DoAnNoSQL\QLSieuThiMini_Studio3T\webapp'
node -v
npm -v
npm install
```

Chỉ khi chưa có `.env.test`, sao chép `.env.test.example` sang `.env.test`; không ghi đè cấu hình đang dùng. Nội dung cho bản Test sau khi đã kiểm chứng S3:

```dotenv
MONGO_URI=mongodb://localhost:27017
DB_NAME=QLSieuThiMini_Test
PORT=3001
STORE_ORIGIN=http://localhost:3001
STORE_WRITE_ENABLED=true
STORE_CHECKOUT_ENABLED=true
```

File mẫu giữ checkout tắt để tránh bật ghi đặt hàng khi chưa kiểm chứng. `.env*` thật đã bị gitignore. Không chia sẻ URI có thông tin đăng nhập. Biến môi trường của terminal có ưu tiên hơn file; xóa biến cũ nếu guard báo sai DB/cổng, không đổi guard.

```powershell
npm run start:test
```

Mở [cửa hàng Test](http://localhost:3001/shop/) và [quản trị Test](http://localhost:3001/). Dùng đúng `localhost`, tránh đổi thành `127.0.0.1` trên trình duyệt khi STORE_ORIGIN đang là localhost. Dừng bằng Ctrl+C.

Startup chỉ preflight đọc metadata, validator, index, nhân viên NV_ONLINE và journal; không tạo cấu trúc hay phục hồi ghi tự động. Trạng thái mong đợi `standalone; READY`.

**Chỉ chạy một tiến trình ghi vào cùng DB.** Dừng server Test trước các harness ghi: harness tự mở HTTP server riêng và tạo fixture có tiền tố Test. Không chạy hai bộ test ghi đồng thời.

## 3. Bản chính và kế hoạch setup thủ công

Chạy quản trị/catalog DB chính với `.env`:

```dotenv
MONGO_URI=mongodb://localhost:27017
DB_NAME=QLSieuThiMini
PORT=3000
STORE_ORIGIN=http://localhost:3000
STORE_WRITE_ENABLED=false
STORE_CHECKOUT_ENABLED=false
```

```powershell
npm start
```

Mở [bản chính](http://localhost:3000/), [catalog](http://localhost:3000/shop/). `STORE_SETUP_REQUIRED` trên nghiệp vụ tài khoản là đúng khi DB chính chưa được setup. Không sửa file 01–09 hay chạy lại 01–07.

Sau đợt auth quản trị, dùng [admin Test](http://localhost:3001/#/dang-nhap) và setup thủ công theo README_ADMIN_AUTH.md. Main không mở /api ẩn danh hoặc cho login; auth nhân viên không dùng session/password của khách hàng.

Quy trình **dành cho chủ project quyết định và chạy thủ công sau một lần duyệt riêng**, chưa được thực hiện trong S4:

1. Dừng toàn bộ writer; backup DB chính vào thư mục mới, kiểm tra đủ BSON và metadata; kiểm tra phục hồi trên một đích rỗng được duyệt.
2. Review đặc tả `SRS_STORE.md` mục 4 và `src/store/schema.js`: hai collection tài khoản/journal, validator mở rộng cho dữ liệu online, index unique, marker và nhân viên NV_ONLINE. Giữ nguyên dữ liệu cũ và validator/index gốc.
3. Chuẩn bị và duyệt **bản migration dành riêng cho DB chính**, có guard đích chính rõ ràng, idempotent, không drop. Chưa có bản migration này trong S4. Các script `db-setup/01_store_schema_indexes.js`, `02_online_employee.js`, `90_test_fixtures.js` hiện đều guard **Test**, không chạy chúng trên DB chính, không sửa đích để vượt guard. Tuyệt đối không seed fixture Test vào DB chính.
4. Sau khi được duyệt, chính người dùng chọn đúng DB trong Studio 3T, xác nhận `db.getName()`, chạy migration đã review theo thứ tự schema/index rồi nhân viên. Chụp số đếm và validator/index trước/sau, thử lần hai để kiểm chứng idempotent.
5. Chỉ sau khi preflight đạt mới xem xét bản thay đổi guard cho phép nghiệp vụ ghi trên DB chính. Việc này cần duyệt riêng; S4 không cung cấp thao tác bật ghi DB chính bằng biến môi trường.

Đây là điều kiện còn thiếu cho vận hành DB chính, không phải lỗi cần xử lý bằng cách hạ guard hoặc chạy setup tự động khi khởi động.

## 4. Backup/restore Test

Lệnh dưới đây là hướng dẫn, không được ứng dụng tự chạy. Database Tools chạy trong PowerShell, không phải IntelliShell. Trên máy hiện tại có Tools 100.9.4 trong thư mục Studio 3T:

```powershell
$dumpTool = 'C:\Users\Admin\.3T_community\third-party\2025.1.0\tools\100.9.x\mongodump.exe'
$restoreTool = 'C:\Users\Admin\.3T_community\third-party\2025.1.0\tools\100.9.x\mongorestore.exe'
& $dumpTool --version
& $restoreTool --version
$storeBackupPath = 'D:\MongoBackup\store_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
& $dumpTool --uri='mongodb://localhost:27017' --db=QLSieuThiMini --out=$storeBackupPath
if ($LASTEXITCODE -ne 0) { throw 'Backup thất bại; dừng' }
Get-ChildItem -LiteralPath (Join-Path $storeBackupPath 'QLSieuThiMini') -Filter '*.bson'
```

Mốc DB chính hiện có 9 collection. Trước khi restore, trong IntelliShell chỉ đọc:

```javascript
db = db.getSiblingDB('QLSieuThiMini_Test');
db.getName();
db.getCollectionNames().sort().forEach(function (name) {
  print(name + ': ' + db.getCollection(name).countDocuments({}));
});
```

**Test hiện đã có dữ liệu; dừng ở bước này, không restore đè và không drop.** Đoạn restore chỉ được dùng trong lần chuẩn bị một DB Test rỗng đã được duyệt, với backup path đúng:

```powershell
& $restoreTool --uri='mongodb://localhost:27017' --nsInclude='QLSieuThiMini.*' --nsFrom='QLSieuThiMini.*' --nsTo='QLSieuThiMini_Test.*' $storeBackupPath
if ($LASTEXITCODE -ne 0) { throw 'Restore thất bại; dừng' }
```

Đối chiếu đủ 9 collection, số đếm và index/validator với backup. Sau đó người dùng review/chạy các script Test 01, 02; script 90 chỉ là fixture Test tùy chọn. Tất cả có guard, sai đích phải dừng. Không dùng tùy chọn xóa đích; không restore về DB chính trong quy trình kiểm thử. Khi cần backup cửa hàng Test, dump toàn bộ `QLSieuThiMini_Test` gồm cả hai collection mới và marker; không chỉ backup HoaDon vì phục hồi nhất quán cần journal/khách/sản phẩm đi cùng.

## 5. Luồng sử dụng và hợp đồng lịch sử

- Khách mới đăng ký SĐT chưa có; mật khẩu scrypt có salt. Không tự gắn SĐT cũ vào tài khoản mới. Chưa có OTP/quên mật khẩu/sửa tài khoản.
- Giỏ tối đa 50 mã, mỗi mã 1–99; giá/tên/tồn đọc lại từ DB. Hết hàng, thiếu tồn, hết hạn, ngừng bán không được đặt. Không tự suy ra tồn từ hóa đơn/phiếu nhập.
- Báo giá có thời hạn 5 phút. Server kiểm tra lại giá/điều kiện khi xác nhận; không chấp nhận giá giả từ client. `TongTien − GiamGia = ThanhTien`; điểm `floor(ThanhTien / 10000)`.
- KM so sánh thời điểm BSON trực tiếp, bao gồm NgayKetThuc; hiển thị riêng NgayKetThuc theo UTC. Tại 15/11/2026 trên DB chính chỉ KM003 còn hiệu lực nhưng cần 100 điểm; khách mới 0 điểm chưa có mã dùng được. Không tự thêm mã chính để demo.
- Ba phương thức: Chuyển khoản, Thẻ ngân hàng, Ví điện tử — **đều giả lập**. Không nhập số thẻ hay chuyển khoản thật. Không có phí ship/hủy/hoàn tiền.
- Sau timeout giữ nguyên Idempotency-Key và mã báo giá; không tạo key mới để thử lại. Frontend lưu hai mã này trong sessionStorage theo khách. Không lưu mật khẩu hay SID ở đây.
- Lịch sử chỉ đơn `ONLINE` của khách đang đăng nhập. `GET /store-api/don-hang?page=1&limit=10` (mặc định API 20, tối đa 100); sắp NgayLap giảm dần, MaHD tăng dần. `GET /store-api/don-hang/:maHD` trả snapshot đơn, không nối giá hiện tại.
- Chưa đăng nhập 401. Đơn người khác, mã không tồn tại và đơn không ONLINE trả cùng 404. Không nhận maKH do client cung cấp để đổi chủ sở hữu.

## 6. Phục hồi standalone và giới hạn

Chỉ một writer/process, hàng đợi checkout giới hạn 16; session/giỏ/báo giá trong bộ nhớ. Restart làm mất session/giỏ/báo giá, người dùng phải đăng nhập lại. Với yêu cầu đã ghi journal, retry cùng key/payload vẫn phục hồi từ journal dù báo giá RAM đã mất. Nếu chưa tạo journal, cần báo giá mới; không khẳng định mọi timeout đều đã tạo đơn.

Pre-publish lỗi: hoàn tác đúng marker giữ hàng, không tạo hóa đơn thất bại. Có hóa đơn xác nhận: tiếp tục cộng điểm có marker đúng một lần. Việc phục hồi ghi được kích hoạt trong POST checkout có guard; startup/GET lịch sử không tự ghi sửa DB. Khi có journal treo, dừng writer khác và để nghiệp vụ retry hợp lệ phục hồi, không sửa tay tồn/điểm hoặc xóa marker/journal.

Nếu có `.checkout-locked`, checkout bị khóa do kiểm thử trọng yếu thất bại. Không xóa tự động để bỏ chặn; review bằng chứng và xin quyết định sửa/kiểm thử lại. Không có endpoint public để tạo failpoint. Marker/journal đã kết thúc được giữ lại, chưa có TTL/dọn dữ liệu tự động. Chưa hỗ trợ nhiều instance, phân tán hay bảo đảm chống mọi sự cố phần cứng.

Cookie httpOnly, SameSite, CSRF + Origin cho request ghi, giới hạn đăng nhập sai trong bộ nhớ. Chỉ dùng local; không xem bản demo này là hệ thống production có HTTPS/OTP/audit đầy đủ. Không log URI, hash, mật khẩu, SID; DTO dùng danh sách field cho phép.

## 7. Kiểm thử

Chạy unit, không ghi DB:

```powershell
npm run test:unit
npm run test:store:unit
npm run test:shop:unit
npm run test:checkout:unit
npm run test:orders:unit
```

Số ca hiện tại: 44 + 36 + 22 + 10 + 3. HTTP S4 dưới đây **có tạo fixture và đơn**, chỉ chạy trên Test với guard; giữ lại fixture để đối chiếu chênh lệch, không reset dữ liệu để ép số:

```powershell
$env:STORE_S4_API_TESTS='ALLOW_TEST_FIXTURES'
$env:STORE_CHECKOUT_API_TESTS='ALLOW_TEST_CHECKOUT'
npm run test:orders:api
```

Harness S4 kiểm tra 39 HTTP request: sở hữu, 401/404, ONLINE, phân trang, snapshot sau đổi giá, DTO, tham số và /api non-GET 405. Mỗi lần chạy tạo 2 khách/tài khoản, 1 sản phẩm, 4 đơn online + 1 hóa đơn POS fixture kiểm tra tính ẩn. POS fixture không phải mua hàng thật, không trừ tồn/cộng điểm. Không chạy lại chỉ để lấy số cũ.

Phép thử **kill process thật** (chỉ Test; không có endpoint failpoint):

```powershell
$env:STORE_S4_PROCESS_TEST='ALLOW_TEST_PROCESS_CRASH'
$env:STORE_CHECKOUT_API_TESTS='ALLOW_TEST_CHECKOUT'
node scripts/verify-process-recovery.js
```

Controller tạo fixture, mở worker HTTP riêng rồi in PID/run/controlFile khi dừng tại `after-points`. Trước khi dừng, người vận hành đọc control file và kiểm chứng đúng process:

```powershell
$controlPath = Read-Host 'Dán đường dẫn controlFile vừa in'
$crashControl = Get-Content -LiteralPath $controlPath -Raw | ConvertFrom-Json
$workerInfo = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$crashControl.pid)
if ($null -eq $workerInfo -or $workerInfo.Name -ne 'node.exe' -or -not $workerInfo.CommandLine.Contains($crashControl.workerPath) -or -not $workerInfo.CommandLine.Contains('--run=' + $crashControl.run)) { throw 'Sai tiến trình; dừng' }
$workerInfo | Select-Object ProcessId, Name, CommandLine
Stop-Process -Id ([int]$crashControl.pid) -Force
```

Chỉ kill worker Test khớp toàn bộ, không kill mongod/server khác. Controller tự mở tiến trình mới, đăng nhập lại và retry cùng key; kiểm tra một hóa đơn, tồn giảm một, điểm cộng một, không journal treo; lưu bằng chứng JSON không chứa secret ở `tests/results/`. Nếu chính sách không cho kill, không vòng chặn: tạo file được ghi ở thuộc tính `continueFile` để worker hoàn tất nhẹ nhàng, báo kill chưa kiểm chứng. Chờ quá 180 giây controller cũng tự tiếp tục nhẹ nhàng; kết quả này **không** được tính là kill thành công.

## 8. Lỗi thường gặp

| HTTP/trạng thái | Xử lý |
|---|---|
| 400 | Kiểm tra field/body/query; không lặp tham số, không tham số lạ, limit ≤ 100 |
| 401 | Đăng nhập lại sau restart/hết session |
| 403 | Dùng đúng origin/cổng, lấy CSRF mới từ session; không bỏ kiểm tra |
| 404 đơn hàng | Mã không có/không thuộc khách/không ONLINE đều được ẩn cùng cách |
| 405 /api | Đúng thiết kế: quản trị chỉ GET |
| 409 | Kiểm tra tồn, giá vừa đổi, hạn báo giá, điều kiện KM, xung đột key; không tự sinh key khác khi kết quả chưa rõ |
| 429 | Dừng gửi dồn, chờ Retry-After; không bỏ rate limit |
| 503 STORE_SETUP_REQUIRED | Chưa đủ cấu trúc/index/nhân viên; review setup đúng DB, không tạo ngầm |
| 503 RECOVERY_PENDING | Chỉ một writer, xem trạng thái Test; retry nghiệp vụ hợp lệ để phục hồi; không sửa marker thủ công |
| Không mở cổng | Dừng tiến trình cũ hoặc kiểm tra PORT; start:test bắt buộc Test/3001 |
| Sai guard | Dừng, kiểm tra DB_NAME thật và biến môi trường terminal; không đổi đích ngầm |

## 9. Checklist nghiệm thu bằng trình duyệt còn cần thực hiện

HTTP/unit pass không chứng minh giao diện đã được nghiệm thu. Cần mở trình duyệt thật kiểm tra: đăng ký/đăng nhập/đăng xuất; thêm/sửa/bỏ giỏ; báo giá/coupon; timeout giữ key; xác nhận và vào chi tiết; lịch sử/phân trang/401/404; snapshot; màn hình rỗng/lỗi/loading; toast; Tab/Shift+Tab/focus sau chuyển trang và lỗi; đọc bảng cuộn ngang; mobile 360/390/700px và desktop. Chưa có bằng chứng trình duyệt trong S4; báo cáo riêng trạng thái này.

Lịch sử không cho sửa/hủy đơn. Admin các trang đợt sau vẫn nằm ngoài công việc cửa hàng S4. Xem `BATCH_STORE_S4_REPORT.md` để biết số liệu thực tế và checksum sau đợt, không dùng số trong tài liệu như hằng số của ứng dụng.
