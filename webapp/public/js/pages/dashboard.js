import { get } from '../api.js';
import { el, icon, loading, empty, errorBox, table, dataDetails } from '../ui.js';
import { money, number, month, dateTime, period } from '../format.js';
import { createChart } from '../charts.js';

export function renderDashboard(container, { signal, params }) {
  const charts = new Map();
  const range = { from: params.get('from') || '', to: params.get('to') || '' };
  let latest;
  let monthlyCurrent = { ...range };
  const monthlyHistory = [];
  const connection = document.getElementById('connection-status');
  const updated = el('span', { className: 'updated-time', text: 'Đang tải dữ liệu từ MongoDB…' });
  const title = el('div', {}, [el('span', { className: 'welcome-label', text: 'TỔNG QUAN KINH DOANH' }), el('h1', { text: 'Một góc nhìn, toàn siêu thị.' }), el('p', {}, [updated])]);
  const refresh = el('button', { className: 'button', type: 'button', 'aria-label': 'Làm mới dữ liệu', onClick: () => window.dispatchEvent(new HashChangeEvent('hashchange')) }, [icon('refresh'), 'Làm mới']);
  const heading = el('div', { className: 'page-heading' }, [title, refresh]);
  const formError = el('p', { className: 'form-error', role: 'alert', hidden: true });
  const mode = el('select', { id: 'period-mode', name: 'period' }, [el('option', { value: 'all', text: 'Toàn bộ thời gian' }), el('option', { value: 'custom', text: 'Khoảng ngày tùy chọn' })]);
  mode.value = range.from || range.to ? 'custom' : 'all';
  const from = el('input', { id: 'date-from', type: 'date', value: range.from, disabled: mode.value === 'all' });
  const to = el('input', { id: 'date-to', type: 'date', value: range.to, disabled: mode.value === 'all' });
  const field = (label, input) => el('div', { className: 'field' }, [el('label', { htmlFor: input.id, text: label }), input]);
  mode.addEventListener('change', () => { from.disabled = to.disabled = mode.value === 'all'; formError.hidden = true; });
  const form = el('form', { className: 'filters' }, [field('Phạm vi bán hàng', mode), field('Từ ngày', from), field('Đến ngày', to), el('button', { className: 'button primary', type: 'submit', text: 'Áp dụng' }), el('button', { className: 'button', type: 'button', text: 'Đặt lại', onClick: () => { window.location.hash = '#/dashboard'; if (!range.from && !range.to) refresh.click(); } }), el('span', { className: 'filter-help', text: 'Tồn kho và hồ sơ là số liệu hiện tại.' }), formError]);
  form.addEventListener('submit', event => {
    event.preventDefault(); formError.hidden = true;
    if (mode.value === 'custom' && from.value && to.value && from.value > to.value) { formError.textContent = 'Từ ngày phải nhỏ hơn hoặc bằng đến ngày.'; formError.hidden = false; to.focus(); return; }
    const next = new URLSearchParams();
    if (mode.value === 'custom') { if (from.value) next.set('from', from.value); if (to.value) next.set('to', to.value); }
    const hash = `#/dashboard${next.size ? `?${next}` : ''}`;
    if (window.location.hash === hash) refresh.click(); else window.location.hash = hash;
  });
  const kpis = [
    ['doanhThu', 'Doanh thu thực thu', 'revenue', 'Sau giảm giá · Trong kỳ chọn', '', money],
    ['soHoaDon', 'Số hóa đơn', 'invoice', 'Trong kỳ chọn', '', number],
    ['soSanPham', 'Số sản phẩm', 'product', 'Toàn bộ sản phẩm · Hiện tại', '', number],
    ['soKhachHang', 'Số khách hàng', 'customer', 'Thành viên · Hiện tại', '', number],
    ['tonThap', 'Sản phẩm tồn thấp', 'warning', 'Còn 1–19 đơn vị · Hiện tại', 'amber', number],
    ['hetHang', 'Sản phẩm hết hàng', 'empty', 'Tồn bằng 0 · Hiện tại', 'red', number]
  ];
  const values = new Map();
  const kpiGrid = el('section', { className: 'kpi-grid', 'aria-label': 'Chỉ số tổng quan', 'aria-busy': 'true' }, kpis.map(([key, label, glyph, note, color]) => {
    const value = el('div', { className: 'kpi-value' }, [el('span', { className: 'skeleton', 'aria-label': 'Đang tải' })]); values.set(key, value);
    return el('article', { className: 'kpi' }, [el('div', { className: 'kpi-heading' }, [el('span', { className: 'kpi-title', text: label }), el('span', { className: `kpi-icon ${color}` }, [icon(glyph)])]), value, el('div', { className: 'kpi-note' }, [el('span', { className: 'live-label', 'aria-hidden': 'true' }), note])]);
  }));
  const summaryMessage = el('div');
  const saleNote = el('p', { className: 'summary-note' });
  function panel(titleText, subtitle, chip) {
    const body = el('div', { className: 'card-body' }, [loading()]);
    const node = el('section', { className: 'card' }, [el('div', { className: 'card-header' }, [el('div', {}, [el('h2', { className: 'card-title', text: titleText }), el('p', { className: 'card-subtitle', text: subtitle })]), el('span', { className: 'card-chip', text: chip })]), body]);
    return { node, body };
  }
  const monthly = panel('Doanh thu theo tháng', 'Doanh thu thực thu sau giảm giá · Giờ Việt Nam', 'VNĐ');
  const top = panel('Top 5 sản phẩm bán chạy', 'Xếp hạng theo tổng số lượng đã bán', 'SỐ LƯỢNG');
  const payments = panel('Phương thức thanh toán', 'Cơ cấu số hóa đơn và doanh thu thực thu', 'TRONG KỲ');
  container.replaceChildren(heading, form, kpiGrid, summaryMessage, monthly.node, el('div', { className: 'charts-grid' }, [top.node, payments.node]), saleNote);

  async function attachChart(key, body, type, labels, data, dataTable, options = {}) {
    charts.get(key)?.destroy(); charts.delete(key);
    const canvas = el('canvas', { role: 'img', 'aria-label': key === 'monthly' ? 'Biểu đồ doanh thu theo tháng; số liệu có trong bảng bên dưới' : key === 'topProducts' ? 'Biểu đồ top sản phẩm; số liệu có trong bảng bên dưới' : 'Biểu đồ phương thức thanh toán; số liệu có trong bảng bên dưới' });
    const chartContainer = el('div', { className: key === 'monthly' ? 'chart-container' : 'chart-container small' }, [canvas]);
    const details = dataDetails(dataTable);
    body.replaceChildren(chartContainer, details);
    try { const chart = await createChart(canvas, type, labels, data, options); if (chart) charts.set(key, chart); }
    catch { if (signal.aborted) return; chartContainer.replaceChildren(el('div', { className: 'chart-warning', role: 'status', text: 'Chưa tải được biểu đồ từ CDN. Bạn vẫn có thể xem đầy đủ bảng số liệu.' })); chartContainer.style.height = 'auto'; details.open = true; }
  }
  async function renderMonthly(value) {
    if (!value.items.length) { monthly.body.replaceChildren(empty()); return; }
    await attachChart('monthly', monthly.body, 'bar', value.items.map(row => month(row.thang)), value.items.map(row => row.doanhThu), table([
      { label: 'Tháng', render: row => month(row.thang) }, { label: 'Số hóa đơn', numeric: true, render: row => number(row.soHoaDon) }, { label: 'Thực thu', numeric: true, render: row => money(row.doanhThu) }, { label: 'Trung bình / hóa đơn', numeric: true, render: row => money(row.trungBinhHoaDon) }
    ], value.items, 'Doanh thu theo tháng'), { currency: true });
    if (signal.aborted) return;
    if (monthlyHistory.length || value.nextFrom) {
      const back = el('button', { type: 'button', className: 'button', text: 'Trước', disabled: !monthlyHistory.length, onClick: () => { monthlyCurrent = monthlyHistory.pop(); loadMonthly(); } });
      const next = el('button', { type: 'button', className: 'button', text: 'Sau', disabled: !value.nextFrom, onClick: () => { monthlyHistory.push({ ...monthlyCurrent }); monthlyCurrent = { ...monthlyCurrent, from: value.nextFrom }; loadMonthly(); } });
      monthly.body.append(el('div', { className: 'chart-pager' }, [el('span', { text: `Trang ${monthlyHistory.length + 1} · Tối đa 100 tháng / trang` }), back, next]));
    }
  }
  async function renderTop(value) {
    if (!value.length) { top.body.replaceChildren(empty('Chưa có sản phẩm bán trong kỳ chọn.')); return; }
    await attachChart('topProducts', top.body, 'bar', value.map(row => row.maSP), value.map(row => row.soLuongBan), table([
      { label: 'Sản phẩm', render: row => el('div', { className: 'table-product' }, [el('strong', { text: row.tenSP }), el('small', { text: row.maSP })]) }, { label: 'Đã bán', numeric: true, render: row => number(row.soLuongBan) }
    ], value, 'Top 5 sản phẩm bán chạy'), { horizontal: true });
  }
  async function renderPayments(value) {
    if (!value.items.length) { payments.body.replaceChildren(empty('Chưa có giao dịch thanh toán trong kỳ chọn.')); return; }
    await attachChart('payments', payments.body, 'doughnut', value.items.map(row => row.phuongThuc), value.items.map(row => row.soHoaDon), table([
      { label: 'Phương thức', key: 'phuongThuc' }, { label: 'Số HĐ', numeric: true, render: row => number(row.soHoaDon) }, { label: 'Thực thu', numeric: true, render: row => money(row.doanhThu) }
    ], value.items, 'Thống kê phương thức thanh toán'));
    if (value.total > value.items.length) payments.body.append(el('p', { className: 'table-note', text: `Đang hiển thị ${value.items.length}/${value.total} phương thức. Chọn khoảng ngày cụ thể để thu hẹp dữ liệu.` }));
  }
  const renderers = { monthly: renderMonthly, topProducts: renderTop, payments: renderPayments };
  function renderSummary(value) {
    summaryMessage.replaceChildren();
    kpiGrid.setAttribute('aria-busy', 'false');
    for (const [key, , , , , formatter] of kpis) values.get(key).textContent = formatter(value[key]);
    saleNote.textContent = `Phạm vi bán hàng: ${period(range)}. Tiền hàng trước giảm: ${money(value.tienHang)} · Giảm giá: ${money(value.giamGia)}. Tồn kho hiển thị số lượng hiện có trong database.`;
  }
  function sectionFailure(key, message) {
    if (key === 'summary') {
      kpiGrid.setAttribute('aria-busy', 'false');
      for (const value of values.values()) value.textContent = '—';
      summaryMessage.replaceChildren(errorBox(message, () => load('summary')));
    } else ({ monthly, topProducts: top, payments })[key].body.replaceChildren(errorBox(message, () => load(key)));
  }
  async function loadMonthly() {
    monthly.body.replaceChildren(loading());
    try { const response = await get('/api/dashboard', monthlyCurrent, { signal }); if (signal.aborted) return; if (response.errors.monthly) throw new Error(response.errors.monthly.message); await renderMonthly(response.data.monthly); }
    catch (error) { if (error.name !== 'AbortError' && !signal.aborted) monthly.body.replaceChildren(errorBox(error.message, loadMonthly)); }
  }
  async function load(only) {
    try {
      const response = await get('/api/dashboard', range, { signal });
      if (signal.aborted) return;
      latest = response;
      updated.textContent = `Cập nhật ${dateTime(response.meta.updatedAt)} · ${period(range)}`;
      connection.textContent = Object.keys(response.errors).length ? 'Kết nối một phần' : 'Đã kết nối';
      connection.className = 'connection connected';
      const jobs = [];
      for (const key of only ? [only] : ['summary', 'monthly', 'topProducts', 'payments']) {
        if (response.errors[key]) sectionFailure(key, response.errors[key].message);
        else if (key === 'summary') renderSummary(response.data.summary);
        else jobs.push(renderers[key](response.data[key]));
      }
      await Promise.allSettled(jobs);
    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) return;
      connection.textContent = 'Chưa kết nối'; connection.className = 'connection failed';
      updated.textContent = latest ? `Lần tải trước: ${dateTime(latest.meta.updatedAt)}` : 'Chưa tải được dữ liệu từ MongoDB';
      for (const key of only ? [only] : ['summary', 'monthly', 'topProducts', 'payments']) sectionFailure(key, error.message);
    }
  }
  load();
  return () => { for (const chart of charts.values()) chart.destroy(); charts.clear(); };
}
