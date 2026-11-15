import { get } from '../api.js';
import { el, icon, loading, empty, errorBox, table, pager, warningBadges, updateQueryHash, setConnectionState } from '../ui.js';
import { number, date, dateTime } from '../format.js';

const TYPES = [['tat-ca', 'Tất cả cảnh báo'], ['het-hang', 'Hết hàng'], ['ton-thap', 'Tồn thấp'], ['het-han', 'Hết hạn'], ['sap-het-han', 'Sắp hết hạn']];

export function renderInventory(container, { signal, params }) {
  let query = Object.fromEntries(params);
  let requestController;
  let requestId = 0;
  let timer;
  const body = el('div', { className: 'list-content', 'aria-live': 'polite' });
  const note = el('p', { className: 'summary-note' });
  const input = el('input', { id: 'inventory-search', type: 'search', maxLength: 100, value: query.q || '', placeholder: 'Tìm tên hoặc mã sản phẩm', autocomplete: 'off' });
  const buttons = new Map();
  const filters = el('nav', { className: 'filter-tabs', 'aria-label': 'Nhóm cảnh báo kho' }, TYPES.map(([value, label]) => {
    const button = el('button', { type: 'button', text: label, onClick: () => change({ loai: value, page: 1 }) }); buttons.set(value, button); return button;
  }));
  const search = el('form', { className: 'filters inventory-search' }, [el('div', { className: 'field search-field' }, [el('label', { htmlFor: input.id, text: 'Tìm trong cảnh báo' }), input]), el('button', { type: 'submit', className: 'button primary', text: 'Tìm kiếm' }), el('button', { type: 'button', className: 'button', text: 'Đặt lại', onClick: () => { clearTimeout(timer); input.value = ''; query = {}; updateQueryHash('/canh-bao-kho', query); markButtons(); load(); } })]);
  container.replaceChildren(
    el('div', { className: 'page-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: 'THEO DÕI HÀNG HÓA' }), el('h1', { text: 'Cảnh báo kho' }), el('p', { text: 'Tồn bằng 0, còn 1–19 đơn vị và hạn dùng trong 30 ngày.' })]), el('button', { type: 'button', className: 'button', 'aria-label': 'Làm mới cảnh báo kho', onClick: load }, [icon('refresh'), 'Làm mới'])]),
    el('p', { className: 'notice inventory-explainer', text: 'Một sản phẩm có thể có nhiều cảnh báo nhưng chỉ xuất hiện một dòng trong “Tất cả”. Sắp hết hạn tính từ hôm nay đến hết ngày thứ 30 theo giờ Việt Nam.' }),
    filters, search, el('section', { className: 'card list-card', 'aria-label': 'Danh sách cảnh báo kho' }, [body]), note
  );
  function markButtons() { for (const [value, button] of buttons) { const active = value === (query.loai || 'tat-ca'); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); } }
  function change(patch, replace = false) { query = { ...query, ...patch }; updateQueryHash('/canh-bao-kho', query, replace); markButtons(); load(); }
  search.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); change({ q: input.value, page: 1 }); });
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => change({ q: input.value, page: 1 }, true), 300); });
  async function load() {
    requestController?.abort(); requestController = new AbortController(); const id = ++requestId;
    body.replaceChildren(loading()); body.setAttribute('aria-busy', 'true'); setConnectionState('loading');
    try {
      const result = await get('/api/canh-bao-kho', query, { signal: requestController.signal });
      if (signal.aborted || id !== requestId) return;
      body.replaceChildren(el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: TYPES.find(([value]) => value === result.meta.loai)?.[1] || 'Danh sách cảnh báo' }), el('span', { className: 'muted', text: `${number(result.pagination.total)} sản phẩm` })]), result.data.length ? table([
        { label: 'Sản phẩm', render: row => el('div', { className: 'table-product' }, [el('a', { className: 'product-name', href: `#/san-pham/${encodeURIComponent(row.MaSP)}`, text: row.TenSP }), el('small', { text: row.MaSP })]) },
        { label: 'Danh mục', key: 'TenDM' },
        { label: 'Tồn hiện tại', numeric: true, render: row => `${number(row.SoLuongTon)} ${row.DonViTinh || ''}` },
        { label: 'Hạn sử dụng', render: row => row.HanSuDung ? date(row.HanSuDung) : 'Chưa có hạn sử dụng' },
        { label: 'Cảnh báo', render: warningBadges },
        { label: 'Trạng thái gốc trong DB', key: 'TrangThai' }
      ], result.data, 'Cảnh báo kho, mỗi sản phẩm một dòng') : empty('Không có sản phẩm thuộc nhóm cảnh báo và từ khóa đã chọn.'), pager(result.pagination, patch => change(patch)));
      note.textContent = `Đối chiếu ngày ${date(result.meta.updatedAt)} theo giờ Việt Nam · Cập nhật ${dateTime(result.meta.updatedAt)}. Số lượng tồn lấy trực tiếp từ database.`;
      setConnectionState('connected');
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted && id === requestId) { body.replaceChildren(errorBox(error.message, load)); setConnectionState('failed'); } }
    finally { if (id === requestId) body.setAttribute('aria-busy', 'false'); }
  }
  signal.addEventListener('abort', () => { requestController?.abort(); clearTimeout(timer); }, { once: true });
  markButtons(); load();
  return () => { clearTimeout(timer); requestController?.abort(); };
}
