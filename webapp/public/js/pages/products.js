import { get } from '../api.js';
import { el, icon, loading, empty, errorBox, table, pager, badge, warningBadges, updateQueryHash, setConnectionState, SEARCH_HINTS, searchEmptyMessage } from '../ui.js';
import { money, number, date, dateTime } from '../format.js';

const SORTS = [['ma-tang', 'Mã sản phẩm tăng dần'], ['gia-tang', 'Giá bán tăng dần'], ['gia-giam', 'Giá bán giảm dần'], ['ton-tang', 'Tồn kho tăng dần'], ['ton-giam', 'Tồn kho giảm dần']];
const STOCK = [['', 'Tất cả mức tồn'], ['con-hang', 'Còn hàng (> 0)'], ['ton-thap', 'Tồn thấp (1–19)'], ['het-hang', 'Hết hàng (= 0)']];
const options = rows => rows.map(([value, text]) => el('option', { value, text }));

export function renderProducts(container, { signal, params, canViewSupply = false }) {
  let query = Object.fromEntries(params);
  let requestController;
  let timer;
  let requestId = 0;
  const inputs = {};
  const formError = el('p', { className: 'form-error', role: 'alert', hidden: true });
  const lookupErrors = el('div', { className: 'lookup-errors' });
  const content = el('div', { className: 'list-content', 'aria-live': 'polite' });
  const updated = el('p', { className: 'summary-note' });
  function field(key, label, input) {
    input.id = `product-${key}`; inputs[key] = input;
    if (key === 'q') input.setAttribute('aria-describedby', 'product-search-help');
    return el('div', { className: `field ${key === 'q' ? 'search-field' : ''}` }, [el('label', { htmlFor: input.id, text: label }), input, ...(key === 'q' ? [el('small', { id: 'product-search-help', className: 'field-hint', text: SEARCH_HINTS.products })] : [])]);
  }
  const q = el('input', { type: 'search', maxLength: 100, placeholder: 'Tìm tên hoặc mã sản phẩm', value: query.q || '', autocomplete: 'off' });
  const maDM = el('select', { disabled: true }, options([['', 'Đang tải danh mục…']]));
  const maNCC = el('select', { disabled: true }, options([['', 'Đang tải nhà cung cấp…']]));
  const giaTu = el('input', { type: 'number', min: '0', step: 'any', placeholder: 'Không giới hạn', value: query.giaTu || '' });
  const giaDen = el('input', { type: 'number', min: '0', step: 'any', placeholder: 'Không giới hạn', value: query.giaDen || '' });
  const tonKho = el('select', {}, options(STOCK)); tonKho.value = query.tonKho || '';
  const sort = el('select', {}, options(SORTS)); sort.value = query.sort || 'ma-tang';
  const form = el('form', { className: 'filters product-filters' }, [
    field('q', 'Tìm sản phẩm', q), field('maDM', 'Danh mục', maDM), ...(canViewSupply ? [field('maNCC', 'Nhà cung cấp', maNCC)] : []),
    field('giaTu', 'Giá bán từ (VNĐ)', giaTu), field('giaDen', 'Giá bán đến (VNĐ)', giaDen),
    field('tonKho', 'Trạng thái tồn', tonKho), field('sort', 'Sắp xếp', sort),
    el('div', { className: 'filter-actions' }, [el('button', { type: 'submit', className: 'button primary', text: 'Áp dụng' }), el('button', { type: 'button', className: 'button', text: 'Đặt lại', onClick: reset })]), formError
  ]);
  const refresh = el('button', { type: 'button', className: 'button', 'aria-label': 'Làm mới sản phẩm', onClick: load }, [icon('refresh'), 'Làm mới']);
  container.replaceChildren(el('div', { className: 'page-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: 'DANH MỤC HÀNG HÓA' }), el('h1', { text: 'Sản phẩm' }), el('p', { text: 'Tra cứu hàng hóa, giá bán và số lượng tồn hiện tại.' })]), refresh]), form, lookupErrors, el('section', { className: 'card list-card', 'aria-label': 'Danh sách sản phẩm' }, [content]), updated);

  function change(patch, replace = false) {
    query = { ...query, ...patch };
    updateQueryHash('/san-pham', query, replace);
    load();
  }
  function reset() {
    clearTimeout(timer); query = {};
    for (const [key, input] of Object.entries(inputs)) input.value = key === 'sort' ? 'ma-tang' : '';
    formError.hidden = true; giaDen.setCustomValidity(''); updateQueryHash('/san-pham', query); load();
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); clearTimeout(timer); giaDen.setCustomValidity(''); formError.hidden = true;
    if (giaTu.value !== '' && giaDen.value !== '' && Number(giaTu.value) > Number(giaDen.value)) {
      formError.textContent = 'Giá từ phải nhỏ hơn hoặc bằng giá đến.'; formError.hidden = false; giaDen.focus(); return;
    }
    const patch = { page: 1 };
    for (const [key, input] of Object.entries(inputs)) patch[key] = input.disabled ? query[key] || '' : input.value;
    change(patch);
  });
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => change({ q: q.value, page: 1 }, true), 300); });
  sort.addEventListener('change', () => change({ sort: sort.value, page: 1 }));
  async function loadLookup(path, select, code, title, allLabel, key) {
    try {
      const rows = [];
      for (let page = 1; ; page++) {
        const result = await get(path, { limit: 100, page }, { signal });
        rows.push(...result.data);
        if (page >= result.pagination.totalPages) break;
      }
      if (signal.aborted) return;
      select.replaceChildren(...options([['', allLabel], ...rows.map(row => [row[code], row[title]])]));
      if (query[key] && !rows.some(row => row[code] === query[key])) select.append(el('option', { value: query[key], text: `${query[key]} · Không tìm thấy thông tin liên kết` }));
      select.value = query[key] || ''; select.disabled = false;
    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) return;
      select.replaceChildren(...options([['', 'Chưa tải được danh sách']]));
      const box = errorBox(`Không tải được ${allLabel.toLowerCase()}. ${error.message}`, () => { box.remove(); loadLookup(path, select, code, title, allLabel, key); });
      lookupErrors.append(box);
    }
  }
  async function load() {
    requestController?.abort(); requestController = new AbortController(); const id = ++requestId;
    content.replaceChildren(loading()); content.setAttribute('aria-busy', 'true'); setConnectionState('loading');
    try {
      const result = await get('/api/san-pham', query, { signal: requestController.signal });
      if (signal.aborted || id !== requestId) return;
      const columns = [
        { label: 'Mã sản phẩm', render: row => el('a', { href: `#/san-pham/${encodeURIComponent(row.MaSP)}`, className: 'code-link', text: row.MaSP }) },
        { label: 'Tên sản phẩm', render: row => el('a', { href: `#/san-pham/${encodeURIComponent(row.MaSP)}`, className: 'product-name', text: row.TenSP }) },
        { label: 'Danh mục', key: 'TenDM' }, ...(canViewSupply ? [{ label: 'Nhà cung cấp', key: 'TenNCC' }] : []),
        { label: 'Giá bán', numeric: true, render: row => money(row.DonGiaBan) },
        { label: 'Tồn kho', numeric: true, render: row => `${number(row.SoLuongTon)} ${row.DonViTinh || ''}` },
        { label: 'Trạng thái tồn', render: row => badge(row.TrangThaiTon) },
        { label: 'Hạn sử dụng', render: row => row.HanSuDung ? date(row.HanSuDung) : 'Chưa có hạn sử dụng' }
      ];
      content.replaceChildren(el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: 'Danh sách sản phẩm' }), el('span', { className: 'muted', text: `${number(result.pagination.total)} sản phẩm` })]), result.data.length ? table(columns, result.data, 'Danh sách sản phẩm có phân trang') : empty(searchEmptyMessage('products', query.q, 'Không có sản phẩm phù hợp bộ lọc.')), pager(result.pagination, patch => change(patch)));
      updated.textContent = `Cập nhật ${dateTime(result.meta.updatedAt)} · Tồn kho lấy trực tiếp từ database. Kéo ngang bảng để xem đủ thông tin.`;
      setConnectionState('connected');
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted && id === requestId) { content.replaceChildren(errorBox(error.message, load)); setConnectionState('failed'); } }
    finally { if (id === requestId) content.setAttribute('aria-busy', 'false'); }
  }
  signal.addEventListener('abort', () => { requestController?.abort(); clearTimeout(timer); }, { once: true });
  loadLookup('/api/danh-muc', maDM, 'MaDM', 'TenDM', 'Tất cả danh mục', 'maDM');
  if (canViewSupply) loadLookup('/api/nha-cung-cap', maNCC, 'MaNCC', 'TenNCC', 'Tất cả nhà cung cấp', 'maNCC');
  load();
  return () => { clearTimeout(timer); requestController?.abort(); };
}

export function renderProductDetail(container, { signal, code, canViewSupply = false, canViewInventory = false }) {
  const body = el('div', {}, [loading()]);
  container.replaceChildren(el('a', { className: 'back-link', href: '#/san-pham', text: '← Danh sách sản phẩm' }), body);
  async function load() {
    body.replaceChildren(loading()); setConnectionState('loading');
    try {
      const { data: product, meta } = await get(`/api/san-pham/${encodeURIComponent(code)}`, {}, { signal });
      if (signal.aborted) return;
      document.title = `${product.MaSP} · Sản phẩm · MiniMart`;
      const row = (label, value) => el('div', { className: 'detail-row' }, [el('dt', { text: label }), el('dd', {}, [value ?? '—'])]);
      const section = (title, rows) => el('section', { className: 'card' }, [el('div', { className: 'card-header' }, [el('h2', { className: 'card-title', text: title })]), el('dl', { className: 'detail-list' }, rows)]);
      const supplier = product.NhaCungCap;
      body.replaceChildren(
        el('div', { className: 'page-heading detail-heading' }, [el('div', {}, [el('span', { className: 'welcome-label', text: product.MaSP }), el('h1', { text: product.TenSP }), el('p', { text: `${product.TenDM} · ${product.DonViTinh}` })]), ...(canViewInventory ? [el('a', { className: 'button', href: '#/canh-bao-kho', text: 'Xem cảnh báo kho' })] : [])]),
        el('div', { className: 'detail-metrics' }, [['Giá bán', money(product.DonGiaBan)], ...(canViewSupply ? [['Giá nhập', money(product.DonGiaNhap)]] : []), ['Tồn hiện tại', `${number(product.SoLuongTon)} ${product.DonViTinh}`], ['Hạn sử dụng', product.HanSuDung ? date(product.HanSuDung) : 'Chưa có hạn sử dụng']].map(([label, value]) => el('div', { className: 'detail-metric' }, [el('span', { text: label }), el('strong', { text: value })]))),
        el('div', { className: 'detail-grid' }, [
          section('Thông tin hàng hóa', [row('Mã sản phẩm', product.MaSP), row('Danh mục', `${product.MaDM} · ${product.TenDM}`), row('Đơn vị tính', product.DonViTinh), row('Trạng thái gốc trong DB', product.TrangThai), row('Trạng thái tồn hiện tại', badge(product.TrangThaiTon)), row('Trạng thái hạn dùng', badge(product.TrangThaiHanSuDung)), row('Cảnh báo', warningBadges(product)), row('Ngày cập nhật sản phẩm', product.NgayCapNhat ? dateTime(product.NgayCapNhat) : 'Chưa có thông tin')]),
          ...(canViewSupply ? [section('Nhà cung cấp', [row('Mã NCC', product.MaNCC), row('Tên NCC', product.TenNCC), row('Số điện thoại', supplier?.SDT), row('Email', supplier?.Email), row('Địa chỉ', supplier?.DiaChi), row('Trạng thái hợp tác', supplier?.TrangThai)])] : [])
        ]),
        ...(product.ThamChieuThieu?.length ? [el('p', { className: 'notice missing-reference', role: 'status', text: `Không tìm thấy thông tin liên kết: ${product.ThamChieuThieu.join(', ')}. Sản phẩm vẫn được hiển thị.` })] : []),
        el('p', { className: 'summary-note', text: `Dữ liệu đọc lúc ${dateTime(meta.updatedAt)}. Tồn hiện tại là SoLuongTon đã lưu, không suy ra từ nhập/bán.` })
      );
      setConnectionState('connected');
    } catch (error) { if (error.name !== 'AbortError' && !signal.aborted) { body.replaceChildren(errorBox(error.message, load)); setConnectionState(error.status === 404 ? 'connected' : 'failed'); } }
  }
  load();
}
