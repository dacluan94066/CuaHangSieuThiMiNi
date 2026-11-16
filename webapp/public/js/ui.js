import { get } from './api.js';
import { dateTime } from './format.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in node && !key.startsWith('aria')) node[key] = value;
    else node.setAttribute(key, String(value));
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const paths = {
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 2 M18 17A7 7 0 0 1 6 19l-2-2',
  revenue: 'M4 18 10 12l4 3 6-9 M15 6h5v5 M4 4v16h16',
  invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 8h6 M9 12h6',
  product: 'm12 3 9 5-9 5-9-5 9-5Z M3 8v9l9 5 9-5V8 M12 13v9',
  customer: 'M4 21v-2a6 6 0 0 1 12 0v2 M17 4a4 4 0 0 1 0 7 M22 21v-2a5 5 0 0 0-3-4 M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  warning: 'm12 3 10 18H2L12 3Z M12 9v5 M12 17h.01',
  empty: 'M4 7h16v14H4z M4 7l4-5h8l4 5 M9 12h6'
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[name] || paths.product); svg.append(path); return svg;
}
export const loading = () => el('div', { className: 'loading', role: 'status', text: 'Đang tải dữ liệu…' });
export const empty = (text = 'Không có dữ liệu trong khoảng thời gian đã chọn.') => el('div', { className: 'empty-state', text });
export function errorBox(message, retry) {
  return el('div', { className: 'inline-error', role: 'alert' }, [el('p', { text: message }), ...(retry ? [el('button', { className: 'button', type: 'button', text: 'Thử lại', onClick: retry })] : [])]);
}
export function table(columns, rows, caption) {
  const result = el('table');
  result.setAttribute('aria-label', caption);
  result.append(el('thead', {}, [el('tr', {}, columns.map(column => el('th', { scope: 'col', className: column.numeric ? 'number' : '', text: column.label })))]));
  result.append(el('tbody', {}, rows.map(row => el('tr', {}, columns.map(column => el('td', { className: column.numeric ? 'number' : '' }, [column.render ? column.render(row) : String(row[column.key] ?? '—')]))))));
  return el('div', { className: 'table-wrap', tabindex: 0, role: 'region', 'aria-label': caption }, [result]);
}
export function dataDetails(dataTable) {
  return el('details', { className: 'data-details' }, [el('summary', { text: 'Xem bảng số liệu' }), dataTable]);
}

export function updateQueryHash(path, query, replace = false) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== '' && value !== undefined && value !== null) params.set(key, String(value));
  const hash = `#${path}${params.size ? `?${params}` : ''}`;
  if (window.location.hash !== hash) window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
}

export function pager(pagination, onChange) {
  const { page, limit, total, totalPages } = pagination;
  const start = total && page <= totalPages ? (page - 1) * limit + 1 : 0;
  const end = start ? Math.min(page * limit, total) : 0;
  const size = el('select', { 'aria-label': 'Số dòng mỗi trang', onChange: event => onChange({ limit: Number(event.target.value), page: 1 }) }, [10, 20, 50, 100].map(value => el('option', { value, text: `${value} dòng / trang` })));
  size.value = String(limit);
  return el('div', { className: 'pagination' }, [
    el('span', { className: 'pagination-total', text: `${start}–${end} / ${total} bản ghi` }), size,
    el('div', { className: 'pagination-buttons' }, [
      el('button', { type: 'button', className: 'button', text: 'Trang đầu', disabled: page <= 1, onClick: () => onChange({ page: 1 }) }),
      el('button', { type: 'button', className: 'button', text: 'Trước', disabled: page <= 1, onClick: () => onChange({ page: page - 1 }) }),
      el('span', { text: `Trang ${page} / ${totalPages || 1}`, 'aria-live': 'polite' }),
      el('button', { type: 'button', className: 'button', text: 'Sau', disabled: page >= totalPages, onClick: () => onChange({ page: page + 1 }) })
    ])
  ]);
}

export function badge(label) {
  const tone = ['Hết hàng', 'Hết hạn'].includes(label) ? 'danger' : ['Tồn thấp', 'Sắp hết hạn', 'Sắp diễn ra'].includes(label) ? 'warning' : ['Còn hàng', 'Còn hạn', 'Đang áp dụng'].includes(label) ? 'success' : 'neutral';
  return el('span', { className: `badge ${tone}`, text: label });
}

export function warningBadges(product) {
  return el('div', { className: 'badge-list' }, product.CanhBao?.length ? product.CanhBao.map(badge) : [el('span', { className: 'muted', text: 'Không có cảnh báo' })]);
}

export function setConnectionState(state) {
  const node = document.getElementById('connection-status');
  if (!node) return;
  node.className = `connection ${state === 'connected' ? 'connected' : state === 'failed' ? 'failed' : ''}`;
  node.textContent = state === 'connected' ? 'Đã kết nối' : state === 'failed' ? 'Chưa kết nối' : 'Đang tải dữ liệu';
}

export const SEARCH_HINTS = Object.freeze({
  products: 'Tìm theo mã hoặc tên sản phẩm.',
  invoices: 'Tìm theo mã hóa đơn, ví dụ HD009.',
  purchases: 'Tìm theo mã phiếu nhập, ví dụ PN001.',
  customers: 'Tìm theo mã, họ tên hoặc số điện thoại khách hàng.',
  employees: 'Tìm theo mã hoặc họ tên nhân viên.',
  promotions: 'Tìm theo mã hoặc tên khuyến mãi.'
});

export function searchEmptyMessage(kind, keyword, fallback = 'Không có bản ghi phù hợp bộ lọc.') {
  return keyword?.trim() ? `${fallback} ${SEARCH_HINTS[kind]} Thử từ khóa khác hoặc đặt lại bộ lọc.` : fallback;
}

export function detailRow(label, value) { return el('div', { className: 'detail-row' }, [el('dt', { text: label }), el('dd', {}, [value ?? '—'])]); }
export function detailSection(title, rows) { return el('section', { className: 'card' }, [el('div', { className: 'card-header' }, [el('h2', { className: 'card-title', text: title })]), el('dl', { className: 'detail-list' }, rows)]); }
export function metricCards(items) { return el('div', { className: 'detail-metrics summary-metrics' }, items.map(([label, value]) => el('div', { className: 'detail-metric' }, [el('span', { text: label }), el('strong', { text: value })]))); }

// Thành phần DOM thuần dùng chung cho các danh sách chỉ đọc.
export function renderReadList(container, { signal, params }, spec) {
  let query = Object.fromEntries(params), requestController, timer, requestId = 0;
  const inputs = {};
  const body = el('div', { className: 'list-content', 'aria-live': 'polite' });
  const note = el('p', { className: 'summary-note' });
  const formError = el('p', { className: 'form-error', role: 'alert', hidden: true });
  const lookupErrors = el('div', { className: 'lookup-errors' });
  const search = el('input', { id: `${spec.kind}-q`, type: 'search', maxLength: 100, value: query.q || '', placeholder: spec.placeholder, autocomplete: 'off', 'aria-describedby': `${spec.kind}-search-help` });
  inputs.q = search;
  const fields = [el('div', { className: 'field search-field' }, [el('label', { htmlFor: search.id, text: 'Tìm kiếm' }), search, el('small', { id: `${spec.kind}-search-help`, className: 'field-hint', text: SEARCH_HINTS[spec.kind] })])];
  for (const field of spec.filters || []) {
    const input = field.options ? el('select', {}, field.options.map(([value, text]) => el('option', { value, text }))) : field.source ? el('select', { disabled: true }, [el('option', { value: '', text: 'Đang tải…' })]) : el('input', { type: field.type || 'text', placeholder: field.placeholder || '', value: query[field.key] || '', ...(field.type === 'number' ? { min: '0', step: 'any' } : field.type === 'date' ? {} : { maxLength: 50 }) });
    if (field.options) input.value = query[field.key] || '';
    input.id = `${spec.kind}-${field.key}`; inputs[field.key] = input;
    fields.push(el('div', { className: 'field' }, [el('label', { htmlFor: input.id, text: field.label }), input, ...(field.help ? [el('small', { className: 'field-hint', text: field.help })] : [])]));
  }
  const form = el('form', { className: 'filters transaction-filters' }, [...fields, el('div', { className: 'filter-actions' }, [el('button', { type: 'submit', className: 'button primary', text: 'Áp dụng' }), el('button', { type: 'button', className: 'button', text: 'Đặt lại', onClick: () => { clearTimeout(timer); query = {}; for (const input of Object.values(inputs)) input.value = ''; formError.hidden = true; updateQueryHash(spec.path, query); load(); } })]), formError]);
  const refreshBtn = el('button', { type: 'button', className: 'button', 'aria-label': `Làm mới ${spec.title.toLowerCase()}`, onClick: load }, [icon('refresh'), 'Làm mới']);
  const actionsWrap = spec.headerActions
    ? el('div', { style: 'display:flex;gap:10px;align-items:center;' }, [...(typeof spec.headerActions === 'function' ? spec.headerActions(load) : spec.headerActions), refreshBtn])
    : refreshBtn;
  container.replaceChildren(el('div', { className: 'page-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: spec.eyebrow }), el('h1', { text: spec.title }), el('p', { text: spec.description })]), actionsWrap]), form, lookupErrors, el('section', { className: 'card list-card' }, [body]), note);
  function change(patch, replace = false) { query = { ...query, ...patch }; updateQueryHash(spec.path, query, replace); load(); }
  form.addEventListener('submit', event => {
    event.preventDefault(); clearTimeout(timer); formError.hidden = true;
    if (inputs.from?.value && inputs.to?.value && inputs.from.value > inputs.to.value) { formError.textContent = 'Từ ngày phải nhỏ hơn hoặc bằng đến ngày.'; formError.hidden = false; inputs.to.focus(); return; }
    const patch = { page: 1 }; for (const [key, input] of Object.entries(inputs)) patch[key] = input.disabled ? query[key] || '' : input.value;
    change(patch);
  });
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => change({ q: search.value, page: 1 }, true), 300); });
  async function loadLookup(field) {
    const input = inputs[field.key];
    try {
      const rows = [];
      for (let page = 1; ; page++) {
        const response = await get(field.source, { page, limit: 100 }, { signal }); rows.push(...response.data);
        if (page >= response.pagination.totalPages) break;
      }
      if (signal.aborted) return;
      input.replaceChildren(el('option', { value: '', text: field.allLabel }), ...rows.map(row => el('option', { value: row[field.valueField], text: row[field.labelField] })));
      if (query[field.key] && !rows.some(row => row[field.valueField] === query[field.key])) input.append(el('option', { value: query[field.key], text: query[field.key] }));
      input.value = query[field.key] || ''; input.disabled = false;
    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) return;
      const box = errorBox(`Chưa tải được lựa chọn ${field.label.toLowerCase()}. ${error.message}`, () => { box.remove(); loadLookup(field); }); lookupErrors.append(box);
    }
  }
  async function load() {
    requestController?.abort(); requestController = new AbortController(); const id = ++requestId;
    body.replaceChildren(loading()); body.setAttribute('aria-busy', 'true'); setConnectionState('loading');
    try {
      const response = await get(spec.api, query, { signal: requestController.signal });
      if (signal.aborted || id !== requestId) return;
      body.replaceChildren(el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: spec.tableTitle }), el('span', { className: 'muted', text: `${response.pagination.total} bản ghi` })]), response.data.length ? table(spec.columns, response.data, spec.tableTitle) : empty(searchEmptyMessage(spec.kind, query.q, spec.emptyText)), pager(response.pagination, patch => change(patch)));
      note.textContent = `Cập nhật ${dateTime(response.meta.updatedAt)} · ${spec.note || 'Dữ liệu chỉ đọc, phân trang trên server.'}`;
      setConnectionState('connected');
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted && id === requestId) { body.replaceChildren(errorBox(error.message, load)); setConnectionState('failed'); } }
    finally { if (id === requestId) body.setAttribute('aria-busy', 'false'); }
  }
  signal.addEventListener('abort', () => { requestController?.abort(); clearTimeout(timer); }, { once: true });
  for (const field of spec.filters || []) if (field.source) loadLookup(field);
  load(); return () => { clearTimeout(timer); requestController?.abort(); };
}
