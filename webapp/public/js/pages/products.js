import { get, post, put, del } from '../api.js';
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
    return el('div', { className: `field ${key === 'q' ? 'search-field' : ''}` }, [
      el('label', { htmlFor: input.id, text: label }),
      input,
      ...(key === 'q' ? [el('small', { id: 'product-search-help', className: 'field-hint', text: SEARCH_HINTS.products })] : [])
    ]);
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
    el('div', { className: 'filter-actions' }, [
      el('button', { type: 'submit', className: 'button primary', text: 'Áp dụng' }),
      el('button', { type: 'button', className: 'button', text: 'Đặt lại', onClick: reset })
    ]),
    formError
  ]);

  const addBtn = el('button', {
    type: 'button',
    className: 'button primary',
    style: 'background: #da3011; border-color: #da3011; color: white;',
    onClick: () => openProductModal(null, load)
  }, ['+ Thêm sản phẩm']);

  const refresh = el('button', {
    type: 'button',
    className: 'button',
    'aria-label': 'Làm mới sản phẩm',
    onClick: load
  }, [icon('refresh'), 'Làm mới']);

  container.replaceChildren(
    el('div', { className: 'page-heading' }, [
      el('div', {}, [
        el('span', { className: 'welcome-label', text: 'DANH MỤC HÀNG HÓA' }),
        el('h1', { text: 'Sản phẩm' }),
        el('p', { text: 'Tra cứu hàng hóa, giá bán, số lượng tồn kho và hình ảnh thực tế.' })
      ]),
      el('div', { style: 'display:flex;gap:10px;align-items:center;' }, [addBtn, refresh])
    ]),
    form,
    lookupErrors,
    el('section', { className: 'card list-card', 'aria-label': 'Danh sách sản phẩm' }, [content]),
    updated
  );

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
        {
          label: 'Ảnh',
          render: row => el('img', {
            src: row.HinhAnh || `/images/products/${row.MaSP}.jpg`,
            alt: row.TenSP,
            className: 'admin-product-thumb',
            loading: 'lazy',
            onError: (e) => { e.target.src = '/images/products/SP001.jpg'; }
          })
        },
        { label: 'Mã SP', render: row => el('a', { href: `#/san-pham/${encodeURIComponent(row.MaSP)}`, className: 'code-link', text: row.MaSP }) },
        { label: 'Tên sản phẩm', render: row => el('a', { href: `#/san-pham/${encodeURIComponent(row.MaSP)}`, className: 'product-name', text: row.TenSP }) },
        { label: 'Danh mục', key: 'TenDM' },
        ...(canViewSupply ? [{ label: 'Nhà cung cấp', key: 'TenNCC' }] : []),
        { label: 'Giá bán', numeric: true, render: row => money(row.DonGiaBan) },
        { label: 'Tồn kho', numeric: true, render: row => `${number(row.SoLuongTon)} ${row.DonViTinh || ''}` },
        { label: 'Trạng thái tồn', render: row => badge(row.TrangThaiTon) },
        { label: 'Hạn sử dụng', render: row => row.HanSuDung ? date(row.HanSuDung) : 'Chưa có hạn dùng' }
      ];
      content.replaceChildren(
        el('div', { className: 'list-toolbar' }, [
          el('h2', { className: 'card-title', text: 'Danh sách sản phẩm' }),
          el('span', { className: 'muted', text: `${number(result.pagination.total)} sản phẩm` })
        ]),
        result.data.length ? table(columns, result.data, 'Danh sách sản phẩm có phân trang') : empty(searchEmptyMessage('products', query.q, 'Không có sản phẩm phù hợp bộ lọc.')),
        pager(result.pagination, patch => change(patch))
      );
      updated.textContent = `Cập nhật ${dateTime(result.meta.updatedAt)} · Tồn kho lấy trực tiếp từ database. Kéo ngang bảng để xem đủ thông tin.`;
      setConnectionState('connected');
    } catch (error) {
      if (error.name !== 'AbortError' && !signal.aborted && id === requestId) {
        content.replaceChildren(errorBox(error.message, load)); setConnectionState('failed');
      }
    } finally {
      if (id === requestId) content.setAttribute('aria-busy', 'false');
    }
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

      const editBtn = el('button', {
        type: 'button',
        className: 'button primary',
        style: 'background: #da3011; border-color: #da3011; color: white;',
        onClick: () => openProductModal(product, load)
      }, ['✏️ Chỉnh sửa sản phẩm']);

      const deleteBtn = el('button', {
        type: 'button',
        className: 'button',
        style: 'color: #dc2626; border-color: #fca5a5;',
        onClick: async () => {
          if (!confirm(`Bạn có chắc chắn muốn xóa hoặc ngưng kinh doanh sản phẩm [${product.MaSP}] ${product.TenSP}?`)) return;
          try {
            const res = await del(`/api/san-pham/${encodeURIComponent(product.MaSP)}`);
            alert(res.message || 'Thao tác thành công!');
            window.location.hash = '#/san-pham';
          } catch (err) {
            alert('Lỗi: ' + (err.message || 'Không thể xóa sản phẩm.'));
          }
        }
      }, ['🗑️ Xóa / Dừng bán']);

      const hero = el('div', { className: 'product-hero-card' }, [
        el('img', {
          src: product.HinhAnh || `/images/products/${product.MaSP}.jpg`,
          alt: product.TenSP,
          className: 'product-hero-img',
          onError: (e) => { e.target.src = '/images/products/SP001.jpg'; }
        }),
        el('div', { className: 'product-hero-content' }, [
          el('span', { className: 'welcome-label', text: product.MaSP }),
          el('h1', { text: product.TenSP }),
          el('p', { style: 'color:var(--muted);margin:0 0 10px;', text: `${product.TenDM} · Quy cách: ${product.DonViTinh} · Trạng thái: ${product.TrangThai}` }),
          el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;' }, [
            badge(product.TrangThaiTon),
            badge(product.TrangThaiHanSuDung),
            warningBadges(product)
          ]),
          el('div', { className: 'product-hero-actions' }, [editBtn, deleteBtn, ...(canViewInventory ? [el('a', { className: 'button', href: '#/canh-bao-kho', text: 'Xem cảnh báo kho' })] : [])])
        ])
      ]);

      body.replaceChildren(
        hero,
        el('div', { className: 'detail-metrics' }, [
          ['Giá bán', money(product.DonGiaBan)],
          ...(canViewSupply ? [['Giá nhập', money(product.DonGiaNhap)]] : []),
          ['Tồn hiện tại', `${number(product.SoLuongTon)} ${product.DonViTinh}`],
          ['Hạn sử dụng', product.HanSuDung ? date(product.HanSuDung) : 'Chưa có hạn sử dụng']
        ].map(([label, value]) => el('div', { className: 'detail-metric' }, [el('span', { text: label }), el('strong', { text: value })]))),
        el('div', { className: 'detail-grid' }, [
          section('Thông tin hàng hóa', [
            row('Mã sản phẩm', product.MaSP),
            row('Danh mục', `${product.MaDM} · ${product.TenDM}`),
            row('Đơn vị tính', product.DonViTinh),
            row('Trạng thái kinh doanh', product.TrangThai),
            row('Mô tả sản phẩm', product.MoTa || 'Chưa có mô tả chi tiết'),
            row('Trạng thái tồn hiện tại', badge(product.TrangThaiTon)),
            row('Trạng thái hạn dùng', badge(product.TrangThaiHanSuDung)),
            row('Cảnh báo', warningBadges(product)),
            row('Ngày cập nhật sản phẩm', product.NgayCapNhat ? dateTime(product.NgayCapNhat) : 'Chưa có thông tin')
          ]),
          ...(canViewSupply ? [section('Nhà cung cấp', [
            row('Mã NCC', product.MaNCC),
            row('Tên NCC', product.TenNCC),
            row('Số điện thoại', supplier?.SDT),
            row('Email', supplier?.Email),
            row('Địa chỉ', supplier?.DiaChi),
            row('Trạng thái hợp tác', supplier?.TrangThai)
          ])] : [])
        ]),
        ...(product.ThamChieuThieu?.length ? [el('p', { className: 'notice missing-reference', role: 'status', text: `Không tìm thấy thông tin liên kết: ${product.ThamChieuThieu.join(', ')}. Sản phẩm vẫn được hiển thị.` })] : []),
        el('p', { className: 'summary-note', text: `Dữ liệu đọc lúc ${dateTime(meta.updatedAt)}. Tồn hiện tại là SoLuongTon đã lưu trong database.` })
      );
      setConnectionState('connected');
    } catch (error) {
      if (error.name !== 'AbortError' && !signal.aborted) {
        body.replaceChildren(errorBox(error.message, load));
        setConnectionState(error.status === 404 ? 'connected' : 'failed');
      }
    }
  }
  load();
}

/**
 * Modal thêm / chỉnh sửa sản phẩm
 */
export async function openProductModal(product = null, onSuccess) {
  const isEdit = Boolean(product);
  const overlay = el('div', { className: 'modal-overlay' });

  // Form inputs
  const inMaSP = el('input', { type: 'text', value: product?.MaSP || '', placeholder: 'VD: SP021', disabled: isEdit, required: true });
  const inTenSP = el('input', { type: 'text', value: product?.TenSP || '', placeholder: 'VD: Nước giải khát vị cam...', required: true });
  const inMaDM = el('select', { required: true }, options([['', 'Đang tải danh mục...']]));
  const inMaNCC = el('select', { required: true }, options([['', 'Đang tải nhà cung cấp...']]));
  const inDonGiaNhap = el('input', { type: 'number', min: '0', step: '1000', value: product?.DonGiaNhap ?? 10000, required: true });
  const inDonGiaBan = el('input', { type: 'number', min: '0', step: '1000', value: product?.DonGiaBan ?? 15000, required: true });
  const inSoLuongTon = el('input', { type: 'number', min: '0', step: '1', value: product?.SoLuongTon ?? 50, required: true });
  const inDonViTinh = el('select', {}, options([
    ['Lon', 'Lon'], ['Chai', 'Chai'], ['Hộp', 'Hộp'], ['Gói', 'Gói'], ['Bịch', 'Bịch'],
    ['Cái', 'Cái'], ['Kg', 'Kg'], ['Thùng', 'Thùng'], ['Lốc', 'Lốc']
  ]));
  if (product?.DonViTinh) inDonViTinh.value = product.DonViTinh;

  const defaultDate = product?.HanSuDung ? new Date(product.HanSuDung).toISOString().split('T')[0] : '2027-12-31';
  const inHanSuDung = el('input', { type: 'date', value: defaultDate });
  const inTrangThai = el('select', {}, options([
    ['Đang bán', 'Đang bán'], ['Tạm hết', 'Tạm hết'], ['Ngưng kinh doanh', 'Ngưng kinh doanh']
  ]));
  if (product?.TrangThai) inTrangThai.value = product.TrangThai;

  const defaultImg = product?.HinhAnh || (isEdit ? `/images/products/${product.MaSP}.jpg` : '/images/products/SP001.jpg');
  const inHinhAnh = el('input', { type: 'text', value: defaultImg, placeholder: '/images/products/SP001.jpg' });
  const previewImg = el('img', { src: defaultImg, alt: 'Preview', onError: (e) => { e.target.src = '/images/products/SP001.jpg'; } });
  inHinhAnh.addEventListener('input', () => {
    previewImg.src = inHinhAnh.value.trim() || '/images/products/SP001.jpg';
  });

  const inMoTa = el('textarea', { placeholder: 'Mô tả tóm tắt về sản phẩm, xuất xứ, bảo quản...' });
  if (product?.MoTa) inMoTa.value = product.MoTa;
  const formErr = el('div', { className: 'inline-error', style: 'margin-bottom:14px;padding:8px 12px;', hidden: true });

  // Load danh mục và nhà cung cấp
  get('/api/danh-muc', { limit: 100 }).then(res => {
    inMaDM.replaceChildren(...options(res.data.map(d => [d.MaDM, `${d.MaDM} - ${d.TenDM}`])));
    if (product?.MaDM) inMaDM.value = product.MaDM;
  }).catch(() => {});

  get('/api/nha-cung-cap', { limit: 100 }).then(res => {
    inMaNCC.replaceChildren(...options(res.data.map(n => [n.MaNCC, `${n.MaNCC} - ${n.TenNCC}`])));
    if (product?.MaNCC) inMaNCC.value = product.MaNCC;
  }).catch(() => {});

  const closeBtn = el('button', { type: 'button', className: 'modal-close', onClick: () => overlay.remove() }, ['✕']);
  const cancelBtn = el('button', { type: 'button', className: 'button', onClick: () => overlay.remove() }, ['Hủy bỏ']);
  const submitBtn = el('button', { type: 'submit', className: 'button primary', style: 'background:#da3011;border-color:#da3011;color:white;' }, [
    isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'
  ]);

  const modalForm = el('form', { className: 'modal-body' }, [
    formErr,
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Mã sản phẩm *' }), inMaSP]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Tên sản phẩm *' }), inTenSP])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Danh mục *' }), inMaDM]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Nhà cung cấp *' }), inMaNCC])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Giá nhập (VNĐ) *' }), inDonGiaNhap]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Giá bán niêm yết (VNĐ) *' }), inDonGiaBan])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Số lượng tồn kho *' }), inSoLuongTon]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Đơn vị tính *' }), inDonViTinh])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Hạn sử dụng' }), inHanSuDung]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Trạng thái kinh doanh' }), inTrangThai])
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { text: 'Đường dẫn hình ảnh (URL/Ảnh packshot)' }),
      inHinhAnh,
      el('div', { className: 'image-preview-box' }, [
        previewImg,
        el('small', { style: 'color:var(--muted);', text: 'Xem trước hình ảnh sản phẩm thực tế.' })
      ])
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { text: 'Mô tả chi tiết' }),
      inMoTa
    ])
  ]);

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formErr.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu...';

    const payload = {
      TenSP: inTenSP.value.trim(),
      MaDM: inMaDM.value,
      MaNCC: inMaNCC.value,
      DonGiaNhap: Number(inDonGiaNhap.value),
      DonGiaBan: Number(inDonGiaBan.value),
      SoLuongTon: Number(inSoLuongTon.value),
      DonViTinh: inDonViTinh.value,
      HanSuDung: inHanSuDung.value,
      TrangThai: inTrangThai.value,
      HinhAnh: inHinhAnh.value.trim(),
      MoTa: inMoTa.value.trim()
    };

    if (!isEdit) {
      payload.MaSP = inMaSP.value.trim().toUpperCase();
    }

    try {
      if (isEdit) {
        await put(`/api/san-pham/${encodeURIComponent(product.MaSP)}`, payload);
      } else {
        await post('/api/san-pham', payload);
      }
      overlay.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      formErr.textContent = err.message || 'Lỗi khi lưu sản phẩm.';
      formErr.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm';
    }
  });

  const modal = el('div', { className: 'modal-card' }, [
    el('div', { className: 'modal-header' }, [
      el('h2', { text: isEdit ? `Chỉnh sửa sản phẩm: ${product.MaSP}` : 'Thêm sản phẩm mới' }),
      closeBtn
    ]),
    modalForm,
    el('div', { className: 'modal-footer' }, [cancelBtn, submitBtn])
  ]);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
