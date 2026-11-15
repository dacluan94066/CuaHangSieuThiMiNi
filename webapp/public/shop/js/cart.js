import * as api from './api.js';
import { el, link, busy, errorBox } from './dom.js';
import { money, date } from './format.js';

export async function cartPage(ctx) {
  const { data: cart } = await api.get('/gio-hang');
  ctx.setCartCount(cart.soLuong);

  // Top header with title and Back to Shop link
  const root = el('div', { class: 'cart-page-wrap' },
    el('div', { class: 'section-heading cart-heading' },
      el('div', {},
        el('h1', { text: 'Giỏ hàng của bạn' }),
        el('p', { class: 'muted', text: `${cart.soMa} sản phẩm trong giỏ · Tổng cộng ${cart.soLuong} món` })
      ),
      link('← Tiếp tục mua sắm', '#/tim-kiem', 'cart-back-link')
    )
  );

  // Empty cart state
  if (!cart.items.length) {
    const emptyBox = el('div', { class: 'empty-cart-card' },
      el('div', { class: 'empty-cart-icon' },
        el('svg', { viewBox: '0 0 24 24', width: '72', height: '72', fill: 'none', stroke: '#da3011', 'stroke-width': '1.5' },
          el('path', { d: 'M3 3h2l2.5 12h12L21 7H5 M7 15l-1 3h13' }),
          el('circle', { cx: '8', cy: '21', r: '1' }),
          el('circle', { cx: '18', cy: '21', r: '1' })
        )
      ),
      el('h2', { text: 'Giỏ hàng của bạn đang trống' }),
      el('p', { class: 'muted', text: 'Chưa có sản phẩm nào được chọn. Hãy dạo quanh cửa hàng và chọn những món bạn thích nhé!' }),
      link('Khám phá sản phẩm ngay', '#/tim-kiem', 'button btn-shop-now')
    );
    root.append(emptyBox);
    return root;
  }

  const feedback = el('div');

  // Helper function to handle cart changes
  async function change(button, path, method, body) {
    feedback.replaceChildren();
    try {
      await busy(button, async () => {
        const result = await api.write(path, method, body);
        ctx.setCartCount(result.data.soLuong);
        ctx.toast('Đã cập nhật giỏ hàng.');
        await ctx.render();
      });
    } catch (error) {
      feedback.replaceChildren(errorBox(error));
    }
  }

  // Left column: Cart table header + item lines
  const cartLeft = el('div', { class: 'cart-left-col' });

  // Table header bar
  const tableHead = el('div', { class: 'cart-table-head' },
    el('span', { text: 'Sản phẩm' }),
    el('span', { text: 'Đơn giá' }),
    el('span', { text: 'Số lượng' }),
    el('span', { text: 'Thành tiền' }),
    el('span', { text: 'Xóa' })
  );
  cartLeft.append(tableHead);

  const lines = el('div', { class: 'cart-lines' });

  for (const item of cart.items) {
    const product = item.SanPham;
    const name = product?.TenSP || `Sản phẩm ${item.MaSP} không còn tồn tại`;

    // 1. Product thumbnail & info
    const thumb = el('div', { class: 'cart-item-thumb' },
      el('img', { src: product?.HinhAnh || `/images/products/${item.MaSP}.jpg`, alt: name })
    );

    const info = el('div', { class: 'cart-item-info' },
      el('span', { class: 'code-badge', text: item.MaSP }),
      el('h2', {}, product ? link(name, `#/san-pham/${encodeURIComponent(item.MaSP)}`) : name),
      el('div', { class: 'cart-item-meta' },
        product?.DonViTinh ? el('span', { text: `Đơn vị: ${product.DonViTinh}` }) : null,
        product?.HanSuDung ? el('span', { text: `· HSD: ${date(product.HanSuDung)}` }) : null
      )
    );

    const prodCol = el('div', { class: 'cart-item-prod' }, thumb, info);

    // 2. Unit price
    const priceCol = el('div', { class: 'cart-col-price', text: money(item.DonGia) });

    // 3. Quantity Stepper [-] [qty] [+]
    const minusBtn = el('button', {
      type: 'button',
      class: 'qty-btn minus',
      text: '−',
      'aria-label': 'Giảm số lượng',
      disabled: item.SoLuong <= 1
    });
    const plusBtn = el('button', {
      type: 'button',
      class: 'qty-btn plus',
      text: '+',
      'aria-label': 'Tăng số lượng',
      disabled: item.SoLuong >= 99
    });
    const qtyInput = el('input', {
      type: 'number',
      class: 'qty-input',
      value: item.SoLuong,
      min: '1',
      max: '99',
      'aria-label': 'Số lượng sản phẩm'
    });

    minusBtn.addEventListener('click', () => {
      if (item.SoLuong > 1) {
        change(minusBtn, `/gio-hang/items/${encodeURIComponent(item.MaSP)}`, 'PATCH', { soLuong: item.SoLuong - 1 });
      }
    });

    plusBtn.addEventListener('click', () => {
      if (item.SoLuong < 99) {
        change(plusBtn, `/gio-hang/items/${encodeURIComponent(item.MaSP)}`, 'PATCH', { soLuong: item.SoLuong + 1 });
      }
    });

    qtyInput.addEventListener('change', () => {
      const val = Math.max(1, Math.min(99, parseInt(qtyInput.value) || 1));
      if (val !== item.SoLuong) {
        change(qtyInput, `/gio-hang/items/${encodeURIComponent(item.MaSP)}`, 'PATCH', { soLuong: val });
      }
    });

    const stepper = el('div', { class: 'qty-stepper' }, minusBtn, qtyInput, plusBtn);
    const qtyCol = el('div', { class: 'cart-col-qty' }, stepper);

    // 4. Line total
    const totalCol = el('div', { class: 'cart-col-total', text: money(item.ThanhTien) });

    // 5. Delete button
    const removeBtn = el('button', {
      type: 'button',
      class: 'btn-delete-item',
      title: 'Xóa khỏi giỏ hàng',
      'aria-label': `Bỏ ${name} khỏi giỏ`
    }, el('span', { text: '🗑️' }));

    removeBtn.addEventListener('click', () => {
      if (confirm(`Bạn có chắc muốn xóa "${name}" khỏi giỏ hàng?`)) {
        change(removeBtn, `/gio-hang/items/${encodeURIComponent(item.MaSP)}`, 'DELETE');
      }
    });

    const actionCol = el('div', { class: 'cart-col-action' }, removeBtn);

    // Row article
    const article = el('article', { class: 'cart-item' }, prodCol, priceCol, qtyCol, totalCol, actionCol);

    // Warnings if any
    if (item.CanhBao && item.CanhBao.length) {
      const badgeBox = el('div', { class: 'cart-item-warnings' },
        ...item.CanhBao.map(text => el('span', { class: `badge ${item.HopLe ? 'warn' : 'error'}`, text }))
      );
      article.append(badgeBox);
    }

    lines.append(article);
  }

  cartLeft.append(lines);

  // Right column: Summary Card (Receipt style)
  const clearBtn = el('button', { type: 'button', class: 'btn-clear-cart', text: '🗑️ Xóa toàn bộ giỏ hàng' });
  clearBtn.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
      change(clearBtn, '/gio-hang', 'DELETE');
    }
  });

  const summary = el('aside', { class: 'cart-summary' },
    el('h2', { text: 'Tóm tắt đơn hàng' }),
    el('div', { class: 'summary-row' },
      el('span', { text: `Tạm tính (${cart.soLuong} món):` }),
      el('strong', { text: money(cart.tongTamTinh) })
    ),
    el('div', { class: 'summary-row' },
      el('span', { text: 'Phí giao hàng:' }),
      el('span', { class: 'free-shipping-tag', text: 'Miễn phí' })
    ),
    el('div', { class: 'summary-divider' }),
    el('div', { class: 'summary-total' },
      el('span', { class: 'total-label', text: 'Tổng thanh toán:' }),
      el('span', { class: 'total-price', text: money(cart.tongTamTinh) })
    ),
    el('p', { class: 'summary-vat', text: '(Đã bao gồm thuế & phí)' }),
    cart.coCanhBao ? el('div', { class: 'hint-box', text: '⚠️ Có sản phẩm cần kiểm tra lại trước khi tiếp tục đặt hàng.' }) : null,
    cart.coCanhBao ? null : link('Tiến hành đặt hàng →', '#/thanh-toan', 'button btn-checkout'),
    clearBtn,
    // Trust Badges
    el('div', { class: 'cart-trust-badges' },
      el('div', { class: 'trust-item' }, el('span', { text: '⚡' }), el('span', { text: 'Giao hàng siêu tốc trong 2 giờ' })),
      el('div', { class: 'trust-item' }, el('span', { text: '🛡️' }), el('span', { text: 'Kiểm tra hàng trước khi nhận' })),
      el('div', { class: 'trust-item' }, el('span', { text: '🔄' }), el('span', { text: 'Đổi trả miễn phí trong 7 ngày' }))
    )
  );

  root.append(feedback, el('div', { class: 'cart-layout' }, cartLeft, summary));
  return root;
}
