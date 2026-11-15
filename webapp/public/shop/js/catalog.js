import * as api from './api.js';
import { el, field, link, empty, busy, errorBox } from './dom.js';
import { money, date, conditionText } from './format.js';

export const SEARCH_HINT = 'Tìm theo mã hoặc tên sản phẩm';
function badges(product) {
  return el('div', { class: 'badges' }, el('span', { class: `badge ${product.SoLuongTon === 0 ? 'error' : product.SoLuongTon < 20 ? 'warn' : ''}`, text: product.TrangThaiTonKho }),
    ...product.CanhBao.filter(text => text !== product.TrangThaiTonKho).map(text => el('span', { class: 'badge warn', text })));
}
async function addToCart(product, quantity, button, feedback, ctx) {
  feedback.replaceChildren();
  try {
    await busy(button, async () => {
      const result = await api.write('/gio-hang/items', 'POST', { maSP: product.MaSP, soLuong: quantity });
      ctx.setCartCount(result.data.soLuong);
      ctx.toast(`Đã thêm ${product.TenSP}. Giỏ hàng có ${result.data.soLuong} sản phẩm.`);
    });
  } catch (error) { feedback.replaceChildren(errorBox(error)); }
}
function productImage(product) {
  const src = product.HinhAnh || `/images/products/${product.MaSP}.jpg`;
  const img = el('img', { src, alt: product.TenSP, loading: 'lazy' });
  img.addEventListener('error', () => { img.style.display = 'none'; });
  return el('div', { class: 'product-card-img' },
    el('a', { href: `#/san-pham/${encodeURIComponent(product.MaSP)}`, 'aria-label': product.TenSP }, img)
  );
}
function productCard(product, ctx) {
  const feedback = el('div');
  const add = el('button', { type: 'button', text: product.CoTheMua ? 'Thêm vào giỏ' : 'Hiện chưa thể mua', disabled: !product.CoTheMua });
  add.addEventListener('click', () => addToCart(product, 1, add, feedback, ctx));
  return el('article', { class: 'product-card' },
    productImage(product),
    el('div', { class: 'product-card-body' },
      el('p', { class: 'product-category', text: product.TenDM }),
      el('span', { class: 'code', text: product.MaSP }),
      el('h3', {}, link(product.TenSP, `#/san-pham/${encodeURIComponent(product.MaSP)}`)),
      el('p', { class: 'product-price', text: money(product.DonGiaBan) }),
      el('p', { class: 'product-meta', text: `Đơn vị: ${product.DonViTinh}` })
    ),
    el('div', { class: 'card-bottom' },
      badges(product),
      el('p', { class: 'product-meta', text: product.HanSuDung ? `Hạn dùng: ${date(product.HanSuDung)}` : 'Chưa có hạn sử dụng' }),
      add
    ),
    feedback
  );
}
export async function catalogPage(route, ctx) {
  const params = new URLSearchParams(route.query);
  if (!params.has('limit')) params.set('limit', '12');
  if (route.category) params.set('maDM', route.category);
  const response = await api.get(`/san-pham?${params}`);
  const categories = await ctx.categories();
  const title = route.home ? 'Chọn món cho ngày mới' : route.category ? (categories.find(item => item.MaDM === route.category)?.TenDM || 'Sản phẩm theo danh mục') : 'Tìm kiếm sản phẩm';
  const page = el('div');
  if (route.home) page.append(el('section', { class: 'hero' }, el('div', {}, el('p', { class: 'eyebrow', text: 'Cửa hàng của bạn' }),
    el('h1', { text: 'Mỗi ngày, chọn hàng thật gọn.' }), el('p', { text: 'Tra cứu giá, xem tồn kho và thêm những món bạn cần vào giỏ. Thông tin luôn được kiểm tra từ cửa hàng.' }),
    link('Khám phá sản phẩm', '#/tim-kiem', 'button')), el('div', { class: 'hero-aside' }, el('strong', { text: 'Chọn hàng theo nhu cầu' }),
      el('p', { text: 'Tìm bằng tên hoặc mã sản phẩm. Xem rõ giá, đơn vị và hạn sử dụng trước khi chọn.' }), link('Xem giỏ hàng của bạn', '#/gio-hang'))));
  page.append(el('div', { class: 'section-heading' }, el('div', {}, el(route.home ? 'h2' : 'h1', { text: title }), el('p', { class: 'muted', text: SEARCH_HINT }))));
  const filterForm = el('form');
  const q = el('input', { id: 'filter-q', name: 'q', type: 'search', maxlength: 100, value: params.get('q') || '', placeholder: SEARCH_HINT });
  const category = el('select', { id: 'filter-category', name: 'maDM' }, el('option', { value: '', text: 'Toàn bộ danh mục' }), ...categories.map(item => el('option', { value: item.MaDM, text: item.TenDM })));
  category.value = params.get('maDM') || '';
  const sort = el('select', { id: 'filter-sort', name: 'sort' }, ...[['ma-tang', 'Mã sản phẩm'], ['gia-tang', 'Giá tăng dần'], ['gia-giam', 'Giá giảm dần']].map(([value, text]) => el('option', { value, text })));
  sort.value = params.get('sort') || 'ma-tang';
  for (const item of [field('Từ khóa', q), field('Danh mục', category), field('Giá từ (₫)', el('input', { id: 'filter-min', name: 'giaTu', type: 'number', min: 0, step: 1, value: params.get('giaTu') || '' })),
    field('Giá đến (₫)', el('input', { id: 'filter-max', name: 'giaDen', type: 'number', min: 0, step: 1, value: params.get('giaDen') || '' })), field('Sắp xếp', sort)]) filterForm.append(item);
  filterForm.append(el('button', { type: 'submit', text: 'Áp dụng bộ lọc' }));
  filterForm.addEventListener('submit', event => {
    event.preventDefault(); const next = new URLSearchParams();
    for (const [key, value] of new FormData(filterForm)) if (String(value).trim()) next.set(key, String(value).trim());
    location.hash = `/tim-kiem?${next}`;
  });
  const results = el('section', { class: 'catalog-results', 'aria-label': 'Kết quả sản phẩm' }, el('div', { class: 'results-heading' },
    el('p', { class: 'muted', text: `${response.pagination.total} sản phẩm · Trang ${response.pagination.page}` })));
  if (response.data.length) results.append(el('div', { class: 'product-grid' }, ...response.data.map(product => productCard(product, ctx))));
  else results.append(empty(params.get('q') ? `Không có kết quả cho “${params.get('q')}”. ${SEARCH_HINT}; thử từ khóa khác hoặc bỏ bớt bộ lọc.` : 'Chưa có sản phẩm phù hợp bộ lọc.'));
  const { page: current, totalPages } = response.pagination;
  if (totalPages > 1) {
    const navigate = value => { const query = new URLSearchParams(params); query.set('page', String(value)); location.hash = `/tim-kiem?${query}`; };
    results.append(el('nav', { class: 'pagination', 'aria-label': 'Phân trang sản phẩm' },
      el('button', { class: 'secondary', disabled: current <= 1, text: 'Trước', onclick: () => navigate(current - 1) }),
      el('span', { text: `${current} / ${totalPages}` }), el('button', { class: 'secondary', disabled: current >= totalPages, text: 'Sau', onclick: () => navigate(current + 1) })));
  }
  page.append(el('div', { class: 'catalog-layout' }, el('aside', { class: 'panel filters', 'aria-label': 'Bộ lọc sản phẩm' }, el('h2', { text: 'Lọc sản phẩm' }), filterForm), results));
  if (route.home) {
    const section = el('section', { class: 'promotions' }, el('h2', { text: 'Ưu đãi đang có' }));
    try {
      const promotions = await api.get('/khuyen-mai');
      section.append(promotions.data.length ? el('div', { class: 'promotion-grid' }, ...promotions.data.map(item => el('article', { class: 'panel promotion' },
        el('span', { class: 'code', text: item.MaKM }), el('h3', { text: item.TenKM }), el('p', { text: `Mức giảm: ${item.LoaiKhuyenMai === 'Phần trăm' ? `${item.GiaTri}%` : money(item.GiaTri)}` }), el('p', { text: conditionText(item.DieuKien) }),
        el('p', { class: 'muted', text: `Ngày kết thúc (UTC): ${date(item.NgayKetThuc, true)}` }), el('p', { class: 'muted small', text: `Theo ngày: ${item.TrangThaiTinhToan} · Trạng thái gốc: ${item.TrangThai}` }),
        el('p', { class: 'muted small', text: item.CoDieuKienChuaHoTro ? 'Có điều kiện cần được kiểm tra thêm trước khi áp dụng.' : 'Điều kiện được kiểm tra trước khi áp dụng; không tự giảm giá trong giỏ.' })))) : empty('Hiện chưa có khuyến mãi có hiệu lực.', null));
    } catch (error) { section.append(errorBox(error)); }
    page.append(section);
  }
  return page;
}
export async function detailPage(code, ctx) {
  const { data: product } = await api.get(`/san-pham/${encodeURIComponent(code)}`);
  const page = el('div', {}, el('p', { class: 'breadcrumbs' }, link('Sản phẩm', '#/tim-kiem'), ' / ', product.TenSP));
  const facts = el('dl', { class: 'detail-list' });
  for (const [label, value] of [['Danh mục', product.TenDM], ['Đơn vị tính', product.DonViTinh], ['Tồn kho hiện có', product.SoLuongTon ?? 'Chưa xác định'], ['Trạng thái gốc', product.TrangThai], ['Hạn sử dụng', product.HanSuDung ? date(product.HanSuDung) : 'Chưa có hạn sử dụng'], ['Tình trạng hạn dùng', product.TrangThaiHanSuDung]]) facts.append(el('div', {}, el('dt', { text: label }), el('dd', { text: String(value) })));
  const feedback = el('div');
  const quantity = el('input', { id: 'detail-quantity', class: 'quantity', type: 'number', min: 1, max: Math.min(99, product.SoLuongTon || 99), step: 1, value: 1, required: true });
  const add = el('button', { type: 'submit', text: 'Thêm vào giỏ', disabled: !product.CoTheMua });
  const form = el('form', {}, field('Số lượng', quantity), add);
  form.addEventListener('submit', event => { event.preventDefault(); addToCart(product, Number(quantity.value), add, feedback, ctx); });
  const detailImg = el('div', { class: 'detail-img-box' },
    el('img', { src: product.HinhAnh || `/images/products/${product.MaSP}.jpg`, alt: product.TenSP })
  );
  page.append(el('div', { class: 'detail-layout' },
    el('section', { class: 'panel' },
      el('div', { class: 'detail-code' }, el('span', { class: 'code', text: product.MaSP }), badges(product)),
      el('div', { class: 'detail-main' },
        detailImg,
        el('div', { class: 'detail-info' }, el('h1', { text: product.TenSP }), facts)
      )
    ),
    el('section', { class: 'panel detail-buy', 'aria-label': 'Chọn sản phẩm' },
      el('p', { class: 'muted', text: 'Giá bán hiện tại' }),
      el('p', { class: 'product-price', text: money(product.DonGiaBan) }),
      form, feedback,
      el('p', { class: 'muted small', text: 'Thêm vào giỏ chưa giữ hàng hoặc tạo đơn. Giá và tồn sẽ được kiểm tra lại khi xem giỏ.' })
    )
  ));
  return page;
}
