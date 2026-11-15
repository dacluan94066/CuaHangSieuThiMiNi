import * as api from './api.js';
import { el, link } from './dom.js';
import { money, date } from './format.js';
import { createQrPaymentBox } from './sepay-qr.js';

async function ownRequest(path) {
  try {
    return await api.get(path);
  } catch (error) {
    if (error.status === 401) location.hash = '/dang-nhap?next=don-hang';
    throw error;
  }
}

export async function ordersPage(query) {
  const params = new URLSearchParams(query);
  if (!params.has('limit')) params.set('limit', '10');
  const result = await ownRequest(`/don-hang?${params}`);

  const root = el('section', { class: 'orders-page-wrap' });

  // Hero Heading
  const hero = el('div', { class: 'orders-hero' },
    el('div', {},
      el('h1', { class: 'orders-hero-title' },
        el('span', { text: '📦' }),
        el('span', { text: 'Đơn hàng của tôi' })
      ),
      el('p', { class: 'orders-hero-desc', text: `Quản lý và theo dõi ${result.pagination.total} đơn hàng trực tuyến của bạn tại MiniMart.` })
    ),
    link('← Tiếp tục chọn hàng', '#/tim-kiem', 'button secondary')
  );
  root.append(hero);

  if (!result.data.length) {
    const emptyView = el('div', { class: 'empty-orders-view' },
      el('div', { class: 'empty-orders-icon', text: '🛒' }),
      el('h2', { text: 'Bạn chưa có đơn hàng nào' }),
      el('p', { text: 'Khám phá ngay hàng trăm sản phẩm tiện lợi, đồ uống và thực phẩm tươi ngon mỗi ngày tại MiniMart!' }),
      link('Khám phá sản phẩm ngay →', '#/tim-kiem', 'button')
    );
    root.append(emptyView);
    return root;
  }

  // Filter Tab Bar
  const tabAll = el('span', { class: 'orders-tab-btn active' },
    el('span', { text: 'Tất cả đơn hàng' }),
    el('span', { class: 'orders-tab-count', text: String(result.pagination.total) })
  );
  const tabConfirmed = el('span', { class: 'orders-tab-btn' },
    el('span', { text: 'Đã xác nhận' })
  );
  const tabDone = el('span', { class: 'orders-tab-btn' },
    el('span', { text: 'Đã hoàn tất' })
  );
  root.append(el('div', { class: 'orders-tabs' }, tabAll, tabConfirmed, tabDone));

  // Orders List Container
  const listContainer = el('div', { class: 'orders-stack' });

  for (const order of result.data) {
    const card = el('article', { class: 'order-card-card' });

    // Top Bar
      let statusPillText = `✓ ${order.TrangThaiDon || 'Đã xác nhận'}`;
      let statusClass = 'order-status-pill';
      if ((order.TrangThaiThanhToan || '').includes('Chờ thanh toán')) {
        statusPillText = '⏳ Chờ quét mã QR';
        statusClass = 'order-status-pill pending';
      } else if (order.TrangThaiThanhToan === 'Đã thanh toán (SePay)') {
        statusPillText = '✓ Đã thanh toán (MBBank)';
      }
      const topBar = el('div', { class: 'order-top-bar' },
        el('div', { class: 'order-code-group' },
          el('span', { class: 'order-code-pill' },
            el('span', { text: '🧾' }),
            link(order.MaHD, `#/don-hang/${encodeURIComponent(order.MaHD)}`)
          ),
          el('span', { class: 'order-date-tag' },
            el('span', { text: '📅' }),
            el('span', { text: date(order.NgayLap) })
          )
        ),
        el('span', { class: statusClass, text: statusPillText })
      );

    // Items preview
    const itemsPreview = el('div', { class: 'order-items-preview' });
    const maxItems = 3;
    const itemsToShow = order.ChiTiet.slice(0, maxItems);

    for (const item of itemsToShow) {
      const img = el('img', {
        class: 'order-unit-thumb',
        src: `/images/products/${item.MaSP}.jpg`,
        alt: item.TenSP
      });
      img.onerror = () => { img.src = '/images/placeholder.svg'; };

      const itemRow = el('div', { class: 'order-item-unit' },
        img,
        el('div', { class: 'order-unit-meta' },
          el('h4', { class: 'order-unit-title', text: item.TenSP }),
          el('p', { class: 'order-unit-sub', text: `Mã SP: ${item.MaSP} · Số lượng: x${item.SoLuong} · Đơn giá: ${money(item.DonGia)}` })
        ),
        el('div', { class: 'order-unit-total', text: money(item.ThanhTien) })
      );
      itemsPreview.append(itemRow);
    }

    if (order.ChiTiet.length > maxItems) {
      itemsPreview.append(el('p', {
        class: 'muted small',
        style: 'text-align: center; margin: 4px 0 0;',
        text: `+ và ${order.ChiTiet.length - maxItems} sản phẩm khác`
      }));
    }

    // Shipping Destination Row
    const shipping = order.DiaChiGiao ? el('div', { class: 'order-dest-row' },
      el('span', { text: '📍 Giao đến:' }),
      el('strong', { text: `${order.DiaChiGiao.HoTenNguoiNhan || 'Khách hàng'} (${order.DiaChiGiao.SDTNguoiNhan || ''})` }),
      el('span', { text: `— ${order.DiaChiGiao.DiaChi || ''}` })
    ) : null;

    // Bottom Bar
    const bottomBar = el('div', { class: 'order-bottom-bar' },
      el('div', { class: 'order-bottom-info' },
        el('span', { class: 'order-badge-method', text: `💳 ${order.PhuongThucThanhToan}` }),
        el('span', { class: 'order-points-tag', text: `⭐ Tích lũy: +${order.DiemDuocCong || 0} điểm` })
      ),
      el('div', { class: 'order-bottom-actions' },
        el('div', { class: 'order-total-group' },
          el('span', { class: 'order-total-hint', text: 'Tổng thanh toán:' }),
          el('span', { class: 'order-total-sum', text: money(order.ThanhTien) })
        ),
        link('Xem chi tiết đơn →', `#/don-hang/${encodeURIComponent(order.MaHD)}`, 'order-btn-view')
      )
    );

    card.append(topBar, itemsPreview);
    if (shipping) card.append(shipping);
    card.append(bottomBar);

    listContainer.append(card);
  }

  root.append(listContainer);

  const { page, totalPages } = result.pagination;
  if (totalPages > 1) {
    const navigate = value => {
      const next = new URLSearchParams(params);
      next.set('page', String(value));
      location.hash = `/don-hang?${next}`;
    };
    root.append(
      el('nav', { class: 'pagination', 'aria-label': 'Phân trang đơn hàng' },
        el('button', { class: 'secondary', text: '← Trang trước', disabled: page <= 1, onclick: () => navigate(page - 1) }),
        el('span', { text: `Trang ${page} / ${totalPages}` }),
        el('button', { class: 'secondary', text: 'Trang sau →', disabled: page >= totalPages, onclick: () => navigate(page + 1) })
      )
    );
  }

  return root;
}

export async function orderDetailPage(code) {
  const { data: order } = await ownRequest(`/don-hang/${encodeURIComponent(code)}`);

  const root = el('section', { class: 'orders-page-wrap' });

  // Breadcrumbs
  root.append(
    el('p', { class: 'breadcrumbs' },
      link('🏠 Trang chủ', '#/'),
      ' / ',
      link('📋 Đơn hàng của tôi', '#/don-hang'),
      ' / ',
      el('strong', { text: order.MaHD })
    )
  );

  // Hero
  const hero = el('div', { class: 'orders-hero' },
    el('div', {},
      el('h1', { class: 'orders-hero-title' },
        el('span', { text: '🧾' }),
        el('span', { text: `Chi tiết đơn hàng #${order.MaHD}` })
      ),
      el('p', { class: 'orders-hero-desc', text: `Ngày đặt: ${date(order.NgayLap)} · Hình thức: ${order.PhuongThucThanhToan}` })
    ),
    el('span', { class: 'order-status-pill', style: 'font-size: 0.95rem; padding: 8px 16px;', text: `✓ ${order.TrangThaiDon || 'Đã xác nhận'}` })
  );
  root.append(hero);

  // Stepper Visual
  const stepper = el('div', { class: 'order-detail-stepper' },
    el('div', { class: 'step-node done' },
      el('div', { class: 'step-circle', text: '✓' }),
      el('span', { class: 'step-name', text: '1. Đặt hàng' }),
      el('span', { class: 'step-time', text: 'Đã hoàn tất' })
    ),
    el('div', { class: 'step-node active done' },
      el('div', { class: 'step-circle', text: '✓' }),
      el('span', { class: 'step-name', text: '2. Đã xác nhận' }),
      el('span', { class: 'step-time', text: 'Cửa hàng đã nhận' })
    ),
    el('div', { class: 'step-node' },
      el('div', { class: 'step-circle', text: '🚚' }),
      el('span', { class: 'step-name', text: '3. Đang giao hàng' }),
      el('span', { class: 'step-time', text: 'Đang đóng gói' })
    ),
    el('div', { class: 'step-node' },
      el('div', { class: 'step-circle', text: '📦' }),
      el('span', { class: 'step-name', text: '4. Đã nhận hàng' }),
      el('span', { class: 'step-time', text: 'Dự kiến 1-2 ngày' })
    )
  );
  root.append(stepper);

  // If bank transfer, show VietQR payment box
  if ((order.PhuongThucThanhToan || '').includes('Chuyển khoản')) {
    root.append(createQrPaymentBox(order, () => {
      // Reload page state on paid
      setTimeout(() => { location.reload(); }, 1500);
    }));
  }

  // Two-column layout: Left (Items + Shipping), Right (Payment Summary)
  const leftCol = el('div', { style: 'display: flex; flex-direction: column; gap: 20px;' });

  // Items Panel
  const itemsPanel = el('div', { class: 'order-detail-items-panel' },
    el('h2', {},
      el('span', { text: '🛍️' }),
      el('span', { text: 'Danh sách sản phẩm đã đặt' })
    )
  );

  const table = el('table', { class: 'order-detail-table' },
    el('caption', { class: 'sr-only', text: 'Danh sách sản phẩm trong hóa đơn' }),
    el('thead', {},
      el('tr', {},
        ...['Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền'].map(text => el('th', { scope: 'col', text }))
      )
    )
  );
  const tbody = el('tbody');

  for (const line of order.ChiTiet) {
    const img = el('img', {
      class: 'order-detail-thumb',
      src: `/images/products/${line.MaSP}.jpg`,
      alt: line.TenSP
    });
    img.onerror = () => { img.src = '/images/placeholder.svg'; };

    const prodCell = el('div', { class: 'order-detail-product-cell' },
      img,
      el('div', {},
        el('strong', { text: line.TenSP }),
        el('div', { class: 'muted small', text: `Mã SP: ${line.MaSP}` })
      )
    );

    tbody.append(
      el('tr', {},
        el('td', {}, prodCell),
        el('td', { style: 'text-align: center; font-weight: 600;', text: `x${line.SoLuong}` }),
        el('td', { style: 'white-space: nowrap;', text: money(line.DonGia) }),
        el('td', { style: 'white-space: nowrap; font-weight: 700; color: var(--primary);', text: money(line.ThanhTien) })
      )
    );
  }
  table.append(tbody);
  itemsPanel.append(table);
  leftCol.append(itemsPanel);

  // Shipping Card
  if (order.DiaChiGiao) {
    const shippingCard = el('div', { class: 'order-detail-shipping-card' },
      el('h2', {},
        el('span', { text: '📍' }),
        el('span', { text: 'Địa chỉ nhận hàng' })
      ),
      el('div', { class: 'shipping-info-grid' },
        el('div', { class: 'shipping-info-item' },
          el('small', { text: 'Họ tên người nhận' }),
          el('strong', { text: order.DiaChiGiao.HoTenNguoiNhan || 'Chưa cập nhật' })
        ),
        el('div', { class: 'shipping-info-item' },
          el('small', { text: 'Số điện thoại' }),
          el('strong', { text: order.DiaChiGiao.SDTNguoiNhan || 'Chưa cập nhật' })
        ),
        el('div', { class: 'shipping-info-item', style: 'grid-column: 1 / -1;' },
          el('small', { text: 'Địa chỉ giao hàng chi tiết' }),
          el('strong', { text: order.DiaChiGiao.DiaChi || 'Chưa cập nhật' })
        )
      )
    );
    leftCol.append(shippingCard);
  }

  // Right Column: Summary
  const rightCol = el('aside', { class: 'order-detail-summary-card' },
    el('h2', { text: '💳 Thông tin thanh toán' }),
    el('div', { class: 'sum' },
      el('span', { text: 'Tiền hàng' }),
      el('strong', { text: money(order.TongTien) })
    ),
    el('div', { class: 'sum' },
      el('span', { text: 'Giảm giá' }),
      el('strong', { text: order.GiamGia ? `-${money(order.GiamGia)}` : '0 đ' })
    ),
    el('div', { class: 'sum' },
      el('span', { text: 'Phí giao hàng' }),
      el('strong', { style: 'color: #107e3e;', text: 'Miễn phí' })
    ),
    el('div', { class: 'sum total' },
      el('span', { text: 'Tổng thanh toán' }),
      el('strong', { text: money(order.ThanhTien) })
    ),
    el('div', { style: 'margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 8px;' },
      order.MaKM ? el('p', { class: 'badge', text: `Mã ưu đãi: ${order.MaKM}` }) : null,
      el('p', { class: 'muted small', text: `Phương thức: ${order.PhuongThucThanhToan}` }),
      el('p', { class: 'muted small', text: `Trạng thái: ${(order.TrangThaiThanhToan || '').replace(' giả lập', '')}` }),
      el('p', { style: 'color: #d97706; font-weight: 600; font-size: 0.88rem;', text: `⭐ Tích lũy: +${order.DiemDuocCong || 0} điểm MiniMart Rewards` })
    ),
    el('div', { style: 'margin-top: 24px; display: flex; flex-direction: column; gap: 10px;' },
      link('← Quay lại danh sách đơn', '#/don-hang', 'button secondary', { style: 'width: 100%; text-align: center;' }),
      link('Tiếp tục mua sắm →', '#/tim-kiem', 'button', { style: 'width: 100%; text-align: center;' })
    )
  );

  const layout = el('div', { class: 'cart-layout' }, leftCol, rightCol);
  root.append(layout);

  return root;
}
