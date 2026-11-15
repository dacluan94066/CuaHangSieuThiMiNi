import { get } from '../api.js';
import { el, loading, empty, errorBox, table, pager, updateQueryHash, detailRow as row, detailSection as section, metricCards, renderReadList, setConnectionState } from '../ui.js';
import { money, number, date, dateTime } from '../format.js';
import { invoiceColumns } from './invoices.js';

export function renderCustomers(container, context) {
  return renderReadList(container, context, {
    kind: 'customers', path: '/khach-hang', api: '/api/khach-hang', title: 'Khách hàng', eyebrow: 'THÀNH VIÊN SIÊU THỊ', description: 'Tra cứu hồ sơ, điểm tích lũy và lịch sử mua hàng.', placeholder: 'Ví dụ: KH001, Minh Anh hoặc 0901000001', tableTitle: 'Danh sách khách hàng', emptyText: 'Không có khách hàng phù hợp từ khóa.', note: 'Điểm tích lũy hiển thị đúng giá trị đã lưu trong database.',
    columns: [
      { label: 'Mã khách', render: value => el('a', { href: `#/khach-hang/${encodeURIComponent(value.MaKH)}`, className: 'code-link', text: value.MaKH }) },
      { label: 'Họ tên', render: value => el('a', { href: `#/khach-hang/${encodeURIComponent(value.MaKH)}`, className: 'product-name', text: value.HoTen }) },
      { label: 'Số điện thoại', key: 'SDT' }, { label: 'Email', key: 'Email' }, { label: 'Địa chỉ', key: 'DiaChi' },
      { label: 'Điểm đã lưu', numeric: true, render: value => number(value.DiemTichLuy) }, { label: 'Ngày đăng ký', render: value => date(value.NgayDangKy) }
    ]
  });
}

export function renderCustomerDetail(container, { signal, code, params }) {
  const body = el('div', {}, [loading()]);
  let historyController, historyRequest = 0;
  let historyQuery = { page: params.get('page') || 1, limit: params.get('limit') || 10 };
  container.replaceChildren(el('a', { className: 'back-link', href: '#/khach-hang', text: '← Danh sách khách hàng' }), body);
  async function load() {
    body.replaceChildren(loading()); setConnectionState('loading');
    try {
      const { data, meta } = await get(`/api/khach-hang/${encodeURIComponent(code)}`, {}, { signal });
      if (signal.aborted) return;
      document.title = `${data.MaKH} · Khách hàng · MiniMart`;
      const history = el('div', { className: 'list-content', 'aria-live': 'polite' });
      body.replaceChildren(
        el('div', { className: 'page-heading detail-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: data.MaKH }), el('h1', { text: data.HoTen }), el('p', { text: 'Hồ sơ và thống kê toàn bộ lịch sử mua hàng.' })])]),
        metricCards([['Tổng chi tiêu thực thu', money(data.ThongKe.TongChiTieu)], ['Số lần mua', number(data.ThongKe.SoLanMua)], ['Điểm tích lũy đã lưu', number(data.DiemTichLuy)]]),
        section('Thông tin thành viên', [row('Mã khách hàng', data.MaKH), row('Họ tên', data.HoTen), row('Số điện thoại', data.SDT), row('Email', data.Email), row('Địa chỉ', data.DiaChi), row('Ngày đăng ký', date(data.NgayDangKy))]),
        el('section', { className: 'card list-card transaction-lines', 'aria-label': 'Lịch sử mua hàng' }, [history]),
        el('p', { className: 'summary-note', text: `Đọc lúc ${dateTime(meta.updatedAt)}. Tổng chi tiêu cộng ThanhTien sau giảm giá; điểm tích lũy không được tính lại từ hóa đơn.` })
      );
      setConnectionState('connected');
      async function loadHistory() {
        historyController?.abort(); historyController = new AbortController(); const id = ++historyRequest;
        history.replaceChildren(loading());
        try {
          const response = await get('/api/hoa-don', { ...historyQuery, maKH: data.MaKH }, { signal: historyController.signal });
          if (signal.aborted || id !== historyRequest) return;
          history.replaceChildren(el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: 'Lịch sử mua hàng' }), el('span', { className: 'muted', text: `${response.pagination.total} hóa đơn` })]), response.data.length ? table(invoiceColumns.filter(column => column.label !== 'Khách hàng'), response.data, `Lịch sử mua của ${data.MaKH}`) : empty('Khách hàng chưa có hóa đơn trên trang này.'), pager(response.pagination, patch => { historyQuery = { ...historyQuery, ...patch }; updateQueryHash(`/khach-hang/${encodeURIComponent(data.MaKH)}`, historyQuery); loadHistory(); }));
        } catch (error) { if (error.name !== 'AbortError' && !signal.aborted && id === historyRequest) history.replaceChildren(errorBox(error.message, loadHistory)); }
      }
      loadHistory();
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted) { body.replaceChildren(errorBox(error.message, load)); setConnectionState(error.status === 404 ? 'connected' : 'failed'); } }
  }
  signal.addEventListener('abort', () => historyController?.abort(), { once: true });
  load(); return () => historyController?.abort();
}
