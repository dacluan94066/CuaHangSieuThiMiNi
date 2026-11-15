import { el, badge, renderReadList } from '../ui.js';
import { money, number, date, promotionEndDate } from '../format.js';

export function renderEmployees(container, context) {
  return renderReadList(container, context, {
    kind: 'employees', path: '/nhan-vien', api: '/api/nhan-vien', title: 'Nhân viên', eyebrow: 'ĐỘI NGŨ SIÊU THỊ', description: 'Số hóa đơn và thực thu theo nhân viên trong khoảng ngày đã chọn.',
    placeholder: 'Ví dụ: NV002, Mai hoặc NV_ONLINE', tableTitle: 'Danh sách nhân viên', emptyText: 'Không có nhân viên phù hợp.', note: 'Doanh thu cộng ThanhTien sau giảm giá. Nhân viên chưa có hóa đơn vẫn hiển thị bằng 0.',
    filters: [{ key: 'from', label: 'Từ ngày', type: 'date' }, { key: 'to', label: 'Đến hết ngày', type: 'date' }],
    columns: [{ label: 'Mã', key: 'MaNV' }, { label: 'Họ tên', key: 'HoTen' },
      { label: 'Chức vụ', render: row => row.LaNhanVienHeThong ? badge('Nhân viên hệ thống') : row.ChucVu },
      { label: 'Trạng thái', key: 'TrangThai' }, { label: 'Số hóa đơn', numeric: true, render: row => number(row.SoHoaDon) }, { label: 'Thực thu', numeric: true, render: row => money(row.DoanhThu) }]
  });
}
export function promotionConditions(value = {}, hasUnknown = false) {
  const conditions = [
    ['DonHangToiThieu', 'Đơn tối thiểu', money], ['DiemToiThieu', 'Điểm tối thiểu', number], ['GiamToiDa', 'Giảm tối đa', money],
    ['MaDM', 'Mã danh mục', String], ['SoLuongToiThieu', 'Số lượng tối thiểu', number]
  ].filter(([key]) => value[key] !== undefined);
  const lines = conditions.map(([key, label, format]) => el('li', { text: `${label}: ${format(value[key])}` }));
  if (hasUnknown) lines.push(el('li', { text: 'Có điều kiện ngoài danh sách hỗ trợ, chưa diễn giải đầy đủ.' }));
  return lines.length ? el('ul', { className: 'condition-list' }, lines) : 'Không có điều kiện bổ sung';
}
export function renderPromotions(container, context) {
  return renderReadList(container, context, {
    kind: 'promotions', path: '/khuyen-mai', api: '/api/khuyen-mai', title: 'Khuyến mãi', eyebrow: 'CHƯƠNG TRÌNH ƯU ĐÃI', description: 'Đối chiếu trạng thái hiện tại với trạng thái gốc trong database.',
    placeholder: 'Ví dụ: KM003 hoặc thành viên', tableTitle: 'Danh sách khuyến mãi', emptyText: 'Không có khuyến mãi phù hợp.',
    note: 'So sánh trực tiếp NgayBatDau ≤ hiện tại ≤ NgayKetThuc; không cộng ngày. Riêng ngày kết thúc hiển thị theo UTC để giữ ngày đã lưu.',
    filters: [{ key: 'trangThai', label: 'Trạng thái tính toán', options: [['', 'Tất cả'], ['sap-dien-ra', 'Sắp diễn ra'], ['dang-ap-dung', 'Đang áp dụng'], ['da-ket-thuc', 'Đã kết thúc']] }],
    columns: [{ label: 'Mã', key: 'MaKM' }, { label: 'Chương trình', key: 'TenKM' }, { label: 'Loại', key: 'LoaiKhuyenMai' },
      { label: 'Giá trị', render: row => row.LoaiKhuyenMai === 'Phần trăm' ? `${number(row.GiaTri)}%` : money(row.GiaTri) },
      { label: 'Bắt đầu (VN)', render: row => date(row.NgayBatDau) }, { label: 'Kết thúc (UTC)', render: row => promotionEndDate(row.NgayKetThuc) },
      { label: 'Điều kiện', render: row => promotionConditions(row.DieuKien, row.CoDieuKienChuaHoTro) }, { label: 'Hiện tại', render: row => badge(row.TrangThaiTinhToan) }, { label: 'Trạng thái gốc', key: 'TrangThai' }]
  });
}
