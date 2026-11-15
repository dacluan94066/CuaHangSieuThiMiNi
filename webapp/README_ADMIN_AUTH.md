# Đăng nhập nhân viên và phân quyền xem

Đã xây theo SRS_ADMIN_AUTH.md. Nghiệp vụ vẫn chỉ đọc; chưa có lập/chốt hóa đơn, phiếu nhập hay CRUD. `/api` chỉ GET và cần đăng nhập; `/admin-auth` xử lý session bằng RAM. Không dùng session khách `/store-api` để xác thực nhân viên.

## 1. Trạng thái hiện tại và bước cần người dùng thực hiện

**Chưa chạy script setup trên DB thật.** Theo yêu cầu của chủ project, script Node phải do người dùng review và chạy thủ công. Không tự tạo collection/index hay băm/import tài khoản khi server khởi động.

Server Test đã được dừng sau kiểm tra, pending=0, để bàn giao bước thủ công. Sau khi review/setup, chạy lại bằng npm run start:test ở mục 2.

Vì vậy, trước khi setup trên Test, đăng nhập sẽ trả 503 ADMIN_AUTH_SETUP_REQUIRED. Không có đường fallback so sánh mật khẩu rõ. Server Main không cho đăng nhập (503 ADMIN_AUTH_TARGET_FORBIDDEN); API Main anonymous trả 401. Không dùng build auth này để xem Main ẩn danh như trước.

## 2. Review và chạy setup Test bằng Node

Review `scripts/setup-admin-auth.js`, `src/admin-auth/schema.js`, `security.js`. Script chỉ cho hai tên đích chính xác QLSieuThiMini_Test và QLSieuThiMini_Demo; DB phải đã tồn tại. Demo hiện chưa có, không tạo tự động. Tuyệt đối không chạy setup Main hoặc sửa guard để vượt chặn.

1. Dừng server Test bằng Ctrl+C ở terminal đang chạy trước khi thao tác setup.
2. Mở PowerShell tại thư mục webapp, kiểm tra `.env.test` có DB_NAME=QLSieuThiMini_Test, PORT=3001. Không gửi nội dung URI/password vào chat.
3. Chạy **dry-run** mặc định (không ghi DB):

```powershell
Set-Location 'D:\DaiHocNam4\DoAnNoSQL\QLSieuThiMini_Studio3T\webapp'
node scripts/setup-admin-auth.js --test
```

4. Kiểm tra output chỉ gồm tên DB/mode/apply và số create/skip/blocked. `apply` phải false, đích đúng Test. Với sáu tài khoản đủ điều kiện hiện tại, dự kiến create=6 ở lần đầu; đây là dự kiến, chưa phải kết quả đã chạy. Nếu lỗi/xung đột/sai đích, dừng và review, không đổi đích ngầm.
5. Khi đồng ý ghi vào **collection mới duy nhất** trên Test:

```powershell
node scripts/setup-admin-auth.js --test --apply
```

6. Chạy lại cùng lệnh lần hai để kiểm idempotent. Khi nguồn/đích không đổi, create=0 và skip=6 theo bộ mẫu hiện tại; hash/salt/ngày/version giữ nguyên. Đối chiếu số thực tế, không reset dữ liệu để ép khớp.
7. Chạy server và đăng nhập:

```powershell
npm run start:test
```

Mở [đăng nhập quản trị Test](http://localhost:3001/#/dang-nhap). Dùng TenDangNhap và password mẫu đã import từ TaiKhoan của Test; password không được in trong báo cáo/log. Khách hàng vẫn vào [cửa hàng](http://localhost:3001/shop/) bằng SĐT/tài khoản khách riêng.

Script không chạy trong mongosh/Studio 3T IntelliShell. Chỉ Node đọc plaintext của **DB Test/Demo** tạm trong RAM, ghi scrypt+salt vào TaiKhoanQuanTri; không sửa TaiKhoan/NhanVien hoặc bất kỳ dữ liệu nghiệp vụ nào. Runtime không đọc TaiKhoan.MatKhau.

## 3. Bốn role

| Role | Trang được xem |
|---|---|
| Quản trị | Tất cả trang đã triển khai |
| Thu ngân | Sản phẩm, Hóa đơn, Khách hàng, Khuyến mãi |
| Kho | Sản phẩm, Cảnh báo kho, Phiếu nhập |
| Bán hàng | Sản phẩm, Cảnh báo kho, Hóa đơn, Khách hàng, Khuyến mãi |

Thu ngân/Bán hàng không nhận giá nhập/NCC từ API và không có bộ lọc NCC. Tên nhân viên trong giao dịch vẫn được xem, nhưng API thống kê nhân viên chỉ Quản trị. `/api/health` cũng cần session, được dùng bởi cả bốn role sau đăng nhập. Nhân viên chưa đăng nhập 401; không được cấp trang/endpoint 403; method khác GET vẫn 405 trước auth.

Role/trạng thái lấy từ TaiKhoan, liên kết NhanVien. Chỉ TaiKhoan.Hoạt động + NhanVien.Đang làm + mapping/hash hợp lệ được đăng nhập; NV_ONLINE bị chặn. Thay role, MaNV, trạng thái hoặc version credential làm phiên cũ vô hiệu ở request tiếp theo.

## 4. Password sau import và đặt lại thủ công

Password runtime là hash trong TaiKhoanQuanTri. Việc sửa TaiKhoan.MatKhau ngoài ứng dụng **không tự đổi** password đã import. Import thường phát hiện password nguồn khác trên record IMPORT_DEMO thì dừng; không ghi đè mật khẩu riêng DAT_LAI.

Reset riêng credential, nhập ẩn password mới 12–128 ký tự, không đổi TaiKhoan:

```powershell
node scripts/setup-admin-auth.js --test --mode=reset --username=admin
node scripts/setup-admin-auth.js --test --mode=reset --username=admin --apply
```

Lệnh đầu chỉ dry-run, không hỏi password. Lệnh apply cần terminal tương tác, hỏi hai lần ẩn ký tự, tạo salt/hash mới và tăng PhienBanXacThuc. Không truyền password trên argv. Muốn đồng bộ lại password nguồn một cách có chủ ý, review rồi dùng chế độ `--mode=sync-source --username=admin` (dry-run) và thêm `--apply` khi đã chấp thuận. Không chạy reset/sync Main.

Mẫu import có thể ngắn: chỉ cho demo 1–128 ký tự, không trim; băm không làm password yếu thành mạnh. Password reset riêng yêu cầu 12–128 ký tự. Chính sách khách cửa hàng vẫn giữ 12–128, không bị nới. Credential cũ không bị xóa tự động; lỗi giữa chừng giữ phần đã ghi để review/chạy lại idempotent, không drop hay rollback dữ liệu gốc.

## 5. Session và bảo mật

Cookie admin_sid: httpOnly, SameSite=Strict, Path=/, Secure khi HTTPS; store_sid vẫn Path=/store-api và session map riêng. Path=/ cần cho /api và /admin-auth, nên cookie admin có thể được gửi kèm store-api nhưng bị router khách bỏ qua.

Cookie phân biệt host/path, không phân biệt cổng. Chỉ dùng server Test/3001 để đăng nhập trong đợt này; không đồng thời bootstrap trang auth Main/3000 trên cùng localhost vì cookie ẩn danh Main có thể thay cookie Test. Server Main đã dừng sau kiểm tra guard; muốn thử Main riêng phải chủ động chạy npm start và chấp nhận chỉ có phản hồi bị chặn. Chưa hỗ trợ nhiều realm quản trị trên cùng host.

Idle 30 phút, tuyệt đối 8 giờ; GET session không kéo dài idle. Đăng nhập xoay SID/CSRF; logout chỉ hủy phiên nhân viên. Restart mất session, cookie cũ không tự khôi phục quyền. UI xóa nội dung khi 401/logout và kiểm lại khi trở về tab/BFCache.

POST login/logout cần JSON, Origin đúng ADMIN_ORIGIN và X-CSRF-Token. ADMIN_ORIGIN mặc định origin localhost theo PORT, có thể đặt đúng origin local trong env; không tùy tiện đổi localhost sang 127.0.0.1 ở trình duyệt. Không có cờ bỏ auth cho test. Login sai dùng lỗi chung; hạn mức cặp IP/tên 5 lần/15 phút và IP tổng 20/15 phút, giữ lượt trước KDF để chặn request đồng thời. Session/rate limit RAM chỉ dành demo một process.

Không trả plaintext/hash/salt/KDF/SID/marker/journal/URI trong API/log. Tài khoản không tồn tại/khóa/nghỉ/NV_ONLINE/hash hỏng cùng lỗi đăng nhập; thiếu setup toàn môi trường là 503 riêng.

## 6. Kiểm thử

Không ghi DB:

```powershell
npm run test:regression
npm run test:admin:auth
node --test tests/store-auth-ui.test.js tests/admin-analytics.test.js
```

Các test auth dùng HTTP thật và KDF thật nhưng repository/biz data trong RAM. Các test dữ liệu cũ dùng helper GET session → POST login → cookie mới; không bỏ KDF hay tắt middleware. Test mật khẩu/salt/idempotent dùng dữ liệu giả, không import DB.

API nghiệp vụ trên Test cần setup người dùng đã hoàn tất và role Quản trị. Để chạy mà không ghi password lên lịch sử PowerShell:

```powershell
$env:ADMIN_TEST_USERNAME = Read-Host 'Tên đăng nhập Quản trị trên Test'
$adminTestSecret = Read-Host 'Mật khẩu (ẩn ký tự)' -AsSecureString
$adminTestBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminTestSecret)
try {
    $env:ADMIN_TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminTestBuffer)
    npm run test:admin:api
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminTestBuffer)
    Remove-Item Env:ADMIN_TEST_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_TEST_USERNAME -ErrorAction SilentlyContinue
    $adminTestSecret.Dispose()
}
```

Test không tự setup/seed. Thiếu collection/credential/env sẽ **fail prerequisite**, không skip rồi báo pass. Main chỉ kiểm 401/405 và đối chiếu service dữ liệu đọc trực tiếp (4.400.000 ₫, 20 HD); không mở anonymous API để giữ test cũ. Đọc/kiểm API thực thụ trên Test đi qua kho credential thật sau khi setup. Kết quả mới lưu tests/results/admin-auth-readonly-api.json để giữ bằng chứng đợt rút gọn cũ.

Chưa có bằng chứng UI trình duyệt thật hoặc import/reset/idempotent trên DB thật cho đến khi người dùng chạy thủ công. Không coi 200 HTML/JS/CSS là nghiệm thu giao diện.
