# SRS — Cửa hàng siêu thị mini

## Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung | Trạng thái |
|---|---|---|---|
| 1.0 | 15/11/2026 | Đặc tả S0: cửa hàng, dữ liệu bổ sung, API, bảo mật, nhất quán dữ liệu, kiểm thử và các đợt S1–S4; có đối chiếu MongoDB thực tế chỉ đọc | Chờ người dùng duyệt |

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

Xây dựng cửa hàng cho khách trên cùng database `QLSieuThiMini`: đăng ký/đăng nhập, xem và tìm sản phẩm, giỏ hàng, đặt hàng, thanh toán giả lập, xem tài khoản và lịch sử đơn của chính mình. Giao diện tiếng Việt, responsive, tiền VNĐ và ngày `dd/MM/yyyy`.

Đây là tài liệu bổ sung cho `../SRS.md` v1.1 đã được người dùng duyệt trong hội thoại. Không sửa tài liệu đó. Các dòng trạng thái lịch sử trong `SRS.md` được giữ nguyên, không dùng chúng để phủ nhận các phê duyệt đã có trong hội thoại.

S0 **chỉ tạo tài liệu này**. Chưa tạo code, script thiết lập, collection, index, nhân viên, tài khoản hoặc đơn hàng. Các cấu trúc, endpoint và lệnh trong tài liệu đều là thiết kế cho những đợt sau, trừ kết quả đọc thực tế ở mục 3 và checksum ở mục 13.

### 1.2. Trong phạm vi

| Mã | Chức năng |
|---|---|
| SF-01 | Đăng ký khách mới bằng SĐT và mật khẩu; đăng nhập, đăng xuất bằng session |
| SF-02 | Trang chủ, danh mục, tìm kiếm, danh sách và chi tiết sản phẩm |
| SF-03 | Giỏ hàng: thêm, đổi số lượng, bỏ món, xem lại giá hiện tại |
| SF-04 | Nhập địa chỉ, nhập một mã khuyến mãi, xem báo giá trước khi xác nhận |
| SF-05 | Đặt đơn, thanh toán giả lập, trừ tồn, cộng điểm và chống đặt trùng |
| SF-06 | Xem hồ sơ, điểm hiện có, lịch sử và chi tiết đơn online của chính mình |

### 1.3. Ngoài phạm vi

- Cổng thanh toán thật, thu tiền thật, nhập/lưu số thẻ hoặc thông tin ngân hàng bí mật.
- Phí ship, tính khoảng cách giao hàng, theo dõi vận chuyển, cập nhật trạng thái giao hàng.
- Hủy đơn, trả hàng, hoàn tiền, dùng điểm để thanh toán.
- Quản trị tài khoản, phân quyền nhân viên, đổi/quên mật khẩu, OTP xác thực SĐT.
- Tự liên kết tài khoản mới với khách hàng cũ chỉ dựa trên SĐT.
- Thêm/sửa hàng hóa, phiếu nhập, khuyến mãi bằng giao diện cửa hàng.
- Hosting, nhiều instance ứng dụng, tích hợp dịch vụ ngoài hoặc mở rộng các trang quản trị của đợt sau.

## 2. Ranh giới với ứng dụng quản trị và công nghệ

| Ràng buộc | Áp dụng cho cửa hàng | Điều phải giữ nguyên |
|---|---|---|
| `TC-08` của SRS gốc | Nới **chỉ cho nhóm `/store-api`**: cho phép ghi nghiệp vụ đăng ký, đặt đơn, tồn, điểm và nhật ký xử lý được mô tả ở đây | `/api` tiếp tục chỉ khai thác bằng `find`, `aggregate`, `countDocuments`; không nhận hàm ghi |
| `TC-09` | `/store-api` có GET/POST/PATCH/DELETE theo đúng hợp đồng ở mục 8 | Mọi route `/api` vẫn chỉ GET; method khác vẫn 405, không thay thứ tự hoặc hành vi middleware đó |
| `NFR-01` | Nới tính chỉ đọc cho nghiệp vụ cửa hàng đã đặc tả, có xác thực, CSRF, kiểm soát tồn và chống trùng | Không biến module quản trị thành module ghi; không thêm endpoint ghi dưới `/api` |
| Các giới hạn nghiệp vụ gốc | Quy tắc trừ tồn/cộng điểm chỉ dành cho **giao dịch online mới** theo tài liệu này | Báo cáo quản trị tiếp tục đọc tồn và điểm đã lưu; không tính lại hoặc sửa dữ liệu lịch sử |

Backend giữ Node.js + Express + driver chính thức `mongodb`; frontend HTML/CSS/JavaScript thuần, ES modules, không framework và không build. Giữ dependency hiện có: Express `5.2.1`, mongodb `7.5.0`, dotenv `17.2.3` với `quiet: true`; Node tối thiểu `20.19.0`, môi trường chuẩn đã ghi ở SRS gốc là `24.16.0`. Không thêm thư viện xác thực hoặc test; dùng `node:crypto` và `node:test`. Không cần biểu đồ mới cho cửa hàng; Chart.js của quản trị giữ nguyên.

Toàn bộ tài liệu, mã nguồn và script mới nằm dưới `webapp/`. Giao diện cửa hàng ở `/shop/`, API ở `/store-api`; không thay router hash quản trị. Dùng cùng cấu hình `.env` (`MONGO_URI`, `DB_NAME`, `PORT`), không hard-code kết nối, không log URI, không phục vụ `.env` như file tĩnh. Môi trường test có cấu hình tách biệt theo mục 10.

Module đọc của quản trị tiếp tục được tách khỏi service ghi của cửa hàng. Các trường nội bộ mới không được lọt vào DTO `/api` qua việc mở rộng projection. Không sửa/xóa/đổi tên hoặc chạy lại `01–07`; không sửa `08`, `09`, `README.md` và `SRS.md`. Không dùng `drop`, `$out`, `$merge` hoặc tự thay cấu hình mongod.

**Phân biệt thiết lập và nghiệp vụ:** mọi thay đổi cấu trúc DB, validator, index và dữ liệu khởi tạo thực hiện bằng script idempotent trong `webapp/db-setup/`, do người dùng chạy thủ công trong Studio 3T sau khi duyệt. Ghi đăng ký/đặt hàng lúc sử dụng là nghiệp vụ của `/store-api`, không phải migration chạy lúc khởi động. Ứng dụng không tự tạo collection/index/seed, kể cả tạo ngầm bằng insert khi thiếu collection.

## 3. Kết quả khảo sát chỉ đọc ngày 15/11/2026

### 3.1. Topology thực tế

Đã đọc `db.hello()` trên kết nối đang dùng cho `QLSieuThiMini`. Thời điểm khảo sát: `2026-11-15T12:11:10.536Z`, tức `19:11:10.536` ngày 15/11/2026 tại Việt Nam.

| Thuộc tính | Giá trị quan sát |
|---|---|
| `isWritablePrimary` | `true` |
| `setName` | Không có trong phản hồi; chuẩn hóa báo cáo thành `null` |
| `hosts` | Không có; chuẩn hóa báo cáo thành `[]` |
| `msg` | Không có; chuẩn hóa báo cáo thành `null` |
| `logicalSessionTimeoutMinutes` | `30` |
| Kết luận | **Standalone**, không phải replica set hoặc mongos |

Không suy ra replica set chỉ từ `isWritablePrimary: true` hoặc khả năng có session. MongoDB standalone không hỗ trợ transaction nhiều document; do đó phương án triển khai hiện tại phải theo mục 7.3. Căn cứ: [MongoDB — Transaction production considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

Chưa chạy transaction thử, chưa đổi mongod, chưa tạo DB test. Khi thực hiện các đợt có ghi phải đọc lại topology; nếu môi trường thay đổi thì báo người dùng, không tự chuyển cấu hình.

### 3.2. Số document hiện có

Đã dùng `countDocuments({})` cho cả 9 collection, không ghi DB.

| Collection | Chuẩn | Thực tế S0 | Kết quả |
|---|---:|---:|---|
| DanhMuc | 6 | 6 | Khớp |
| NhaCungCap | 6 | 6 | Khớp |
| SanPham | 20 | 20 | Khớp |
| KhachHang | 10 | 10 | Khớp |
| NhanVien | 6 | 6 | Khớp |
| TaiKhoan | 6 | 6 | Khớp |
| KhuyenMai | 5 | 5 | Khớp |
| HoaDon | 20 | 20 | Khớp |
| PhieuNhap | 10 | 10 | Khớp |

Các số này là mốc trước khi bổ sung cửa hàng, không phải hằng số trong code. Sau này người dùng chạy setup sẽ có thêm nhân viên hệ thống và collection mới; giao dịch thật sẽ tăng khách/đơn và đổi tồn/điểm. Phải giải thích chênh lệch theo mốc, không dựng lại bộ dữ liệu cũ để ép số đếm khớp.

### 3.3. Khuyến mãi có hiệu lực hôm nay

Đã đọc 5 document khuyến mãi. So sánh trực tiếp thời điểm BSON theo SRS v1.1: `NgayBatDau <= thời điểm xét <= NgayKetThuc`, không cộng thêm ngày. Ngày kết thúc trong bảng lấy **UTC**; trạng thái tính toán tại thời điểm khảo sát nêu trên.

| Mã | Tên | Ngày kết thúc (UTC) | Trạng thái gốc | Trạng thái tính toán 15/11/2026 |
|---|---|---|---|---|
| KM001 | Giảm 10% hóa đơn từ 200.000 | 30/09/2026 | Đang áp dụng | Đã kết thúc |
| KM002 | Giảm 20.000 cho hóa đơn từ 300.000 | 10/10/2026 | Đang áp dụng | Đã kết thúc |
| KM003 | Ưu đãi thành viên 5% | 31/12/2026 | Đang áp dụng | **Đang áp dụng** |
| KM004 | Giảm 15% nhóm đồ uống | 15/10/2026 | Sắp diễn ra | Đã kết thúc |
| KM005 | Đồng giá vận may cuối tuần | 31/08/2026 | Đã kết thúc | Đã kết thúc |

KM003 lưu khoảng `2026-01-01T00:00:00.000Z` đến `2026-12-31T23:59:59.000Z`; giảm `5%`, `DieuKien.DiemToiThieu = 100`, `GiamToiDa = 30000`. Đây là mã duy nhất có hiệu lực trong ngày 15/11/2026. Khách mới bắt đầu 0 điểm nên **không tự động đủ điều kiện dùng mã**, cũng không được nhận điểm của khách cũ nhờ trùng SĐT.

Hiện không cần thêm mã chỉ vì hết chương trình. Để thử ngay ca áp dụng thành công cho khách mới, đề xuất fixture riêng trong `QLSieuThiMini_Test`: mã thử có thời gian hợp lệ, điều kiện phù hợp; hoặc tài khoản thử có 100 điểm. Đây chỉ là đề xuất cho script test sau khi duyệt, S0 không thêm dữ liệu. Nếu cần mã demo trên DB chính hoặc sau 31/12/2026, phải xin quyết định riêng và cung cấp script thủ công; không kéo dài KM003 hoặc tự seed lúc khởi động.

### 3.4. Phương thức thanh toán

Đã aggregate nhóm giá trị `HoaDon.PhuongThucThanhToan`, thu được đúng 4 tên: **Chuyển khoản**, **Thẻ ngân hàng**, **Tiền mặt**, **Ví điện tử**.

Chọn 3 phương thức giả lập: **Chuyển khoản / Thẻ ngân hàng / Ví điện tử**. Lưu đúng chuỗi trên vào `PhuongThucThanhToan`, thêm cờ giả lập riêng; nhãn giao diện ghi rõ “(giả lập)”. Không chọn Tiền mặt để không phát sinh luồng COD. Không yêu cầu thông tin tài khoản/thẻ thật.

## 4. Mô hình dữ liệu bổ sung

### 4.1. Nguyên tắc tương thích

Giữ nguyên 9 collection, field bắt buộc và index cũ. Các trường bổ sung chỉ bắt buộc đối với document online mới; hóa đơn/khách/sản phẩm cũ không cần migration dữ liệu. Không đổi kiểu `MaKH`, `MaHD` hoặc định dạng document `ChiTiet` hiện có. Khách hàng cửa hàng không sử dụng collection `TaiKhoan` của nhân viên.

### 4.2. Collection mới `TaiKhoanKhachHang`

| Field | Kiểu | Bắt buộc | Ý nghĩa/ràng buộc |
|---|---|---|---|
| `_id` | ObjectId | Có | Khóa kỹ thuật |
| `MaTKKH` | string | Có | Mã UUID có tiền tố, unique |
| `MaKH` | string | Có | Tham chiếu KhachHang, unique: một tài khoản/một khách |
| `SDT` | string | Có | SĐT chuẩn hóa, unique, dùng đăng nhập |
| `MatKhauBam` | string | Có | Khóa dẫn xuất scrypt dạng base64, không phải mật khẩu rõ |
| `Salt` | string | Có | Salt ngẫu nhiên riêng, tối thiểu 16 byte, base64 |
| `ThamSoBam` | object | Có | Thuật toán, phiên bản và N/r/p/keylen; phục vụ kiểm chứng hash |
| `TrangThai` | string | Có | `DangTao` hoặc `HoatDong`; chỉ tài khoản HoatDong được đăng nhập |
| `MaYeuCauDangKy` | string | Có | Liên kết nhật ký đăng ký, phục vụ phục hồi đúng bản ghi sở hữu |
| `NgayTao`, `NgayCapNhat` | date | Có | Thời điểm server |

Không lưu mật khẩu rõ trong bất kỳ collection, nhật ký, lỗi, session lâu dài hoặc phản hồi nào. Không trả `MatKhauBam`, `Salt`, `ThamSoBam`, `MatKhau`, kể cả trong dữ liệu lồng nhau. Mật khẩu chỉ tồn tại tạm trong request để băm/kiểm chứng rồi bỏ tham chiếu.

Quy tắc SĐT: nhận chuỗi, bỏ dấu cách/dấu chấm/gạch nối phân cách, đổi tiền tố `+84` thành `0`, sau đó phải khớp `0` và 9 chữ số; lưu chuỗi để giữ số 0 đầu. Dùng cùng một hàm chuẩn hóa cho đăng ký/đăng nhập/chống trùng. Đây là kiểm tra định dạng demo, không chứng minh người dùng sở hữu số điện thoại.

**Chống chiếm tài khoản cũ:** nếu SĐT đã có trong `KhachHang` hoặc `TaiKhoanKhachHang`, không tự gắn tài khoản vào MaKH đó. Trả lỗi đăng ký chung, không cho xem lịch sử/điểm cũ. Đăng ký dành cho SĐT chưa tồn tại; xác minh và chuyển đổi khách cũ là phạm vi cần duyệt riêng.

### 4.3. Khách hàng mới và sinh mã

Khách mới có các field gốc: `MaKH`, `HoTen`, `SDT`, `Email?`, `DiaChi?`, `DiemTichLuy = 0`, `NgayDangKy = thời điểm server`. Không nhận `DiemTichLuy`, `MaKH` hoặc ngày đăng ký do client gửi. Có thể bổ sung `NguonTao = ONLINE`, `MaYeuCauDangKy` để phục hồi đăng ký mà không đụng dữ liệu cũ.

| Mã | Quy tắc sinh | Bảo đảm |
|---|---|---|
| `MaKH` | `KH_ONL_` + UUID v4 bỏ gạch nối | Unique index MaKH đã có; không đụng KH001… |
| `MaHD` | `HD_ONL_` + UUID v4 bỏ gạch nối | Unique index MaHD đã có; không đụng HD001… |
| `MaTKKH` | `TKKH_` + UUID v4 bỏ gạch nối | Unique index mới |
| Mã yêu cầu/giao dịch giả lập | UUID v4 từ `crypto.randomUUID()` | Mã riêng cho từng tác vụ |

Unique index là cơ chế chặn trùng cuối cùng, không chỉ dựa vào xác suất UUID. Nếu trùng mã tự sinh thì thử lại tối đa 3 lần; không dùng `countDocuments + 1`, không sửa mã cũ. Idempotency key của người dùng có quy tắc riêng ở mục 6.5, không tự đổi key khi retry.

### 4.4. Nhân viên hệ thống

Script thủ công tạo một nhân viên nếu chưa có: `MaNV = NV_ONLINE`, `HoTen = Bán hàng online`, `ChucVu = Nhân viên hệ thống`, `Luong = 0`, `NgayVaoLam` là lúc khởi tạo, `TrangThai = Đang làm`. Không cần tạo tài khoản nhân viên trong `TaiKhoan`.

Mọi hóa đơn online dùng `MaNV = NV_ONLINE` do server gán. Script chạy lại không sửa ngày vào làm hoặc ghi đè hồ sơ; nếu mã đã tồn tại nhưng không đúng nhân viên hệ thống dự kiến, dừng và báo xung đột để người dùng quyết định.

### 4.5. Trường bổ sung trên `HoaDon`

Vẫn ghi đầy đủ `MaHD`, `MaKH`, `MaNV`, `NgayLap`, `ChiTiet`, `TongTien`, `GiamGia`, `ThanhTien`, `PhuongThucThanhToan`. `MaKM` là chuỗi tùy chọn: không có mã thì **bỏ field**, không ghi `null` trái schema gốc.

| Field mới | Kiểu | Quy tắc cho đơn online |
|---|---|---|
| `NguonDon` | string | `ONLINE`; document cũ thiếu field vẫn hợp lệ |
| `TrangThaiDon` | string | `Đã xác nhận`; không có luồng hủy/giao hàng trong v1 |
| `DiaChiGiao` | object | Snapshot `HoTenNguoiNhan`, `SDTNguoiNhan`, `DiaChi`; không phụ thuộc thay đổi hồ sơ sau này |
| `MaChongGuiTrung` | string | Idempotency key gắn với MaKH |
| `MaBaoGia` | string | Một báo giá chỉ tạo tối đa một hóa đơn |
| `ThanhToanGiaLap` | bool | Luôn true |
| `TrangThaiThanhToan` | string | `Đã thanh toán giả lập` |
| `MaGiaoDichGiaLap` | string | Mã mô phỏng ổn định qua các lần retry |
| `DiemDuocCong` | int/long | `floor(ThanhTien / 10000)` |
| `TrangThaiTichDiem` | string | `ChoXuLy` hoặc `DaCong`; transaction ghi DaCong, standalone có thể tạm ChoXuLy |

`ChiTiet[]` ghi tên và đơn giá lấy từ DB tại lần xác nhận; `ThanhTien` dòng bằng số lượng × đơn giá. Có thể thêm `MaDM` snapshot để giải thích phần hàng được giảm theo nhóm. Không lấy tên/giá từ client, không dùng giá hiện tại để sửa hóa đơn đã lưu.

Không ghi đơn nháp/đơn thất bại vào `HoaDon`: API quản trị hiện tính doanh thu trên mọi hóa đơn và sẽ giữ nguyên hành vi. Báo giá và tác vụ dở dang nằm ngoài collection này. Đơn online đã xác nhận xuất hiện tự nhiên trong báo cáo cũ qua `ThanhTien`.

### 4.6. Collection mới `YeuCauCuaHang` và dấu mốc phục hồi

Đây là nhật ký bền vững của nghiệp vụ, phục vụ idempotency và phục hồi sau lỗi; không phải lịch sử log chứa thông tin đăng nhập.

| Nhóm field | Nội dung |
|---|---|
| Định danh | `_id`, `MaYeuCau`, `Loai` (`DANG_KY`/`DAT_HANG`), `MaKH`, `NgayTao`, `NgayCapNhat` |
| Đặt hàng | `MaChongGuiTrung`, `MaBaoGia`, `DauVanTay` SHA-256 của payload đã chuẩn hóa; MaHD được cấp trước |
| Tiến độ | `TrangThai` (`DANG_XU_LY`/`HOAN_TAT`/`THAT_BAI`/`CAN_PHUC_HOI`), `Buoc`, danh sách mã sản phẩm/số lượng cần giữ/đã xác nhận giữ, kết quả lỗi đã làm sạch |
| Snapshot | Nội dung hợp lệ cần thiết để tiếp tục tác vụ: khách, dòng hàng, giá, giảm giá, địa chỉ, phương thức giả lập; không chứa mật khẩu/hash/session/CSRF token |
| Đăng ký | Mã tài khoản và khách do tác vụ sở hữu để tiếp tục/kết thúc hoặc hoàn tác bản ghi DangTao |

Đối với standalone, bổ sung field nội bộ tùy chọn `SanPham.GiuChoOnline[]` chứa `MaYeuCau`, số lượng; marker được ghi **cùng một cập nhật nguyên tử** với việc trừ tồn. `KhachHang.DiemDaCongOnline[]` lưu MaHD đã cộng điểm, marker và cộng điểm cũng cùng một cập nhật nguyên tử. Không có marker trên document cũ vẫn được hiểu là mảng rỗng.

Marker là bằng chứng khi kết quả ghi bị mất do ngắt kết nối; nhật ký một mình không đủ vì có thể crash sau ghi trước khi cập nhật nhật ký. Không tự suy ra “chưa trừ tồn” chỉ vì journal chưa đánh dấu.

Trong v1 giữ các dấu mốc chống lặp và nhật ký kết thúc, không có TTL tự xóa hoặc xóa dấu mốc tùy tiện. Đây là thiết kế demo một process; dung lượng marker/journal phải được theo dõi, chưa tuyên bố đáp ứng tải lớn hoặc tăng trưởng không giới hạn. API chỉ chiếu field cho phép, không trả các field nội bộ này.

### 4.7. Script thiết lập thủ công, validator và index

Các tên sau là kế hoạch, **chưa tạo trong S0**:

| Script dưới `webapp/db-setup/` | Mục đích |
|---|---|
| `01_store_schema_indexes.js` | Kiểm tra đúng DB đích; tạo hai collection mới nếu thiếu; mở rộng validator có điều kiện cho dữ liệu online; tạo index cần thiết nếu chưa có |
| `02_online_employee.js` | Khởi tạo nhân viên hệ thống bằng quy tắc chỉ thêm nếu thiếu, phát hiện xung đột |
| `90_test_fixtures.js` | Chỉ cho `QLSieuThiMini_Test`: tài khoản/điểm, hàng tồn cuối, chương trình thử và fixture phục vụ ca biên |

Mỗi script có allowlist tên DB chính xác; script fixture chỉ chấp nhận `QLSieuThiMini_Test`. Người dùng tự chọn đúng DB và chạy trong Studio 3T. Script đọc trạng thái hiện có trước; dùng cùng định nghĩa khi chạy lại; không drop/rebuild, không ghi đè dữ liệu gốc, không đặt lại tồn/điểm. Nếu validator/index/dữ liệu hiện có xung đột thì dừng, báo chi tiết không chứa bí mật. Mở rộng validator phải giữ nguyên mọi ràng buộc cũ, không thay bằng schema chỉ biết field cửa hàng.

Index mới dự kiến:

- `TaiKhoanKhachHang`: unique `MaTKKH`, unique `MaKH`, unique `SDT` đã chuẩn hóa.
- `YeuCauCuaHang`: unique `MaYeuCau`; partial unique `(MaKH, MaChongGuiTrung)` và `(MaKH, MaBaoGia)` cho `Loai = DAT_HANG`; index trạng thái/thời gian để tìm tác vụ cần phục hồi.
- `HoaDon`: partial unique `(MaKH, MaChongGuiTrung)` và `(MaKH, MaBaoGia)` chỉ khi `NguonDon = ONLINE` và trường tương ứng hợp lệ. Không đặt unique đơn giản trên field tùy chọn khiến hóa đơn cũ thiếu field bị trùng.
- Giữ unique `KhachHang.SDT`, `KhachHang.MaKH`, `HoaDon.MaHD` và mọi index gốc. Không tạo index khi server khởi động.

Preflight lúc khởi động chỉ **đọc** metadata cần thiết để xác nhận collection, index, validator và nhân viên hệ thống đã sẵn sàng. Thiếu thiết lập: `/store-api` ghi trả `503 STORE_SETUP_REQUIRED`, không tự bootstrap; `/api` vẫn đọc như trước. Lệnh metadata chỉ đọc phục vụ preflight không phải nới quyền ghi cho quản trị.

## 5. Đăng ký, session và bảo mật

### 5.1. Băm và kiểm chứng mật khẩu

Dùng `crypto.scrypt` bất đồng bộ, salt ngẫu nhiên ít nhất 16 byte/tài khoản, khóa 64 byte, tham số ban đầu `N = 2^17`, `r = 8`, `p = 1`, `maxmem = 256 MiB`. Ghi phiên bản tham số cùng hash; kiểm chứng bằng phép so sánh thời gian cố định với buffer cùng độ dài. Không dùng hash nhanh đơn thuần hoặc mã hóa có thể giải ngược thay scrypt. Cấu hình N/r/p được chọn theo [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html); salt và giới hạn bộ nhớ theo [Node.js crypto.scrypt](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

Mật khẩu 12–128 ký tự Unicode, giới hạn thêm 1.024 byte UTF-8, không tự trim/đổi hoa thường/chuẩn hóa mật khẩu. Kiểm tra độ dài trước khi băm; tối đa 2 tác vụ scrypt đang chạy để giới hạn bộ nhớ, hàng đợi hữu hạn và trả 429 khi quá tải. Benchmark và kiểm chứng tham số ở S1, không tự hạ độ khó khi máy chậm.

Đăng nhập sai luôn `401 INVALID_CREDENTIALS` với cùng thông báo “SĐT hoặc mật khẩu không đúng”, dù số không tồn tại, tài khoản đang tạo hay mật khẩu sai. Đường xử lý số không tồn tại cũng thực hiện kiểm chứng KDF giả để giảm chênh lệch thời gian. Không log body đăng ký/đăng nhập.

Giới hạn ban đầu: 5 lần thất bại/15 phút trên tổ hợp SĐT chuẩn hóa + IP và 20 lần/IP/15 phút; kiểm tra giới hạn trước khi truy vấn tài khoản. Vượt ngưỡng trả 429 và `Retry-After`. Bộ đếm trong bộ nhớ phù hợp một process local, bị mất khi khởi động lại; chưa cam kết chống tấn công phân tán. Đăng ký cũng phải giới hạn tốc độ để tránh lạm dụng KDF.

### 5.2. Session và CSRF

- Session ID ngẫu nhiên 32 byte, cookie `httpOnly`, `SameSite=Strict`, `Path=/store-api`, không đặt Domain. HTTPS dùng `Secure`; chỉ môi trường local HTTP được tắt Secure và phải ghi rõ ngoại lệ cấu hình.
- Session lưu phía server trong bộ nhớ; khóa tra cứu dùng SHA-256 của SID. Không gửi SID trong JSON, URL hoặc localStorage. Hạn tuyệt đối 8 giờ, hết hạn sau 30 phút không hoạt động.
- Đăng nhập thành công xoay SID và CSRF token, chuyển giỏ ẩn danh đã kiểm tra vào session mới, hủy SID cũ. Đăng xuất hủy session/cookie; không hủy đơn đã tạo.
- `GET /store-api/session` bootstrap session ẩn danh và trả CSRF token cho trang cùng origin; chỉ tạo trạng thái bộ nhớ/cookie, không ghi DB nghiệp vụ. Response auth/session có `Cache-Control: no-store`.
- **Mọi request ghi** POST/PATCH/DELETE, gồm đăng ký, đăng nhập, đăng xuất, giỏ hàng, báo giá và đặt hàng, phải có `X-CSRF-Token` hợp lệ gắn session. Kiểm tra Origin đúng origin cấu hình; thiếu/sai thì từ chối. Không dùng GET để thay đổi nghiệp vụ.
- CORS chỉ cùng origin; không cho wildcard kèm credential. SameSite là lớp bổ sung, không thay CSRF token. Căn cứ: [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Giỏ hàng và báo giá cũng lưu trong bộ nhớ session để không phát sinh collection phụ hoặc ghi DB qua GET. Restart làm mất đăng nhập/giỏ/báo giá chưa đặt; đơn đã tạo và idempotency bền vững vẫn còn. Mở nhiều tab dùng cùng giỏ có revision; sửa giỏ làm báo giá cũ mất hiệu lực. Không hỗ trợ nhiều instance hoặc lưu giỏ xuyên thiết bị trong v1.

### 5.3. Quyền sở hữu và dữ liệu an toàn

MaKH lấy từ session đã xác thực, không tin MaKH client truyền. Mọi truy vấn đơn phải gồm MaKH session và `NguonDon = ONLINE`; đơn người khác và mã không tồn tại đều 404 cùng nội dung. Không có API danh sách khách hàng, tài khoản hoặc đơn toàn hệ thống trong `/store-api`.

Dùng projection/DTO allowlist theo endpoint; không trả hash, salt, tham số KDF, marker, journal nội bộ, session, stack trace hoặc URI trong bất kỳ phản hồi lỗi/dữ liệu lồng nhau. CSRF token là ngoại lệ có chủ ý chỉ ở bootstrap session của chính trình duyệt đó. Sản phẩm công khai không trả `DonGiaNhap`, thông tin riêng của NCC hoặc dữ liệu tài khoản.

Client không gửi MongoDB filter/pipeline/toán tử; từ chối field/query/header nghiệp vụ sai định dạng hoặc không được định nghĩa. Escape regex cho tìm kiếm; giới hạn chuỗi, mảng, số lượng và kích thước body. Frontend chèn dữ liệu bằng `textContent` và API DOM an toàn, không `innerHTML`. Không đưa token/mật khẩu vào URL. Log chỉ request ID, route, HTTP code và mã lỗi đã làm sạch; không log URI, cookie, body bí mật hoặc địa chỉ đầy đủ.

### 5.4. Đăng ký nhất quán

Trên replica set đủ điều kiện, tài khoản và KhachHang mới cùng transaction. Trên standalone: nhật ký đăng ký bền vững → tạo tài khoản `DangTao` với hash → tạo KhachHang mới thuộc tác vụ → kích hoạt tài khoản → kết thúc nhật ký. Unique SDT ở hai collection chặn đăng ký đồng thời.

Khi lỗi hoặc crash, phục hồi theo trạng thái và ownership: nếu tài khoản đã HoatDong và khách phù hợp thì hoàn tất tiến về trước; nếu chưa kích hoạt thì chỉ hoàn tác bản ghi DangTao/khách mới **có đúng mã tác vụ sở hữu**, không xóa/đổi khách cũ. Chưa phân định được kết quả ghi thì chặn thử tiếp và trả trạng thái tạm thời, không tự gán tài khoản sang hồ sơ khác. Nhật ký không chứa hash hoặc mật khẩu; hash chỉ ở tài khoản. Đăng ký không tự đăng nhập; khách dùng màn hình đăng nhập sau thành công.

## 6. Quy tắc nghiệp vụ cửa hàng

### 6.1. Hàng hóa, giỏ và giá

| Mã | Quy tắc |
|---|---|
| SB-01 | Mỗi dòng có MaSP duy nhất và số lượng nguyên 1–99; giỏ tối đa 50 mã khác nhau. Gộp thao tác thêm cùng mã, không tạo dòng trùng |
| SB-02 | Tên, đơn vị, giá bán, nhóm hàng và tồn lấy từ DB; giá client chỉ để hiển thị, không dùng để tính tiền |
| SB-03 | Còn hàng dựa `SoLuongTon`; tồn 0 không đặt, tồn 1–19 cảnh báo thấp. Không suy ra tồn từ phiếu nhập/hóa đơn |
| SB-04 | Checkout kiểm tra số lượng và trừ tồn bằng điều kiện `SoLuongTon >= lượng mua`, kèm điều kiện chống áp dụng lại; không đọc rồi ghi số tồn tuyệt đối |
| SB-05 | Không bán sản phẩm có ngày hết hạn trước hôm nay theo Asia/Ho_Chi_Minh; thiếu hạn hiển thị “Chưa có hạn sử dụng”, không tự coi là hết hạn |
| SB-06 | Chỉ cho mua trạng thái gốc đã nhận diện thuộc nhóm bán: Đang bán/Sắp hết hàng/Hết hàng, nhưng vẫn phải có tồn dương. Ngừng bán hoặc trạng thái lạ bị chặn. Không tự sửa TrangThai gốc khi trừ tồn |
| SB-07 | Sản phẩm tham chiếu thiếu danh mục vẫn hiển thị với nhãn thiếu thông tin. Nếu coupon cần MaDM mà không xác minh được thì từ chối coupon, không tự đoán |

Đơn giá hợp lệ phải hữu hạn, không âm và biểu diễn số nguyên VNĐ an toàn. Không âm thầm làm tròn dữ liệu giá sai; trả lỗi dữ liệu sản phẩm. Tất cả phép nhân/cộng phải kiểm tra không vượt miền số nguyên an toàn. Bảng chi tiết đơn dùng tên/giá snapshot, không ghi lại khi giá DB thay đổi.

### 6.2. Tiền và điểm

- Thành tiền dòng = số lượng × đơn giá bán DB.
- `TongTien = tổng thành tiền dòng` trước giảm; `GiamGia = mức giảm hợp lệ`; `ThanhTien = TongTien - GiamGia`.
- Không phí ship/phụ phí. Giảm giá không âm, không lớn hơn phần tiền đủ điều kiện, và `ThanhTien >= 0`.
- `DiemDuocCong = floor(ThanhTien / 10000)`, chỉ cộng một lần cho đơn được xác nhận. Không tính điểm theo TongTien, không hồi tố hóa đơn cũ, không suy ra điểm hiện có từ lịch sử mua.
- Điểm để xét coupon là điểm **đã lưu trước đơn hiện tại**, không cộng trước điểm sắp kiếm để đạt điều kiện.

### 6.3. Khuyến mãi theo mã

Một đơn nhận tối đa một MaKM do khách nhập; server chuẩn hóa mã (trim, viết hoa), tìm trong DB, không tự chọn hoặc chồng nhiều ưu đãi.

Thời điểm do server cấp: chưa bắt đầu nếu `< NgayBatDau`, hợp lệ khi `NgayBatDau <= thời điểm <= NgayKetThuc`, hết hiệu lực khi `> NgayKetThuc`. Kiểm tra lại khi xác nhận đơn, không dựa riêng vào thời điểm xem báo giá. Không cộng ngày hoặc đổi BSON timestamp. Hiển thị NgayKetThuc riêng theo **UTC**, có nhãn “Ngày kết thúc (UTC)”; ví dụ KM001 là 30/09/2026. Các ngày còn lại và lọc/nhóm ngày theo Asia/Ho_Chi_Minh như SRS gốc. Luôn phân biệt trạng thái tính toán với trạng thái gốc; không lấy trạng thái gốc lỗi thời làm bằng chứng còn hiệu lực.

| `DieuKien` | Cách kiểm tra |
|---|---|
| `DonHangToiThieu` | TongTien cả đơn >= ngưỡng |
| `DiemToiThieu` | DiemTichLuy đã lưu trước đơn >= ngưỡng |
| `MaDM` | Chỉ phần hàng có MaDM này được giảm; không có dòng phù hợp thì không đạt |
| `SoLuongToiThieu` | Tổng số lượng thuộc MaDM nếu có điều kiện MaDM; nếu không, tổng số lượng cả giỏ >= ngưỡng |
| `GiamToiDa` | Chặn số tiền giảm ở mức tối đa |

Loại `Phần trăm`: `floor(tiền phần hàng đủ điều kiện × GiaTri / 100)` rồi áp dụng trần. Loại `Số tiền`: giảm GiaTri, chặn bởi trần và tiền phần hàng đủ điều kiện. Nếu không có MaDM thì phần đủ điều kiện là cả đơn. Không mã thì GiamGia = 0. Điều kiện/loại/giá trị không được hỗ trợ, sai kiểu hoặc không hợp lệ phải bị từ chối có giải thích, không bỏ qua để giảm sai.

NgayLap được chốt tại lần server nhận xử lý xác nhận hợp lệ, dùng thống nhất khi kiểm tra coupon và ghi đơn. Tác vụ chờ quá hạn báo giá phải được báo giá lại trước khi giữ tồn. Không lấy giờ client hoặc sửa NgayLap để làm coupon hợp lệ.

### 6.4. Báo giá và thanh toán giả lập

Báo giá sống 5 phút, gắn session/MaKH/revision giỏ, chứa snapshot tên/giá/tiền hàng/giảm/thực thu, địa chỉ, MaKM và một trong 3 phương thức đã chốt ở mục 3.4. Xem báo giá chưa giữ tồn, chưa cộng điểm, chưa ghi HoaDon.

Xác nhận kiểm tra lại dữ liệu DB, tồn, điều kiện coupon và điểm. Nếu giá/tên/dữ liệu ảnh hưởng đơn thay đổi thì trả `409 QUOTE_CHANGED`, yêu cầu khách xem lại báo giá mới; không tự thu số tiền khác màn hình đã duyệt. Tồn vừa đủ vẫn phải được đảm bảo bởi cập nhật có điều kiện, không chỉ bởi báo giá.

Thanh toán là mô phỏng nội bộ và hiển thị rõ “Không thu tiền thật”. Chỉ tạo kết quả giả lập ổn định theo cùng tác vụ, không gọi dịch vụ ngoài trong callback transaction có thể retry. Giả lập thành công là luồng bình thường; lỗi giả lập được kiểm thử bằng fixture/failpoint **chỉ ở DB Test**, không có endpoint public sửa kết quả. Giả lập thất bại trước công bố hóa đơn không sinh đơn thành công hoặc điểm.

### 6.5. Chống gửi trùng

Client tạo một `Idempotency-Key` UUID cho một lần xác nhận và giữ nguyên khi retry/timeout/bấm lặp. Server gắn key với MaKH, MaBaoGia và dấu vân tay payload đã chuẩn hóa. Cả journal và HoaDon có unique guard; khóa nút giao diện chỉ là hỗ trợ UX.

| Tình huống | Kết quả |
|---|---|
| Key mới, báo giá mới hợp lệ | Tối đa một đơn; hoàn tất lần đầu 201 |
| Cùng key và cùng payload đã thành công | 200, trả đúng MaHD/kết quả cũ, không trừ tồn/cộng điểm lần nữa |
| Cùng key và cùng payload đang xử lý | 202, mã yêu cầu và Retry-After; tra trạng thái hoặc retry cùng key |
| Cùng key nhưng payload khác | 409 IDEMPOTENCY_CONFLICT |
| Key khác nhưng dùng lại báo giá đã có đơn | 409 QUOTE_ALREADY_USED, không tạo đơn thứ hai |
| Tác vụ thất bại đã hoàn tác xong | Trả lỗi kết thúc đã lưu; thử đơn mới phải xem báo giá mới/key mới |

Tìm kết quả idempotency đã lưu **trước** kiểm tra báo giá trong bộ nhớ: sau restart, báo giá đã mất/hết hạn vẫn phải trả lại đơn cũ của đúng khách, không tạo lại. Không trả đơn người khác khi dò key. Giỏ đang checkout bị khóa sửa cho đến khi kết thúc/hoàn tác; sau thành công xóa đúng revision đã mua, không xóa giỏ mới do thao tác khác.

## 7. Chiến lược nhất quán dữ liệu

### 7.1. Chọn chiến lược và điều kiện vận hành

Chọn theo topology thực tế và kiểm chứng khả năng trên DB Test, không suy luận từ version driver. Hiện máy là standalone, vì vậy nhánh 7.3 là phương án cần kiểm thử. Nếu sau này là replica set phù hợp thì dùng 7.2; topology chưa rõ/không đủ quyền kiểm tra thì cửa hàng không được nhận ghi.

Giới hạn v1: một process Node local, không cluster/multi-instance. Giai đoạn xử lý ghi quan trọng được xếp hàng tuần tự trong process; yêu cầu HTTP có thể đến đồng thời nhưng không có hai executor cùng xử lý một tác vụ. Không tự hết hạn/chiếm khóa đang chạy dựa riêng vào timeout. Khi restart phải phục hồi tác vụ cũ trước khi mở luồng ghi mới. Nếu không chứng minh executor cũ đã dừng, chặn ghi và báo người dùng.

### 7.2. Nếu hỗ trợ transaction

Đặt stock update có điều kiện, insert HoaDon, cộng điểm và journal/idempotency trong cùng session/transaction; dùng snapshot read concern và majority write concern theo deployment. Session phải được truyền vào mọi thao tác thuộc transaction. Registration cũng phải gộp tài khoản và khách mới.

Transaction conflict/đua tồn phải abort/retry có giới hạn theo nhãn lỗi driver; callback retry dùng cùng mã nghiệp vụ/key, không tạo kết quả thanh toán giả lập mới hoặc side effect ngoài DB. Kết quả commit chưa rõ phải truy lại idempotency/đơn để phân định, không coi timeout là chắc chắn thất bại rồi đặt đơn mới. Khả năng transaction và ca retry chỉ thử ghi trên `QLSieuThiMini_Test`.

### 7.3. Standalone: cập nhật có điều kiện và hoàn tác

**Không có atomicity nhiều document như transaction.** Thiết kế bảo đảm không bán âm, không ghi đơn trùng, có bằng chứng phục hồi và không đưa đơn thất bại vào doanh thu; chấp nhận cửa sổ trạng thái đang xử lý trước khi hội tụ. Không tuyên bố tất cả collection luôn đổi đồng thời.

Trình tự đặt đơn:

1. Nhận/tra journal theo khách + key; kiểm tra payload, khóa giỏ và vào hàng đợi ghi. Ghi mã tác vụ/MaHD ổn định trước mọi hiệu ứng. Xác thực lại báo giá, coupon, điểm và kết quả mô phỏng thanh toán.
2. Giữ từng mã hàng theo thứ tự MaSP: cập nhật nguyên tử có điều kiện tồn đủ và chưa có marker tác vụ, giảm `SoLuongTon` đồng thời thêm `GiuChoOnline`. Nếu marker đã có, xác minh khớp số lượng để tiếp tục, không trừ lần nữa.
3. Nếu bất kỳ món không đủ hoặc lỗi trước khi có HoaDon: hoàn tác từng marker thuộc tác vụ, tăng trả đúng số lượng và xóa marker **trong cùng cập nhật có điều kiện**. Retry hoàn tác không được tăng tồn lần hai. Không ghi đè tồn tuyệt đối từ snapshot, vì có thể mất thay đổi khác.
4. Chỉ khi mọi món đã giữ và kiểm tra xong mới insert **HoaDon đã xác nhận**. Đây là mốc công bố đơn; unique MaHD/key/báo giá là lớp bảo vệ cuối. Không insert trạng thái chờ/thất bại vào HoaDon để tránh đổi hành vi báo cáo quản trị.
5. Sau khi HoaDon tồn tại, không xóa hóa đơn/hoàn tồn khi bước sau lỗi. Phục hồi **tiến về trước**: cộng điểm có điều kiện chưa có marker MaHD, đồng thời thêm marker trên KhachHang; cập nhật trạng thái tích điểm, journal hoàn tất và giỏ. Cộng điểm không được lặp khi crash sau cập nhật trước đánh dấu journal.
6. Tác vụ chưa xác định kết quả trả 202/503 phục hồi, không báo thất bại cuối cùng hoặc thành công đầy đủ khi chưa biết. Khách chưa xong cộng điểm không được dùng một checkout tiếp theo để lách điều kiện điểm; giữ hàng đợi/khóa đến khi xử lý xong.

Khi mất kết nối hoặc restart: đọc HoaDon theo MaHD/key trước. Có đơn thì hoàn thiện bước 5; không có đơn sau khi phân định được ghi chưa xảy ra thì hoàn tác các marker giữ hàng. Kết quả ghi chưa chắc chắn phải đọc lại bằng chứng trước khi bù, không bù “mù” theo lỗi mạng. Chỉ mở lại ghi sau khi journal cần phục hồi được phân định; `/api` đọc vẫn hoạt động.

Trong cửa sổ giữ hàng, trang quản trị có thể thấy tồn khả dụng đã giảm dù đơn chưa công bố; nếu thất bại thì hoàn tác sẽ khôi phục. Sau công bố, điểm có thể tạm chờ; giao diện cửa hàng phải thể hiện đang hoàn tất, không nhân đôi đơn để chữa. Không thay filter doanh thu của `/api`, không tự tính lại tồn từ hóa đơn.

Không hỗ trợ có process ngoài ứng dụng cùng sửa tồn/điểm hoặc sửa thủ công các marker trong lúc checkout/recovery; nếu phát hiện bằng chứng xung đột phải chặn tác vụ và báo người dùng, không cưỡng ép dữ liệu. Đây là giới hạn minh họa local, chưa phải bảo đảm nhất quán khi nhiều hệ thống ghi đồng thời.

### 7.4. Điều kiện dừng về nhất quán

Nếu ca crash giữa chừng/đơn tranh món cuối/gửi trùng không đạt trên Test, **giữ checkout bị vô hiệu hóa**, báo lỗi và đề xuất replica set để người dùng quyết định. Không tự chạy `rs.initiate`, sửa service/config, restart mongod, đổi URI hoặc bật replica set. Việc duyệt tài liệu không đồng nghĩa duyệt thay đổi topology.

## 8. Hợp đồng API `/store-api`

### 8.1. Quy ước chung

Response thành công chứa `data`; danh sách có `pagination: {page, limit, total, totalPages}`. Lỗi chứa `error: {code, message, requestId}`; có thể thêm lỗi field đã làm sạch, không trả lỗi thô của driver. Ngày vận chuyển dữ liệu là ISO 8601; frontend định dạng theo quy tắc thời gian ở mục 6.3.

`P` = `page` nguyên 1–10.000, `limit` nguyên 1–100, mặc định 1/20; không ép chuỗi sai kiểu thành số. Từ khóa q tối đa 100 ký tự, tìm regex đã escape. Mã sản phẩm/danh mục tối đa 50 ký tự theo allowlist ký tự; mã đơn cho phép tối đa 50 ký tự phù hợp UUID có tiền tố. Sort phải thuộc enum. Query lạ, query lặp, body lạ, object thay cho scalar, toán tử MongoDB hoặc JSON quá 16 KiB bị từ chối (400/413). Giá từ/đến không âm và giá từ <= giá đến.

`W` = bắt buộc session ẩn danh hoặc đã đăng nhập, CSRF và Origin hợp lệ cho mọi method ghi. `A` = bắt buộc đăng nhập; mọi MaKH chỉ lấy từ session. GET không thay đổi DB nghiệp vụ. Route có thật nhưng sai method trả 405 với Allow tương ứng; route không có trả 404. `/api` vẫn giữ 405 cho mọi method khác GET như trước, không phụ thuộc router cửa hàng.

### 8.2. Danh sách endpoint

| Method | Đường dẫn | Tham số/body hợp lệ | Quyền | Đọc/ghi và kết quả |
|---|---|---|---|---|
| GET | `/store-api/session` | Không | Công khai | Bootstrap session bộ nhớ; trả đã đăng nhập hay chưa, hồ sơ tối thiểu nếu có, CSRF token; 200 |
| POST | `/store-api/auth/dang-ky` | `hoTen`, `sdt`, `matKhau`, `email?`, `diaChi?` | W | Tạo tài khoản + KhachHang mới qua chiến lược mục 5.4; 201, không trả mật khẩu/hash, không tự đăng nhập |
| POST | `/store-api/auth/dang-nhap` | `sdt`, `matKhau` | W | Kiểm chứng scrypt, xoay session/CSRF; 200 hồ sơ tối thiểu, 401 chung khi sai |
| POST | `/store-api/auth/dang-xuat` | Body rỗng | W + A | Hủy session/cookie bộ nhớ; 200 |
| GET | `/store-api/tai-khoan` | Không | A | Hồ sơ KhachHang của chính khách, điểm đã lưu; 200 |
| GET | `/store-api/danh-muc` | P | Công khai | DanhMuc: mã/tên/mô tả hiển thị, không dữ liệu nội bộ; 200 |
| GET | `/store-api/san-pham` | P, `q?`, `maDM?`, `giaTu?`, `giaDen?`, `sort?` | Công khai | SanPham + lookup tên DanhMuc, giữ khi thiếu tham chiếu; sort `ma-tang` mặc định, `gia-tang`, `gia-giam`, mã phụ ổn định; 200 |
| GET | `/store-api/san-pham/:maSP` | Mã trên path, không query | Công khai | Sản phẩm công khai, tồn/nhãn hạn, tên danh mục; 200/404 |
| GET | `/store-api/khuyen-mai` | Không | Công khai | Chương trình có hiệu lực theo thời điểm server, điều kiện và hai trạng thái; không kết luận khách đủ điều kiện trước khi báo giá; 200 |
| GET | `/store-api/gio-hang` | Không | Session | Giỏ bộ nhớ; đọc SanPham để trả tên/giá/tồn và cảnh báo hiện tại, không tự sửa DB; 200 |
| POST | `/store-api/gio-hang/items` | `maSP`, `soLuong` | W | Thêm/gộp giỏ bộ nhớ, kiểm tra giới hạn; 200 |
| PATCH | `/store-api/gio-hang/items/:maSP` | `soLuong` | W | Đặt số lượng 1–99, không dùng 0 để xóa; 200/404 |
| DELETE | `/store-api/gio-hang/items/:maSP` | Không body | W | Bỏ một dòng giỏ; 200/404 |
| DELETE | `/store-api/gio-hang` | Không body | W | Xóa giỏ bộ nhớ, không xóa DB/đơn; 200 |
| POST | `/store-api/thanh-toan/xem-truoc` | `maKM?`, `diaChiGiao`, `phuongThuc` | W + A | Đọc hàng/coupon/điểm, tạo báo giá bộ nhớ từ giỏ hiện tại; 200, chưa tạo đơn |
| POST | `/store-api/don-hang` | `maBaoGia`; header `Idempotency-Key` | W + A | Xác nhận theo mục 7: tồn, HoaDon, điểm, journal; 201 mới, 200 replay, 202 đang xử lý |
| GET | `/store-api/don-hang` | P | A | HoaDon online của MaKH session; NgayLap giảm dần + MaHD phụ ổn định; 200 |
| GET | `/store-api/don-hang/:maHD` | Mã trên path, không query | A | Đơn của chính khách, snapshot ChiTiet, tiền, trạng thái, địa chỉ và phương thức giả lập; 200/404 |
| GET | `/store-api/yeu-cau-dat-hang/:key` | UUID key, không query | A | Chỉ DTO tiến độ tác vụ đặt của chính khách, MaHD nếu đã có; không trả journal thô; 200/404 |

Giới hạn body: họ tên 2–100 ký tự; email tùy chọn <=254, đúng định dạng cơ bản; địa chỉ <=500; `diaChiGiao` gồm `hoTenNguoiNhan` 2–100, `sdtNguoiNhan` chuẩn hóa như SĐT, `diaChi` 10–500. `phuongThuc` chỉ một trong 3 tên chính xác ở mục 3.4; `maKM` <=50 ký tự. Mọi body chỉ nhận các field được ghi trong hợp đồng; không nhận giá, tổng tiền, điểm, trạng thái, nguồn đơn, MaKH/MaNV do client gửi.

### 8.3. HTTP code và mã lỗi

| HTTP | Mã lỗi chính | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `UNKNOWN_PARAMETER`, `IDEMPOTENCY_KEY_REQUIRED` | Đầu vào/tham số lạ/sai kiểu/thiếu key |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS` | Chưa đăng nhập hoặc thông tin đăng nhập sai, không lộ sự tồn tại SĐT |
| 403 | `CSRF_INVALID`, `ORIGIN_INVALID` | Thiếu/sai bảo vệ request ghi |
| 404 | `PRODUCT_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `ORDER_NOT_FOUND`, `REQUEST_NOT_FOUND` | Không có hoặc không thuộc khách, không phân biệt đơn người khác |
| 405 | `METHOD_NOT_ALLOWED` | Method không nằm trong hợp đồng |
| 409 | `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE`, `PRODUCT_DATA_INVALID` | Tồn/khả năng bán/dữ liệu sản phẩm không hợp lệ |
| 409 | `PROMOTION_NOT_FOUND`, `PROMOTION_NOT_STARTED`, `PROMOTION_EXPIRED`, `PROMOTION_NOT_ELIGIBLE`, `PROMOTION_UNSUPPORTED` | Coupon không dùng được; thông báo điều kiện đã làm sạch |
| 409 | `QUOTE_CHANGED`, `QUOTE_EXPIRED`, `QUOTE_ALREADY_USED`, `CART_BUSY` | Phải xem lại báo giá hoặc chờ tác vụ hiện tại |
| 409 | `IDEMPOTENCY_CONFLICT`, `REGISTRATION_UNAVAILABLE` | Key bị dùng cho payload khác; hoặc không thể đăng ký bằng thông tin hiện tại |
| 413 | `PAYLOAD_TOO_LARGE` | Body vượt giới hạn |
| 429 | `TOO_MANY_ATTEMPTS` | Rate limit/hàng đợi băm đầy, có Retry-After |
| 503 | `STORE_SETUP_REQUIRED`, `RECOVERY_PENDING`, `DATABASE_UNAVAILABLE` | Chưa thiết lập/đang phục hồi/không kết nối; không tự sửa DB |
| 500 | `INTERNAL_ERROR` | Thông báo chung kèm requestId, không stack/driver payload |

202 là trạng thái tác vụ chưa xong, không phải xác nhận một đơn mới thứ hai. Chi tiết lỗi không được chứa mật khẩu, hash, SID, URI hoặc dữ liệu khách khác. `REGISTRATION_UNAVAILABLE` dùng thông báo chung, không phân biệt trùng khách cũ hay trùng tài khoản cửa hàng.

## 9. Trang `/shop/` và wireframe

### 9.1. Danh sách trang

| Route frontend | Nội dung |
|---|---|
| `/shop/#/` | Trang chủ, tìm kiếm, danh mục, sản phẩm và chương trình có hiệu lực |
| `/shop/#/danh-muc/:maDM` | Hàng theo danh mục, giá, sort và phân trang |
| `/shop/#/tim-kiem?q=...` | Kết quả mã/tên sản phẩm; gợi ý phạm vi tìm, trạng thái rỗng |
| `/shop/#/san-pham/:maSP` | Tên, giá, tồn/hạn, chọn số lượng, thêm giỏ |
| `/shop/#/gio-hang` | Dòng hàng, sửa lượng/bỏ món, cảnh báo giá/tồn, tổng tạm tính |
| `/shop/#/thanh-toan` | Đăng nhập nếu cần, địa chỉ, coupon, 3 phương thức giả lập, báo giá và xác nhận |
| `/shop/#/dang-ky` | Thông tin khách mới, SĐT/mật khẩu; giải thích không liên kết khách cũ tự động |
| `/shop/#/dang-nhap` | SĐT/mật khẩu, lỗi chung, tiếp tục về thanh toán nếu vừa bị yêu cầu đăng nhập |
| `/shop/#/tai-khoan` | Hồ sơ/điểm đã lưu, liên kết lịch sử, đăng xuất; không sửa/quản trị tài khoản |
| `/shop/#/don-hang` | Lịch sử đơn online của chính khách, phân trang |
| `/shop/#/don-hang/:maHD` | Mã/ngày/trạng thái, snapshot dòng hàng, tiền giảm/thực thu, giao hàng, thanh toán giả lập |

Header cửa hàng khác sidebar quản trị; không thêm các chức năng quản trị chưa được duyệt. Mobile có menu thu gọn, bảng giỏ/đơn có cách trình bày cuộn hoặc thẻ dễ đọc. Có loading, lỗi có thể thử lại, rỗng có giải thích, nhãn field, focus bàn phím và thông báo khi thêm giỏ. Không tự tạo ảnh sản phẩm nếu DB không có ảnh; dùng khối hiển thị trung tính.

### 9.2. Wireframe trang chủ

```text
+------------------------------------------------------------------+
| SIÊU THỊ MINI | [Tìm theo mã hoặc tên sản phẩm...] [Tìm]             |
| [Danh mục v]                     [Giỏ (n)] [Đăng nhập / Tài khoản] |
+------------------------------------------------------------------+
| Mua sắm minh họa — Thanh toán giả lập, không thu tiền thật          |
| Khuyến mãi đang có: mã + điều kiện (không tự áp dụng)               |
+------------------+-----------------------------------------------+
| Danh mục         | Sản phẩm                    [Sắp xếp v]        |
| Khoảng giá       | +------------+ +------------+ +------------+   |
| [Áp dụng]        | | Tên SP     | | Tên SP     | | Tên SP     |   |
|                  | | Giá / tồn  | | Giá / tồn  | | Giá / tồn  |   |
|                  | | [Xem] [+]  | | [Xem] [+]  | | [Xem] [+]  |   |
|                  | +------------+ +------------+ +------------+   |
|                  | [Trước]   Trang x/y   [Sau]                   |
+------------------+-----------------------------------------------+
```

### 9.3. Wireframe checkout

```text
+------------------------------------------------------------------+
| Thanh toán — giả lập                           [Quay lại giỏ hàng] |
+-----------------------------------+------------------------------+
| Địa chỉ giao                      | Đơn hàng                     |
| Người nhận [________________]     | Tên / SL / Giá / Thành tiền |
| SĐT        [________________]     | ... snapshot báo giá         |
| Địa chỉ    [________________]     | Tiền hàng       ... ₫        |
|                                   | Giảm giá        ... ₫        |
| Mã KM [_________] [Xem báo giá]    | THỰC THU        ... ₫        |
| Thông báo điều kiện/lỗi coupon    | Điểm dự kiến    ...          |
|                                   | Hạn báo giá: ...             |
| Phương thức (giả lập):            |                              |
| ( ) Chuyển khoản                  | [Xác nhận đặt hàng giả lập] |
| ( ) Thẻ ngân hàng                 | Đang xử lý → theo dõi lại    |
| ( ) Ví điện tử                    | cùng yêu cầu, không gửi mới |
+-----------------------------------+------------------------------+
| Không thu tiền thật. Không nhập số thẻ/thông tin ngân hàng thật.   |
+------------------------------------------------------------------+
```

Sau thành công chuyển tới chi tiết đơn, không hiện nút thanh toán lại. Khi timeout giữ cùng key và tra tiến độ; nếu giá đổi yêu cầu xem lại trước khi xác nhận. Restart mất giỏ/báo giá chưa đặt phải thông báo, không giả vờ đã lưu chúng.

### 9.4. Wireframe tài khoản/lịch sử

```text
+------------------------------------------------------------------+
| Tài khoản: Họ tên / SĐT | Điểm hiện có | [Lịch sử] [Đăng xuất]      |
+------------------------------------------------------------------+
| Đơn online của tôi                                                |
| Mã đơn | Ngày | Trạng thái | Thanh toán giả lập | Thực thu | [Xem] |
| ...                                                              |
| [Trước]                    Trang x/y                       [Sau] |
+------------------------------------------------------------------+
| Chi tiết: địa chỉ snapshot, ChiTiet snapshot, giảm, thực thu, điểm |
+------------------------------------------------------------------+
```

## 10. Kế hoạch kiểm thử và cách ly database

### 10.1. Quy tắc bắt buộc

**Mọi test có ghi chỉ chạy trên `QLSieuThiMini_Test`. Tuyệt đối không ghi test vào `QLSieuThiMini`.** Bao gồm đăng ký, fixture, giữ/hoàn tồn, điểm, journal, thử crash, script thiết lập và retry; test thao tác giỏ/session cũng dùng tiến trình Test để tránh nhầm đích.

Dùng `node:test`, không thêm thư viện test. Unit test hàm thuần dùng đồng hồ/dữ liệu giả trong bộ nhớ. API integration ghi dùng MongoDB bản sao thật; không dùng dữ liệu giả để tuyên bố transaction/đua tồn hoạt động thật. UI cần mở trình duyệt thật mới có thể nghiệm thu bằng mắt.

### 10.2. Phục hồi bản sao từ backup

Áp dụng ánh xạ namespace theo `../09_backup_restore.md`, đổi **đích** thành `QLSieuThiMini_Test`. Lệnh dưới chỉ là hướng dẫn cho đợt sau, **chưa chạy ở S0**; `mongorestore` chạy trong PowerShell, không trong IntelliShell:

```powershell
mongorestore --uri="mongodb://localhost:27017" --nsInclude="QLSieuThiMini.*" --nsFrom="QLSieuThiMini.*" --nsTo="QLSieuThiMini_Test.*" "D:\MongoBackup"
```

URI trên là ví dụ local trong hướng dẫn, không được đưa thành hằng số kết nối trong code. Phải xác nhận backup tồn tại và DB Test đích chưa có dữ liệu; nếu Test đã có dữ liệu thì dừng báo người dùng chuẩn bị đích phù hợp, không tự drop/reset. Không dùng `--drop` và không restore đè namespace chính. Sau restore đối chiếu 9 collection/index/validator trước khi chạy setup Test bằng script đã được duyệt.

Tiến trình Test dùng `DB_NAME=QLSieuThiMini_Test`, cổng riêng dự kiến 3001 và file môi trường test không commit. Harness phải kiểm tra tên DB đích **đúng tuyệt đối**, cấu hình kết nối thực tế và tiến trình API đúng Test trước khi cho bất kỳ ghi nào; thiếu/sai/DB chính thì fail trước ghi. Không gọi các bài test ghi vào server quản trị local 3000 đang nối DB chính. Log tên DB đích an toàn, không URI hoặc mật khẩu.

Không thực hiện test ghi dù có rollback dự kiến trên DB chính. Không tạo fixture KM/tồn/điểm vào DB chính để làm bài test qua. Khi cần làm lại ca test, chỉ dùng fixture/tác vụ sở hữu trên Test có guard, không chạy lại `01–07` và không dọn DB chính.

### 10.3. Ma trận nghiệm thu

| Mã | Ca kiểm thử | Kết quả phải đạt |
|---|---|---|
| ST-01 | Hai tài khoản đặt cùng sản phẩm chỉ còn 1 đơn vị, request đến đồng thời | Đúng 1 đơn thành công, 1 lỗi tồn; tồn không âm, không có đơn/điểm rác |
| ST-02 | Bấm lặp/retry cùng key cùng payload; mất phản hồi sau insert/commit | Cùng một MaHD, trừ tồn và cộng điểm đúng một lần |
| ST-03 | Cùng key khác payload; key khác cùng báo giá | 409, không có đơn thứ hai |
| ST-04 | Tồn không đủ tại báo giá hoặc vừa hết trước giữ hàng | Từ chối, không có HoaDon/điểm; mọi giữ hàng trước đó được hoàn tác |
| ST-05 | Coupon hết hạn/chưa bắt đầu/không đủ điểm/đơn chưa đủ/khác MaDM | Lỗi đúng, không bỏ qua điều kiện; KM003 không áp dụng cho khách mới 0 điểm |
| ST-06 | Giới hạn thời gian KM: đúng NgayBatDau, đúng `23:59:59.000Z` của NgayKetThuc, +1 ms, `00:00:00.000Z` ngày kế | Hai đầu đúng thời điểm được tính; sau mốc kết thúc bị loại, không cộng ngày VN; hiển thị ngày kết thúc UTC đúng |
| ST-07 | Thiếu/sai CSRF/Origin trên từng POST/PATCH/DELETE, kể cả đăng ký/login/logout | 403 trước mọi ghi/thay session nghiệp vụ |
| ST-08 | Khách A truy cập mã đơn hoặc key của khách B; chưa đăng nhập truy cập lịch sử | 404 chung cho dữ liệu không sở hữu; 401 khi cần đăng nhập; không lộ thông tin B |
| ST-09 | Sai SĐT hoặc sai mật khẩu, vượt ngưỡng; đăng ký SDT khách cũ | Lỗi login chung, 429 khi giới hạn; không chiếm lịch sử/điểm khách cũ |
| ST-10 | Cùng mật khẩu hai tài khoản, salt khác; hash sai; mật khẩu biên | Không lưu rõ; salt/hash khác nhau, xác minh đúng; thông số/bộ nhớ KDF được kiểm chứng |
| ST-11 | Crash sau từng lần giữ hàng, trước/sau insert HoaDon, sau cộng điểm trước journal | Đọc marker/đơn để hoàn tác hoặc hoàn thiện đúng một lần; restart không nhận ghi khi phục hồi chưa phân định |
| ST-12 | Hoàn tác lặp; timeout làm kết quả update không rõ; restart rồi retry đơn cũ | Không tăng trả tồn/cộng điểm lần hai; trả đúng đơn cũ dù báo giá/session cũ đã mất (sau đăng nhập lại đúng khách) |
| ST-13 | Giá/tên thay đổi sau báo giá; client gửi giá/điểm/MaNV/MaKH giả | QUOTE_CHANGED hoặc 400; không chấp nhận giá hoặc danh tính client |
| ST-14 | Công thức tiền/giảm trần/phần MaDM; ThanhTien 9.999/10.000/19.999 | Tiền hàng và thực thu đúng; điểm tương ứng 0/1/1, không làm tròn lên |
| ST-15 | Tồn 0/1/19/20, hạn hôm qua/hôm nay/+30/+31/thiếu hạn | Nhãn đúng và không bán hàng đã hết hạn; đồng hồ giả cho unit test |
| ST-16 | q chứa `.*`, `(`; toán tử/object/field lạ, limit 101, body lớn | Không đổi nghĩa tìm kiếm, lỗi đầu vào đúng; không nhận filter MongoDB |
| ST-17 | Response/log đệ quy và dữ liệu lỗi; quyền sở hữu trên mọi route riêng tư | Không MatKhau/hash/salt/SID/URI, không dữ liệu khách khác, chỉ CSRF token bootstrap được phép |
| ST-18 | Session fixation/expiry/logout/restart; giỏ nhiều tab/revision | SID cũ vô hiệu, không mất giỏ mới do checkout cũ; giải thích mất giỏ bộ nhớ khi restart |
| ST-19 | Thiếu collection/index/NV hệ thống, index conflict, chạy setup lại | Fail closed, không DDL lúc startup; script thủ công idempotent, không ghi đè dữ liệu cũ |
| ST-20 | Hồi quy `/api`: GET và POST/PUT/DELETE; đọc hóa đơn cũ thiếu field mới | GET giữ hợp đồng cũ, method ghi 405; không trả secret/field marker; document cũ vẫn đọc được |
| ST-21 | Khả năng transaction nếu topology đã được đổi có phê duyệt | Kiểm tra/retry/commit trên Test; không thử ghi DB chính; nhánh standalone không giả lập transaction |
| ST-22 | Guard test bị cấu hình DB_NAME chính/sai/cổng nhầm; restore đích không trống | Dừng trước ghi; không tự chọn DB dự phòng, không drop hoặc dựng lại dữ liệu |

Hiện các ST đều **CHƯA KIỂM CHỨNG** cho cửa hàng; S0 chỉ kiểm tra đọc topology, coupon, payment và số lượng như mục 3, cùng bảo toàn file như mục 13. Không có kết quả API/UI cửa hàng để nghiệm thu ở S0.

## 11. Trình tự S1–S4 và điểm dừng

| Đợt | Phạm vi triển khai sau khi được duyệt | Điều kiện nghiệm thu/dừng |
|---|---|---|
| S1 — Nền và tài khoản | Viết script setup để người dùng review/chạy thủ công; tách module store, preflight chỉ đọc; session, CSRF, signup/login/logout, tài khoản; unit test bảo mật và integration trên Test | Dừng nếu chưa có bản sao Test/setup hợp lệ hoặc guard an toàn chưa đạt; báo topology và thiết lập cần người dùng chạy. Không tự chạy script hoặc làm checkout. Xong báo cáo, chờ duyệt S1 |
| S2 — Catalog và giỏ | Trang chủ/danh mục/tìm/chi tiết, DTO công khai, giỏ session/revision, liên tục giỏ sau login, trạng thái loading/lỗi/rỗng; chưa đặt đơn | Test lọc/regex/giá/giỏ/CSRF trên Test; không tuyên bố UI tốt nếu chưa mở trình duyệt. Xong báo cáo, chờ duyệt S2 |
| S3 — Đặt hàng | Báo giá, coupon/DieuKien, 3 phương thức giả lập, idempotency, trừ/hoàn tồn, HoaDon, điểm; nhánh transaction hoặc standalone theo topology đã xác nhận | Phải qua tranh món cuối, gửi trùng, crash/recovery và điểm đúng một lần trên Test. Không đạt thì khóa checkout, đề xuất xử lý/topology, không tự đổi mongod. Xong báo cáo, chờ duyệt S3 |
| S4 — Lịch sử và nghiệm thu | Trang tài khoản/lịch sử/chi tiết, kiểm soát sở hữu, UX hoàn chỉnh, tài liệu chạy/store test, hồi quy toàn bộ và đối chiếu checksum | Có kết quả thật từng test/API/UI đã chạy và phần chưa xác minh; không thêm chức năng ngoài phạm vi. Dừng chờ nghiệm thu cuối, không triển khai hosting hoặc chạy setup DB chính tự động |

Sau mỗi đợt phải có: danh sách file tạo/sửa, lệnh và kết quả thực tế, DB đích của từng test, ĐÃ HOÀN THÀNH / CHƯA HOÀN THÀNH / CHƯA KIỂM CHỨNG, lỗi/cách sửa/giới hạn, số đếm trước/sau theo môi trường và SHA-256 10 file gốc + SRS.md. Không tiến sang đợt tiếp theo khi chưa được người dùng duyệt. Nếu setup thủ công đang chờ người dùng thì nêu rõ phụ thuộc và dừng công việc liên quan, không tự thực hiện thay.

## 12. Quyết định thiết kế và giới hạn cần duyệt

- Chốt ba phương thức giả lập đúng tên có sẵn: Chuyển khoản, Thẻ ngân hàng, Ví điện tử; không dùng Tiền mặt/COD.
- Đăng ký chỉ cho SĐT mới, không nhận điểm/lịch sử của khách cũ khi chưa có bước xác minh sở hữu ngoài phạm vi.
- Giỏ/session/báo giá trong bộ nhớ, một process local; restart mất chúng nhưng đơn/idempotency vẫn lưu DB. Không cam kết trải nghiệm nhiều thiết bị hoặc chịu tải production.
- Standalone dùng journal + marker + cập nhật có điều kiện, có cửa sổ nhất quán cuối cùng. Tranh tồn/crash/recovery là điều kiện khóa nghiệm thu S3, không thể thay bằng unit test giả.
- Nhân viên online và đơn mới sẽ xuất hiện trong báo cáo quản trị do dùng chung DB; `/api` vẫn chỉ đọc, không được âm thầm lọc bỏ chúng hoặc đổi công thức doanh thu.
- KM003 còn hiệu lực nhưng yêu cầu 100 điểm; fixture demo giảm giá ngay chỉ thuộc Test và cần script được duyệt. Chưa thêm coupon hoặc nâng điểm cho bất kỳ ai.
- Sau duyệt S0 vẫn phải duyệt/chạy setup thủ công và chuẩn bị DB Test trước test ghi; chưa có quyền tự thay topology hoặc chạy migration trên DB chính.

## 13. Dấu vết kiểm tra S0 và SHA-256 bảo toàn file

Đã đọc `SRS.md`, schema trong `01`, dữ liệu KM trong `02`, hướng dẫn `09`, cấu hình/package của ứng dụng và các thông tin liên quan; không thực thi script dữ liệu. Đọc DB qua mongosh: `db.hello()`, `KhuyenMai.find` với projection, `HoaDon.aggregate` nhóm phương thức thanh toán, `countDocuments` cho 9 collection. Không đọc/trả mật khẩu nhân viên, không log MONGO_URI.

Đã lấy SHA-256 trước và sau khi tạo tài liệu bằng `Get-FileHash -Algorithm SHA256`: **11/11 file có checksum sau giống trước**. Các giá trị trong bảng là kết quả chung của hai lần đọc. Không sửa các file trong bảng.

| File | SHA-256 trước và sau S0 — khớp |
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

**Điểm dừng S0:** chờ người dùng duyệt `SRS_STORE.md` trước S1. Chưa viết code ứng dụng, script setup hay test ghi; chưa tự thực hiện bất kỳ thay đổi DB nào.
