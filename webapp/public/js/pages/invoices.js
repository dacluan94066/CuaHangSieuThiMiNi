import { get } from '../api.js';
import { el, loading, errorBox, table, badge, detailRow as row, detailSection as section, metricCards, renderReadList, setConnectionState } from '../ui.js';
import { money, number, dateTime, promotionEndDate } from '../format.js';

export const invoiceColumns = [
  { label: 'Mã hóa đơn', render: value => el('a', { href: `#/hoa-don/${encodeURIComponent(value.MaHD)}`, className: 'code-link', text: value.MaHD }) },
  { label: 'Ngày lập (giờ Việt Nam)', render: value => dateTime(value.NgayLap) },
  { label: 'Khách hàng', render: value => el('div', { className: 'table-product' }, [el('a', { href: `#/khach-hang/${encodeURIComponent(value.MaKH)}`, text: value.TenKH }), el('small', { text: value.MaKH })]) },
  { label: 'Nhân viên', render: value => `${value.MaNV} · ${value.TenNV}` },
  { label: 'Thanh toán', key: 'PhuongThucThanhToan' },
  { label: 'Tiền hàng', numeric: true, render: value => money(value.TongTien) },
  { label: 'Giảm giá', numeric: true, render: value => money(value.GiamGia) },
  { label: 'Thực thu', numeric: true, render: value => money(value.ThanhTien) }
];

export function renderInvoices(container, context) {
  return renderReadList(container, context, {
    kind: 'invoices', path: '/hoa-don', api: '/api/hoa-don', title: 'Hóa đơn', eyebrow: 'GIAO DỊCH BÁN HÀNG', description: 'Tra cứu hóa đơn và số tiền thực thu sau giảm giá.', placeholder: 'Ví dụ: HD009', tableTitle: 'Danh sách hóa đơn', emptyText: 'Không có hóa đơn phù hợp bộ lọc.',
    note: 'Ngày mới nhất trước. Thực thu là ThanhTien sau giảm giá.', columns: invoiceColumns,
    filters: [
      { key: 'from', label: 'Từ ngày', type: 'date' }, { key: 'to', label: 'Đến ngày', type: 'date' },
      { key: 'maKH', label: 'Mã khách hàng', placeholder: 'Ví dụ: KH001' }, { key: 'maNV', label: 'Mã nhân viên', placeholder: 'Ví dụ: NV002' },
      { key: 'thanhToan', label: 'Phương thức thanh toán', source: '/api/phuong-thuc-thanh-toan', valueField: 'phuongThuc', labelField: 'phuongThuc', allLabel: 'Tất cả phương thức' },
      { key: 'thucThuTren', label: 'Thực thu lớn hơn (VNĐ)', type: 'number', placeholder: 'Không giới hạn', help: 'Không bao gồm hóa đơn bằng ngưỡng.' }
    ]
  });
}

function promotionConditions(conditions = {}) {
  const descriptions = { DonHangToiThieu: ['Đơn tối thiểu', money], GiamToiDa: ['Giảm tối đa', money], DiemToiThieu: ['Điểm tối thiểu', number], MaDM: ['Mã danh mục', String], SoLuongToiThieu: ['Số lượng tối thiểu', number] };
  const items = Object.entries(conditions).map(([key, value]) => {
    const [title, formatter] = descriptions[key] || [key, value => typeof value === 'object' ? JSON.stringify(value) : String(value)];
    return el('li', { text: `${title}: ${formatter(value)}` });
  });
  return items.length ? el('ul', { className: 'condition-list' }, items) : 'Không có điều kiện bổ sung';
}

export function renderInvoiceDetail(container, { signal, code }) {
  const body = el('div', {}, [loading()]);
  container.replaceChildren(el('a', { className: 'back-link', href: '#/hoa-don', text: '← Danh sách hóa đơn' }), body);
  async function load() {
    body.replaceChildren(loading()); setConnectionState('loading');
    try {
      const { data, meta } = await get(`/api/hoa-don/${encodeURIComponent(code)}`, {}, { signal });
      if (signal.aborted) return;
      document.title = `${data.MaHD} · Hóa đơn · MiniMart`;
      const promotion = data.KhuyenMai;
      const promotionCard = promotion ? section('Khuyến mãi đã lưu trên hóa đơn', [
        row('Mã / tên chương trình', `${promotion.MaKM} · ${promotion.TenKM}`),
        row('Giá trị chương trình', promotion.LoaiKhuyenMai === 'Phần trăm' ? `${number(promotion.GiaTri)}%` : money(promotion.GiaTri)),
        row('Bắt đầu (giờ Việt Nam)', dateTime(promotion.NgayBatDau)), row('Ngày kết thúc (UTC)', promotionEndDate(promotion.NgayKetThuc)),
        row('Trạng thái tính theo hiện tại', badge(promotion.TrangThaiTinhToan)), row('Trạng thái gốc trong DB', badge(promotion.TrangThai)),
        row('Trạng thái tại ngày lập hóa đơn', badge(promotion.TrangThaiTaiNgayLap)), row('Điều kiện', promotionConditions(promotion.DieuKien))
      ]) : section('Khuyến mãi', [row('Thông tin', data.MaKM ? `Không tìm thấy thông tin liên kết cho ${data.MaKM}.` : 'Hóa đơn không sử dụng mã khuyến mãi.')]);
      body.replaceChildren(
        el('div', { className: 'page-heading detail-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: 'CHI TIẾT GIAO DỊCH' }), el('h1', { text: `Hóa đơn ${data.MaHD}` }), el('p', { text: `Lập lúc ${dateTime(data.NgayLap)} · ${data.PhuongThucThanhToan}` })])]),
        metricCards([['Tiền hàng trước giảm', money(data.TongTien)], ['Giảm giá', money(data.GiamGia)], ['Thực thu', money(data.ThanhTien)]]),
        el('div', { className: 'detail-grid' }, [section('Thông tin hóa đơn', [row('Khách hàng', el('a', { href: `#/khach-hang/${encodeURIComponent(data.MaKH)}`, text: `${data.MaKH} · ${data.TenKH}` })), row('Số điện thoại khách', data.KhachHang?.SDT), row('Nhân viên lập', `${data.MaNV} · ${data.TenNV}`), row('Chức vụ', data.NhanVien?.ChucVu), row('Phương thức thanh toán', data.PhuongThucThanhToan)]), promotionCard]),
        ...(promotion && !['Đang áp dụng', 'Chưa xác định'].includes(promotion.TrangThaiTaiNgayLap) ? [el('p', { className: 'notice missing-reference', role: 'status', text: 'Thời điểm lập hóa đơn nằm ngoài hiệu lực của chương trình khuyến mãi. Dữ liệu được giữ nguyên.' })] : []),
        el('section', { className: 'card transaction-lines' }, [el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: 'Chi tiết hàng hóa' })]), table([
          { label: 'Mã sản phẩm', key: 'MaSP' }, { label: 'Tên đã lưu', key: 'TenSP' }, { label: 'Số lượng', numeric: true, render: value => number(value.SoLuong) },
          { label: 'Đơn giá đã lưu', numeric: true, render: value => money(value.DonGia) }, { label: 'Thành tiền dòng', numeric: true, render: value => money(value.ThanhTien) }
        ], data.ChiTiet || [], `Chi tiết hóa đơn ${data.MaHD}`), el('p', { className: 'table-note line-note', text: 'Tên và đơn giá lấy từ chi tiết giao dịch đã lưu.' })]),
        ...(data.ThamChieuThieu?.length ? [el('p', { className: 'notice missing-reference', text: `Không tìm thấy thông tin liên kết: ${data.ThamChieuThieu.join(', ')}. Hóa đơn vẫn được hiển thị.` })] : []),
        el('p', { className: 'summary-note', text: `Đọc lúc ${dateTime(meta.updatedAt)}. Ngày kết thúc khuyến mãi hiển thị theo UTC; hiệu lực so sánh trực tiếp thời điểm BSON đã lưu.` })
      );
      setConnectionState('connected');
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted) { body.replaceChildren(errorBox(error.message, load)); setConnectionState(error.status === 404 ? 'connected' : 'failed'); } }
  }
  load();
}
