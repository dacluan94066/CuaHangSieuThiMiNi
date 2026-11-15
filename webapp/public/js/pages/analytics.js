import { get } from '../api.js';
import { el, table, pager, loading, empty, errorBox, metricCards, updateQueryHash, setConnectionState } from '../ui.js';
import { money, number, month, date, dateTime, period, promotionEndDate } from '../format.js';
import { createChart } from '../charts.js';

const numeric = (label, key, format = number) => ({ label, numeric: true, render: row => format(row[key]) });
const dateFields = [{ key: 'from', label: 'Từ ngày', type: 'date' }, { key: 'to', label: 'Đến hết ngày', type: 'date' }];
const reportSpecs = {
  'doanh-thu': { title: 'Doanh thu', api: '/api/bao-cao/doanh-thu', fields: [...dateFields, { key: 'nhom', label: 'Nhóm theo', options: [['thang', 'Tháng'], ['ngay', 'Ngày']] }],
    columns: [{ label: 'Mốc thời gian', render: row => row.Moc.length === 7 ? month(row.Moc) : date(`${row.Moc}T12:00:00+07:00`) }, numeric('Thực thu', 'DoanhThu', money), numeric('Số hóa đơn', 'SoHoaDon'), numeric('Trung bình', 'TrungBinhHoaDon', money)], label: row => row.Moc, value: row => row.DoanhThu, currency: true },
  'san-pham': { title: 'Sản phẩm bán chạy', api: '/api/bao-cao/san-pham', fields: [...dateFields, { key: 'maDM', label: 'Mã danh mục', type: 'text' }, { key: 'sapXep', label: 'Xếp hạng theo', options: [['so-luong', 'Số lượng'], ['tien-hang', 'Tiền hàng trước giảm']] }],
    columns: [{ label: 'Mã', key: 'MaSP' }, { label: 'Tên đã lưu trên hóa đơn', key: 'TenSP' }, numeric('Số lượng bán', 'SoLuongBan'), numeric('Tiền hàng trước giảm', 'TienHang', money)], label: row => row.MaSP },
  'khach-hang': { title: 'Khách chi tiêu nhiều', api: '/api/bao-cao/khach-hang', fields: [...dateFields, { key: 'sapXep', label: 'Xếp hạng theo', options: [['chi-tieu', 'Chi tiêu thực thu'], ['so-lan-mua', 'Số lần mua']] }],
    columns: [{ label: 'Mã khách', key: 'MaKH' }, { label: 'Họ tên', key: 'HoTen' }, numeric('Tổng chi tiêu', 'TongChiTieu', money), numeric('Số lần mua', 'SoLanMua')], label: row => row.MaKH }
};

// Scoped component with abort/request IDs to prevent stale filter/chart results.
function renderPanel(container, { signal, params }, spec) {
  let query = Object.fromEntries(params); delete query.tab;
  let request, id = 0, chart;
  const inputs = {};
  const content = el('div', { className: 'list-content', 'aria-live': 'polite' });
  const note = el('p', { className: 'summary-note' });
  const formError = el('p', { className: 'form-error', role: 'alert', hidden: true });
  const form = el('form', { className: 'filters transaction-filters' });
  for (const field of spec.fields) {
    const input = field.options ? el('select', {}, field.options.map(([value, text]) => el('option', { value, text }))) : el('input', { type: field.type, maxLength: 50 });
    input.id = `analytics-${field.key}`; input.value = query[field.key] || field.options?.[0][0] || ''; inputs[field.key] = input;
    form.append(el('div', { className: 'field' }, [el('label', { htmlFor: input.id, text: field.label }), input]));
  }
  form.append(el('div', { className: 'filter-actions' }, [el('button', { type: 'submit', className: 'button primary', text: 'Áp dụng' }), el('button', { type: 'button', className: 'button', text: 'Đặt lại', onClick: () => {
    for (const [key, input] of Object.entries(inputs)) input.value = spec.fields.find(field => field.key === key).options?.[0][0] || '';
    query = {}; formError.hidden = true; change({});
  } })]), formError);
  container.replaceChildren(el('div', { className: 'page-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: spec.eyebrow }), el('h1', { text: spec.title }), el('p', { text: spec.description })])]), ...(spec.tabs ? [spec.tabs] : []), form, content, note);
  function change(patch) { query = { ...query, ...patch }; updateQueryHash(spec.path, { ...query, ...(spec.tab ? { tab: spec.tab } : {}) }); load(); }
  form.addEventListener('submit', event => {
    event.preventDefault(); formError.hidden = true;
    if (inputs.from?.value && inputs.to?.value && inputs.from.value > inputs.to.value) { formError.textContent = 'Từ ngày phải nhỏ hơn hoặc bằng đến ngày.'; formError.hidden = false; inputs.to.focus(); return; }
    change({ page: 1, ...Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value])) });
  });
  async function load() {
    request?.abort(); request = new AbortController(); const current = ++id; chart?.destroy(); chart = undefined;
    content.replaceChildren(loading()); content.setAttribute('aria-busy', 'true'); setConnectionState('loading');
    try {
      const [response, overview] = await Promise.all([get(spec.api, query, { signal: request.signal }), spec.tab === 'doanh-thu' ? get('/api/bao-cao/tong-quan', { from: query.from, to: query.to }, { signal: request.signal }) : null]);
      if (signal.aborted || current !== id) return;
      const blocks = [];
      if (overview) blocks.push(metricCards([['Thực thu toàn kỳ', money(overview.data.DoanhThu)], ['Tiền hàng trước giảm', money(overview.data.TienHang)], ['Giảm giá', money(overview.data.GiamGia)], ['Số hóa đơn', number(overview.data.SoHoaDon)], ['Trung bình hóa đơn', money(overview.data.TrungBinhHoaDon)], ['Thấp nhất', money(overview.data.ThapNhat)], ['Cao nhất', money(overview.data.CaoNhat)]]));
      if (response.summary) blocks.push(metricCards([['Lệch tổng tiền', number(response.summary['tong-tien'])], ['KM ngoài hiệu lực', number(response.summary['khuyen-mai'])], ['Tham chiếu thiếu', number(response.summary['tham-chieu'])]]));
      const canvas = spec.chart && response.data.length ? el('canvas', { role: 'img', 'aria-label': `${spec.title}, dữ liệu trang hiện tại; bảng đầy đủ ngay bên dưới` }) : null;
      const chartNote = el('p', { className: 'summary-note', text: 'Biểu đồ thể hiện trang hiện tại. Dùng phân trang để xem đủ dữ liệu; bảng số liệu luôn có bên dưới.' });
      if (canvas) blocks.push(el('section', { className: 'card report-chart' }, [el('h2', { className: 'card-title', text: 'Biểu đồ · Trang hiện tại' }), el('div', { className: 'report-canvas' }, [canvas]), chartNote]));
      blocks.push(el('section', { className: 'card list-card' }, [el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: spec.title }), el('span', { text: `${number(response.pagination.total)} ${response.summary ? 'lỗi' : 'bản ghi'}` })]), response.data.length ? table(spec.columns, response.data, spec.title) : empty(spec.emptyText || 'Không có dữ liệu phù hợp bộ lọc.'), pager(response.pagination, change)]));
      content.replaceChildren(...blocks); setConnectionState('connected');
      note.textContent = `Đọc lúc ${dateTime(response.meta.updatedAt)} · ${spec.note} ${spec.tab ? `· ${period(response.meta.range)}` : ''}`;
      if (canvas) {
        try {
          const currency = spec.tab === 'san-pham' ? query.sapXep === 'tien-hang' : spec.tab === 'khach-hang' ? query.sapXep !== 'so-lan-mua' : true;
          const value = spec.tab === 'san-pham' ? row => currency ? row.TienHang : row.SoLuongBan : spec.tab === 'khach-hang' ? row => currency ? row.TongChiTieu : row.SoLanMua : spec.value;
          const next = await createChart(canvas, 'bar', response.data.map(spec.label), response.data.map(value), { currency });
          if (signal.aborted || current !== id) next?.destroy(); else chart = next;
        } catch { if (!signal.aborted && current === id) chartNote.textContent = 'Chưa tải được Chart.js từ CDN. Bảng số liệu bên dưới vẫn dùng được.'; }
      }
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted && current === id) { content.replaceChildren(errorBox(error.message, load)); setConnectionState('failed'); } }
    finally { if (current === id) content.setAttribute('aria-busy', 'false'); }
  }
  const stop = () => { request?.abort(); chart?.destroy(); }; signal.addEventListener('abort', stop, { once: true }); load(); return stop;
}
export function renderReports(container, context) {
  const tab = context.params.get('tab') || 'doanh-thu'; const spec = reportSpecs[tab];
  if (!spec) { container.replaceChildren(errorBox('Tab báo cáo không hợp lệ.'), el('a', { href: '#/bao-cao', text: 'Về báo cáo doanh thu' })); return; }
  const tabs = el('nav', { className: 'report-tabs', 'aria-label': 'Nhóm báo cáo' }, Object.entries(reportSpecs).map(([key, value]) => el('a', { className: `button ${key === tab ? 'primary' : ''}`, href: `#/bao-cao?tab=${key}`, 'aria-current': key === tab ? 'page' : undefined, text: value.title })));
  return renderPanel(container, context, { ...spec, tabs, chart: true, path: '/bao-cao', tab, eyebrow: 'PHÂN TÍCH KINH DOANH',
    description: 'Dữ liệu toàn bộ hóa đơn đã lưu, gồm đơn online. Khoảng ngày tính trọn ngày Việt Nam.',
    note: tab === 'san-pham' ? 'Tiền hàng = số lượng × đơn giá snapshot, trước giảm giá; lọc danh mục theo sản phẩm hiện tại.' : 'Thực thu cộng ThanhTien sau giảm giá; timezone Asia/Ho_Chi_Minh.' });
}
export function renderIntegrity(container, context) {
  return renderPanel(container, context, { path: '/kiem-tra-du-lieu', api: '/api/kiem-tra-du-lieu', title: 'Kiểm tra dữ liệu', eyebrow: 'ĐỐI CHIẾU NHẤT QUÁN',
    description: 'Kiểm tra tổng tiền, hiệu lực khuyến mãi và 11 quan hệ tham chiếu. Chỉ liệt kê lỗi, không sửa dữ liệu.',
    emptyText: 'Không phát hiện lỗi trong nhóm và collection đang chọn.', note: 'Tổng là số lỗi; một document có thể có nhiều lỗi. MaKM vắng mặt là hợp lệ; mã KM không tồn tại chỉ tính lỗi tham chiếu. Ngày kết thúc KM hiển thị UTC.',
    fields: [{ key: 'loai', label: 'Loại lỗi', options: [['tat-ca', 'Tất cả'], ['tong-tien', 'Lệch tổng tiền'], ['khuyen-mai', 'KM ngoài hiệu lực'], ['tham-chieu', 'Tham chiếu thiếu']] },
      { key: 'collection', label: 'Collection nguồn', options: [['', 'Tất cả'], ...['SanPham', 'HoaDon', 'PhieuNhap', 'TaiKhoan', 'KhuyenMai'].map(name => [name, name])] }],
    columns: [{ label: 'Loại', key: 'Loai' }, { label: 'Collection', key: 'Collection' }, { label: 'Mã document', key: 'MaDocument' }, { label: 'Field', render: row => `${row.Field}${row.DongChiTiet !== undefined ? ` [dòng ${row.DongChiTiet + 1}]` : ''}` },
      { label: 'Giá trị / Chi tiết', render: row => row.Loai === 'tong-tien' ? `Khai báo: ${money(row.TongKhaiBao)}; chi tiết: ${money(row.TongChiTiet)}; lệch: ${money(row.ChenhLech)}` : row.Loai === 'khuyen-mai' ? `${row.GiaTri}; lập ${dateTime(row.NgayLap)}; bắt đầu ${dateTime(row.NgayBatDau)}; kết thúc ${promotionEndDate(row.NgayKetThuc)} (UTC)` : `${row.GiaTri ?? 'Thiếu mã'} → ${row.CollectionDich}` }, { label: 'Lý do', key: 'LyDo' }]
  });
}
