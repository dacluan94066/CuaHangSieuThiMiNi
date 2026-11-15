# MiniMart — ứng dụng quản trị chỉ đọc

Backend Node.js + Express + driver chính thức MongoDB; frontend HTML/CSS/JavaScript thuần, ES modules, không build. Chart.js 4.5.1 qua CDN pin cố định. Toàn bộ ứng dụng ở `webapp/`; không sửa hoặc chạy lại file dữ liệu 01–07 khi vận hành web.

## 1. Cài đặt

Cần MongoDB local đang chạy; Studio 3T là giao diện quản lý, không cần mở Studio 3T để web kết nối nếu dịch vụ MongoDB vẫn chạy. Môi trường đã kiểm chứng: Node 24.16.0, npm 11.13.0, MongoDB Server 8.3.8 standalone. Node tối thiểu 20.19.0. Express 5.2.1, mongodb 7.5.0, dotenv 17.2.3 (`quiet: true`); không tự nâng dependency.

```powershell
Set-Location 'D:\DaiHocNam4\DoAnNoSQL\QLSieuThiMini_Studio3T\webapp'
node -v
npm -v
npm install
```

Giữ package-lock.json để tái lập phiên bản. Nếu đã có `.env` hoặc `.env.test`, không ghi đè. Khi chưa có, tạo từ file mẫu:

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
if (-not (Test-Path -LiteralPath .env.test)) { Copy-Item -LiteralPath .env.test.example -Destination .env.test }
```

Không commit `.env` thật. Ứng dụng đọc MONGO_URI/DB_NAME/PORT từ cấu hình, không hard-code kết nối trong mã. Biến môi trường terminal có ưu tiên hơn file; kiểm tra biến cũ khi thấy DB/cổng không đúng, không bỏ guard để xử lý lỗi.

## 2. Quản trị trên DB chính

`.env`:

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

Mở [giao diện DB chính](http://localhost:3000/). Bản hiện tại đã có auth: mọi `/api` chỉ GET và cần session, method khác 405. Đăng nhập mới chỉ hỗ trợ Test/Demo; Main trả 503 ADMIN_AUTH_TARGET_FORBIDDEN khi login và 401 khi gọi API anonymous. Dùng Test để chạy quản trị có đăng nhập, không tự setup Main. Xem [README_ADMIN_AUTH.md](README_ADMIN_AUTH.md).

Startup store có thể in `STORE_SETUP_REQUIRED` trên DB chính vì chưa có schema cửa hàng; đây là preflight cửa hàng, khác setup auth quản trị. Không bật ghi hoặc chạy setup lên DB chính để bỏ dòng thông báo này. Mọi API quản trị vẫn phải qua auth.

## 3. Quản trị trên DB Test và cửa hàng

`.env.test` dùng DB_NAME=QLSieuThiMini_Test, PORT=3001, STORE_ORIGIN=http://localhost:3001; các giá trị khác lấy từ `.env.test.example`.

```powershell
npm run start:test
```

- [Quản trị DB Test](http://localhost:3001/)
- [Cửa hàng Test](http://localhost:3001/shop/)

`start:test` kiểm tra đúng Test/3001 trước khi chạy. Cửa hàng Test có thể ghi khi STORE_WRITE_ENABLED=true; checkout còn cần STORE_CHECKOUT_ENABLED=true và không có khóa kiểm thử. File mẫu giữ checkout tắt; bản `.env.test` đã được duyệt ở S3 có thể đang bật. Chỉ thao tác GET quản trị trong một lần đối chiếu chỉ đọc; không đặt hàng đồng thời nếu cần số đếm trước/sau không đổi.

Một tiến trình ghi cho cùng DB; không chạy hai cửa hàng writer hoặc harness ghi song song. Ctrl+C để dừng. Restart mất session/giỏ/báo giá trong RAM; đơn đã xác nhận vẫn nằm trong DB. Xem [README_STORE.md](README_STORE.md) để chạy cửa hàng, backup/restore, setup thủ công Test và giới hạn standalone. DB chính hiện chưa được mở ghi cửa hàng; không tự chạy setup hoặc đổi cấu hình mongod.

## 4. Các trang quản trị

| Trang/hash | Nội dung |
|---|---|
| `#/dashboard` | Tổng quan, doanh thu tháng, top sản phẩm, thanh toán |
| `#/san-pham`, `#/san-pham/:ma` | Tra cứu, lọc, chi tiết, tên danh mục/NCC |
| `#/hoa-don`, `#/hoa-don/:ma` | Hóa đơn, snapshot chi tiết và khuyến mãi |
| `#/phieu-nhap`, `#/phieu-nhap/:ma` | Phiếu nhập, chi tiết, NCC/nhân viên |
| `#/khach-hang`, `#/khach-hang/:ma` | Hồ sơ, điểm lưu, tổng chi tiêu, lịch sử mua |
| `#/nhan-vien` | Tìm mã/tên, lọc ngày, số hóa đơn và thực thu; giữ nhân viên có 0 hóa đơn; NV_ONLINE có nhãn Nhân viên hệ thống |
| `#/khuyen-mai` | Mã/tên, điều kiện, trạng thái hiện tại và trạng thái gốc |
| `#/bao-cao?tab=doanh-thu` | Doanh thu ngày/tháng, chọn khoảng ngày, tổng hợp toàn kỳ, bảng phân trang |
| `#/bao-cao?tab=san-pham` | Xếp hạng số lượng hoặc tiền hàng trước giảm; lọc mã danh mục hiện tại |
| `#/bao-cao?tab=khach-hang` | Tổng chi tiêu thực thu hoặc số lần mua |
| `#/canh-bao-kho` | Tồn/hạn dùng theo dữ liệu hiện có |
| `#/kiem-tra-du-lieu` | Tổng tiền, hiệu lực KM, 11 quan hệ; phân loại và phân trang lỗi |

Giao diện tiếng Việt, DOM an toàn qua textContent, responsive. Có loading/lỗi/rỗng và phân trang. Biểu đồ báo cáo chỉ thể hiện **trang hiện tại**, có bảng ngay bên dưới và không âm thầm cắt chuỗi; tổng hợp doanh thu phía trên áp dụng toàn kỳ. Khi CDN bị chặn/mất mạng, bảng vẫn hiển thị và có thông báo không tải được biểu đồ.

## 5. Quy tắc số liệu

- Doanh thu thực thu = tổng HoaDon.ThanhTien sau giảm giá, tiền hàng = TongTien. Không coi tiền hàng sản phẩm trước giảm là thực thu sau giảm.
- Báo cáo sản phẩm dùng số lượng × đơn giá và tên snapshot trên ChiTiet. Lọc danh mục dựa SanPham.MaDM hiện tại theo SRS; không nhận đó là danh mục lịch sử.
- Ngày lọc gồm trọn ngày Việt Nam, từ 00:00 đến trước 00:00 ngày kế tiếp. Group ngày/tháng dùng `$dateToString` với `Asia/Ho_Chi_Minh`.
- KM có hiệu lực khi NgayBatDau ≤ thời điểm ≤ NgayKetThuc, so sánh BSON trực tiếp. Không cộng ngày. Riêng ngày kết thúc hiển thị UTC: KM001 là 30/09/2026; các ngày khác hiển thị giờ Việt Nam.
- Điều kiện KM được diễn giải theo năm field trong SRS; nếu còn điều kiện lạ, hiện nhãn chưa diễn giải đầy đủ, không coi là không có điều kiện và không trả giá trị field lạ ra API.
- Tồn kho/điểm giữ theo DB, không tính lại từ giao dịch. API quản trị không sửa dữ liệu.
- Báo cáo bao gồm mọi hóa đơn đã lưu, cả ONLINE. NV_ONLINE là nhân viên hợp lệ khi có trong NhanVien, không phải tham chiếu lỗi. MaKM có thể vắng mặt; nếu có mã mà không tìm thấy KM chỉ báo tham chiếu thiếu, không đoán hiệu lực.
- Tổng kiểm tra là **số lỗi**, một document có thể có nhiều lỗi. 11 quan hệ: SP→DM/NCC; HD→KH/NV/KM/SP từng dòng; PN→NCC/NV/SP từng dòng; TK→NV; KM.DieuKien.MaDM→DM nếu có.

## 6. API mới của đợt rút gọn

Tất cả GET; P là page (1–10.000), limit (1–100, mặc định 20); D là from/to yyyy-MM-dd. Tham số lạ/lặp/object và limit>100 bị 400; tìm kiếm escape regex.

| Endpoint | Tham số |
|---|---|
| `/api/nhan-vien` | q, D, P |
| `/api/khuyen-mai` | q, trangThai=sap-dien-ra/dang-ap-dung/da-ket-thuc, P |
| `/api/bao-cao/tong-quan` | D; tổng thực thu/tiền hàng/giảm giá/số HD/trung bình/min/max, không có nhập hàng trong phạm vi rút gọn |
| `/api/bao-cao/doanh-thu` | D, nhom=ngay/thang (mặc định thang), P |
| `/api/bao-cao/san-pham` | D, maDM, sapXep=so-luong/tien-hang, P |
| `/api/bao-cao/khach-hang` | D, sapXep=chi-tieu/so-lan-mua, P |
| `/api/kiem-tra-du-lieu` | loai=tat-ca/tong-tien/khuyen-mai/tham-chieu; collection=SanPham/HoaDon/PhieuNhap/TaiKhoan/KhuyenMai; P |

Collection không tương thích loại lỗi (ví dụ tong-tien + SanPham) trả 400. Phản hồi chỉ chiếu field cho phép; không MatKhau/hash/salt/marker/journal/SID.

## 7. Lệnh kiểm thử không ghi DB

```powershell
npm run test:regression
npm run test:admin:unit
npm run test:admin:auth
npm run test:admin:api
```

- Hồi quy 115 test cũ = 44 quản trị + 36 S1 + 22 S2 + 10 S3 + 3 S4, bằng node:test, dữ liệu bộ nhớ cho thao tác ghi giả lập.
- Unit mới kiểm validation và cấu trúc nghiệp vụ.
- Sau bổ sung auth, HTTP dữ liệu trên Test cần người dùng chạy setup mật khẩu băm thủ công và cung cấp credential qua env theo README_ADMIN_AUTH.md; test không tự seed. Main kiểm guard 401/405 và service dữ liệu đọc trực tiếp. Bộ auth riêng kiểm đủ bốn role với repository RAM nhưng vẫn qua HTTP/KDF/middleware thật. Ca biên dữ liệu đưa vào aggregation bằng `$literal`/`$replaceWith`, không insert fixture.
- Kiểm tra 11 quan hệ với mã hợp lệ/thiếu/tùy chọn, ranh giới NgayKetThuc/+1ms/ngày kế tiếp và nửa đêm Việt Nam. Kết quả lưu `tests/results/admin-readonly-api.json` không có mật khẩu/hash.

Các lệnh riêng từng nhóm vẫn có: test:unit, test:store:unit, test:shop:unit, test:checkout:unit, test:orders:unit. Các harness cũ `test:store:api`, `test:shop:api`, `test:checkout:api`, `test:orders:api` và verify-process-recovery **có thể ghi fixture Test**, cần phê duyệt/guard/opt-in riêng, không nằm trong đợt chỉ đọc này. Không dùng wildcard để chạy lẫn test ghi với kiểm tra chỉ đọc.

## 8. Giới hạn và xử lý lỗi

- Đợt rút gọn chỉ có 3 tab báo cáo. Chưa có tab/API báo cáo nhập theo NCC, nhập theo sản phẩm, báo cáo thanh toán riêng; Dashboard vẫn có thống kê thanh toán cũ.
- Đã có đăng nhập/role quản trị trên Test/Demo sau setup thủ công; chưa có tạo/sửa/xóa dữ liệu nghiệp vụ hoặc quản trị tài khoản qua web. Nhãn Chỉ đọc không thay cho xác thực.
- DB Test có fixture/đơn từ S1–S4 nên số đếm khác DB chính. Không restore/reset để ép khớp dữ liệu mẫu.
- HD009 dùng KM002 trước thời gian bắt đầu là lỗi dữ liệu gốc được liệt kê, không tự sửa. Đơn online hợp lệ không bị gắn lỗi chỉ vì nguồn ONLINE hoặc không có MaKM.
- 400: xem query/ngày/limit; 405: quản trị chỉ GET; 503: kiểm MongoDB/cấu hình, không in URI để chia sẻ; cổng bận: dừng server cũ, không đổi DB đích ngầm.
- Chưa có bảo đảm snapshot nhất quán giữa nhiều request nếu writer đang chạy. Dừng thao tác ghi khi đối chiếu. Không tạo index, collection hoặc chạy migration ở startup.
- HTTP 200 và test pass không thay cho nghiệm thu trình duyệt. Cần kiểm các trang mới, bộ lọc, phân trang, CDN lỗi, Tab/focus và mobile/desktop bằng trình duyệt thật. Xem báo cáo đợt để biết phần đã/chưa kiểm chứng.
