# Đề xuất bổ sung đăng nhập và phân quyền quản trị

Trạng thái: bản đề xuất, chờ chốt phạm vi quyền xem hoặc nghiệp vụ ghi. Chưa thay đổi hành vi ứng dụng hay DB. Không sửa SRS.md/SRS_STORE.md/01–09/README.md.

## Căn cứ

Phạm vi ban đầu loại đăng nhập/phân quyền quản trị (SRS.md mục ngoài phạm vi). Hiện `/api` chỉ đọc nhưng chưa bắt buộc đăng nhập. Cửa hàng đã có xác thực khách riêng, không dùng tài khoản nhân viên.

Đã chỉ đọc TaiKhoan trên DB chính bằng projection loại mật khẩu, xác nhận bốn VaiTro: Quản trị (1), Thu ngân (2), Kho (1), Bán hàng (2). Tài khoản `admin` mang role Quản trị. Không đọc/in mật khẩu qua truy vấn khảo sát này, không ghi DB.

## Bảng quyền xem đề xuất

| Tài nguyên hiện có | Quản trị | Thu ngân | Kho | Bán hàng |
|---|---|---|---|---|
| Dashboard doanh thu toàn cửa hàng | Có | Không | Không | Không |
| Sản phẩm/danh mục | Có | Có | Có | Có |
| Giá nhập và thông tin NCC trên sản phẩm | Có | Không | Có | Không |
| Nhà cung cấp | Có | Không | Có | Không |
| Cảnh báo kho | Có | Không | Có | Không |
| Hóa đơn/chi tiết | Có | Có | Không | Không |
| Khách hàng/chi tiết/lịch sử mua | Có | Có | Không | Không |
| Phương thức thanh toán | Có | Có | Không | Không |
| Phiếu nhập/chi tiết | Có | Không | Có | Không |

Đây là quyền đề xuất để người dùng duyệt, không khẳng định DB đã chứa chính sách này. Role Quản trị xem toàn bộ phần đã triển khai; không mặc nhiên có CRUD hoặc các trang chưa xây dựng. Phải lọc field nhạy cảm ở server cho cả danh sách và chi tiết, không chỉ ẩn menu/cột ở frontend. Endpoint mới về sau mặc định bị chặn nếu chưa khai báo quyền.

Nếu yêu cầu chỉ đăng nhập/phân quyền xem: mọi `/api` vẫn GET; POST/PUT/DELETE vẫn 405. Tạo hóa đơn/phiếu nhập, sửa tồn, hủy đơn, sửa tài khoản không thuộc đợt này. Nếu cần nghiệp vụ ghi cho nhân viên, phải đặc tả riêng quyền thao tác, nhất quán và test trước khi triển khai.

## Thiết kế xác thực

- Trang đăng nhập nhân viên riêng, dùng TenDangNhap; cửa hàng tiếp tục đăng nhập bằng SĐT, không chia sẻ session/quyền.
- Đề xuất namespace `/admin-auth` cho GET session, POST đăng nhập, POST đăng xuất; không đưa POST vào `/api`.
- Cookie nhân viên httpOnly, SameSite, SID ngẫu nhiên chỉ trong cookie, rotate khi đăng nhập; CSRF + Origin cho đăng nhập/đăng xuất, rate limit và lỗi đăng nhập chung. Không lưu mật khẩu/token đăng nhập trong localStorage.
- Role lấy từ bản ghi nhân viên trên server, không nhận role từ form/body/client. Kiểm tra tài khoản Hoạt động và nhân viên Đang làm; thiếu tham chiếu hoặc role lạ thì từ chối. Khi trạng thái/quyền thay đổi phải kiểm tra lại ở request được bảo vệ, không tin bản role cũ vô thời hạn.
- Anonymous gọi dữ liệu quản trị: 401; đăng nhập nhưng thiếu quyền: 403. UI chuyển về đăng nhập/chọn trang được phép, gọi URL API trực tiếp cũng bị chặn. Sai method `/api` vẫn 405 trước xác thực.
- Tái sử dụng scrypt có salt và giới hạn tài nguyên đã có; session nhân viên tách cookie và bộ nhớ khỏi cửa hàng. Không dùng mật khẩu rõ của dữ liệu mẫu làm cơ chế đăng nhập mới.

## Dữ liệu mật khẩu và giới hạn cần giữ

SRS gốc ghi TaiKhoan.MatKhau mẫu dạng rõ. Đề xuất bản ghi thông tin xác thực nhân viên băm trong collection bổ sung, gắn TenDangNhap/MaNV với TaiKhoan; VaiTro/TrangThai vẫn đọc từ tài khoản hiện có. Người dùng đặt mật khẩu demo đủ dài riêng; không công bố mật khẩu sẵn có, không đưa MatKhau/hash/salt ra API/log. Giữ nguyên dữ liệu gốc không có nghĩa là mật khẩu mẫu đã được làm sạch: bản ghi rõ cũ vẫn tồn tại và không được dùng để đăng nhập mới.

Setup hash/index/validator cần script idempotent có guard, người dùng review trước; không insert collection/index ngầm ở startup. Đợt này chưa có phê duyệt thực hiện setup nhân viên trên DB nào. Mọi test ghi chỉ Test; DB chính không được ghi. Nếu chưa có setup bảo mật, đăng nhập phải báo chưa sẵn sàng thay vì quay về so sánh mật khẩu rõ. Việc mở trên DB chính vẫn cần phê duyệt riêng.

## Thứ tự thực hiện sau khi chốt

1. Chốt bảng quyền và phương án setup tài khoản băm; không sửa các SRS đã bảo vệ.
2. Xây middleware xác thực/ủy quyền server, DTO theo role và trang đăng nhập/menu nhân viên. Không thay flow khách hàng.
3. Review script Test trước khi ghi; thử đủ bốn role, trạng thái bị khóa/nghỉ, URL trực tiếp, field giá nhập/NCC, giả role, CSRF/rate limit, session isolation và hồi quy cửa hàng.
4. Báo số liệu hai DB/checksum; nghiệm thu bằng trình duyệt, không tự mở ghi/setup DB chính.

Bản đề xuất này chưa triển khai đăng nhập; trang quản trị hiện vẫn như trước cho đến khi có bản thay đổi đã kiểm thử.
