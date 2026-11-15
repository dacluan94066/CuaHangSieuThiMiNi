import { get } from '../api.js';
import { el, loading, errorBox, table, detailRow as row, detailSection as section, metricCards, renderReadList, setConnectionState } from '../ui.js';
import { money, number, dateTime } from '../format.js';

export function renderPurchases(container, context) {
  return renderReadList(container, context, {
    kind: 'purchases', path: '/phieu-nhap', api: '/api/phieu-nhap', title: 'Phiếu nhập', eyebrow: 'GIAO DỊCH NHẬP HÀNG', description: 'Tra cứu phiếu nhập, nhà cung cấp và nhân viên lập.', placeholder: 'Ví dụ: PN001', tableTitle: 'Danh sách phiếu nhập', emptyText: 'Không có phiếu nhập phù hợp bộ lọc.', note: 'Ngày nhập mới nhất trước. Chỉ xem dữ liệu, không cập nhật tồn kho.',
    filters: [
      { key: 'from', label: 'Từ ngày', type: 'date' }, { key: 'to', label: 'Đến ngày', type: 'date' },
      { key: 'maNCC', label: 'Nhà cung cấp', source: '/api/nha-cung-cap', valueField: 'MaNCC', labelField: 'TenNCC', allLabel: 'Tất cả nhà cung cấp' },
      { key: 'maNV', label: 'Mã nhân viên', placeholder: 'Ví dụ: NV004' }
    ],
    columns: [
      { label: 'Mã phiếu nhập', render: value => el('a', { href: `#/phieu-nhap/${encodeURIComponent(value.MaPN)}`, className: 'code-link', text: value.MaPN }) },
      { label: 'Ngày nhập (giờ Việt Nam)', render: value => dateTime(value.NgayNhap) },
      { label: 'Nhà cung cấp', render: value => el('div', { className: 'table-product' }, [el('strong', { text: value.TenNCC }), el('small', { text: value.MaNCC })]) },
      { label: 'Nhân viên lập', render: value => `${value.MaNV} · ${value.TenNV}` }, { label: 'Tổng tiền nhập', numeric: true, render: value => money(value.TongTien) }
    ]
  });
}

export function renderPurchaseDetail(container, { signal, code }) {
  const body = el('div', {}, [loading()]);
  container.replaceChildren(el('a', { className: 'back-link', href: '#/phieu-nhap', text: '← Danh sách phiếu nhập' }), body);
  async function load() {
    body.replaceChildren(loading()); setConnectionState('loading');
    try {
      const { data, meta } = await get(`/api/phieu-nhap/${encodeURIComponent(code)}`, {}, { signal });
      if (signal.aborted) return;
      document.title = `${data.MaPN} · Phiếu nhập · MiniMart`;
      body.replaceChildren(
        el('div', { className: 'page-heading detail-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: 'CHI TIẾT NHẬP HÀNG' }), el('h1', { text: `Phiếu nhập ${data.MaPN}` }), el('p', { text: `Ngày nhập ${dateTime(data.NgayNhap)}` })])]),
        metricCards([['Tổng tiền nhập', money(data.TongTien)], ['Số dòng hàng', number(data.ChiTiet?.length || 0)]]),
        el('div', { className: 'detail-grid' }, [section('Nhà cung cấp', [row('Mã / tên NCC', `${data.MaNCC} · ${data.TenNCC}`), row('Số điện thoại', data.NhaCungCap?.SDT), row('Email', data.NhaCungCap?.Email), row('Địa chỉ', data.NhaCungCap?.DiaChi)]), section('Thông tin lập phiếu', [row('Mã phiếu nhập', data.MaPN), row('Nhân viên', `${data.MaNV} · ${data.TenNV}`), row('Chức vụ', data.NhanVien?.ChucVu), row('Ngày nhập', dateTime(data.NgayNhap))])]),
        el('section', { className: 'card transaction-lines' }, [el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: 'Chi tiết hàng nhập' })]), table([
          { label: 'Mã sản phẩm', key: 'MaSP' }, { label: 'Tên đã lưu', key: 'TenSP' }, { label: 'Số lượng', numeric: true, render: value => number(value.SoLuong) },
          { label: 'Đơn giá nhập đã lưu', numeric: true, render: value => money(value.DonGiaNhap) }, { label: 'Thành tiền dòng', numeric: true, render: value => money(value.ThanhTien) }
        ], data.ChiTiet || [], `Chi tiết phiếu nhập ${data.MaPN}`), el('p', { className: 'table-note line-note', text: 'Tên và giá nhập lấy từ chi tiết giao dịch đã lưu. Không cập nhật tồn kho.' })]),
        ...(data.ThamChieuThieu?.length ? [el('p', { className: 'notice missing-reference', text: `Không tìm thấy thông tin liên kết: ${data.ThamChieuThieu.join(', ')}. Phiếu nhập vẫn được hiển thị.` })] : []),
        el('p', { className: 'summary-note', text: `Dữ liệu đọc lúc ${dateTime(meta.updatedAt)}.` })
      );
      setConnectionState('connected');
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted) { body.replaceChildren(errorBox(error.message, load)); setConnectionState(error.status === 404 ? 'connected' : 'failed'); } }
  }
  load();
}
