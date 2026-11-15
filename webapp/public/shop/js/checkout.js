import * as api from './api.js';
import { el, field, link, busy, errorBox } from './dom.js';
import { money, date } from './format.js';
import { createQrPaymentBox } from './sepay-qr.js';

function totals(value) {
  const v = value?.bill || value || {};
  return el('div', { class: 'checkout-totals' },
    ...[
      ['Tiền hàng', v.TongTien ?? 0],
      ['Giảm giá', v.GiamGia ?? 0],
      ['Tổng thanh toán', v.ThanhTien ?? 0]
    ].map(([label, amount]) => el('p', { class: 'sum' },
      el('span', { text: label }),
      el('strong', { text: money(amount) })
    )),
    el('p', { class: 'muted small', text: `Điểm tích lũy dự kiến: +${v.DiemDuocCong ?? 0} điểm` })
  );
}

function lines(items) {
  const list = Array.isArray(items) ? items : [];
  return el('div', { class: 'cart-lines checkout-lines' },
    ...list.map(item => el('article', { class: 'checkout-item-line' },
      el('strong', { text: item.TenSP }),
      el('p', { class: 'muted small', text: `${item.MaSP} · Số lượng: ${item.SoLuong} × ${money(item.DonGia)} = ${money(item.ThanhTien)}` })
    ))
  );
}

export async function checkoutPage(ctx) {
  const session = await api.getSession();
  if (!session.authenticated) {
    location.hash = '/dang-nhap?next=thanh-toan';
    return el('p', { text: 'Vui lòng đăng nhập để tiến hành đặt hàng.' });
  }

  const storageKey = `minimart.checkout.${session.customer.MaKH}`;
  let attempt;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved?.key && saved?.quoteId) attempt = saved;
  } catch { /* malformed local state is not sent */ }

  const root = el('div', { class: 'checkout-page-wrap' },
    el('div', { class: 'section-heading' },
      el('div', {},
        el('h1', { text: 'Xác nhận đơn hàng & Thanh toán' }),
        el('p', { class: 'muted', text: 'Vui lòng kiểm tra địa chỉ và chọn hình thức thanh toán thuận tiện nhất.' })
      ),
      link('← Quay lại giỏ hàng', '#/gio-hang', 'cart-back-link')
    )
  );

  const feedback = el('div');
  const quotePanel = el('section', { class: 'panel summary cart-summary', 'aria-label': 'Báo giá' },
    el('h2', { text: '📋 Báo giá đơn hàng' }),
    el('p', { class: 'muted', text: 'Nhập thông tin nhận hàng và nhấn "Xem báo giá" để kiểm tra trước khi xác nhận đặt hàng.' })
  );

  const progress = el('section', { class: 'panel', hidden: true, 'aria-label': 'Trạng thái yêu cầu' });
  const form = el('form', { class: 'panel checkout-form' }, el('h2', { text: '📍 Thông tin nhận hàng' }));

  // Input fields with validation
  const nameInput = el('input', {
    id: 'checkout-name',
    name: 'name',
    value: session.customer.HoTen || '',
    autocomplete: 'name',
    minlength: 2,
    maxlength: 100,
    required: true,
    placeholder: 'Nhập họ và tên người nhận'
  });

  const phoneInput = el('input', {
    id: 'checkout-phone',
    name: 'phone',
    value: session.customer.SDT || '',
    type: 'tel',
    autocomplete: 'tel',
    maxlength: 15,
    required: true,
    placeholder: 'Ví dụ: 0912345678 (10 số)'
  });

  const addressInput = el('input', {
    id: 'checkout-address',
    name: 'address',
    value: session.customer.DiaChi || '',
    autocomplete: 'street-address',
    minlength: 3,
    maxlength: 500,
    required: true,
    placeholder: 'Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố'
  });

  const couponInput = el('input', {
    id: 'checkout-coupon',
    name: 'coupon',
    maxlength: 50,
    placeholder: 'Nhập mã nếu có (ví dụ: KM01)'
  });

  const methodSelect = el('select', { id: 'checkout-method', name: 'method', required: true },
    el('option', { value: 'Thanh toán khi nhận hàng (COD)', text: '💵 Thanh toán khi nhận hàng (COD)' }),
    el('option', { value: 'Chuyển khoản', text: '🏦 Chuyển khoản ngân hàng (QR Code)' })
  );

  form.append(
    field('Người nhận hàng *', nameInput),
    field('Số điện thoại nhận hàng * (bắt buộc)', phoneInput, 'Số điện thoại gồm 10 chữ số bắt đầu bằng số 0, không được để trống.'),
    field('Địa chỉ giao hàng cụ thể * (bắt buộc)', addressInput, 'Vui lòng nhập địa chỉ nhận hàng chi tiết, không được để trống.'),
    field('Mã khuyến mãi (không bắt buộc)', couponInput, 'Ưu đãi sẽ được tự động tính vào hóa đơn nếu thỏa điều kiện.'),
    field('Phương thức thanh toán', methodSelect)
  );

  const preview = el('button', { type: 'submit', class: 'button btn-checkout', text: 'Xem báo giá & Tính tiền →' });
  form.append(preview);

  function lockForm(locked) {
    for (const input of form.querySelectorAll('input,select,button')) input.disabled = locked;
  }

  function clearAttempt() {
    attempt = undefined;
    sessionStorage.removeItem(storageKey);
    progress.hidden = true;
    lockForm(false);
  }

  async function displayResult(result) {
    if (result.trangThai === 'HOAN_TAT' && result.hoaDon) {
      const order = result.hoaDon;
      clearAttempt();
      await ctx.refreshHeader();

      const isBankTransfer = (order.PhuongThucThanhToan || '').includes('Chuyển khoản');
      const qrBox = isBankTransfer ? createQrPaymentBox(order) : null;

      root.replaceChildren(
        el('section', { class: 'panel profile' },
          el('p', { class: 'eyebrow', text: '🎉 Đặt hàng thành công' }),
          el('h1', { text: `Mã hóa đơn: ${order.MaHD}` }),
          el('p', { text: `Ngày đặt: ${date(order.NgayLap)} · Trạng thái: ${order.TrangThaiDon || 'Đã xác nhận'}` }),
          lines(order.ChiTiet),
          totals(order),
          el('p', { text: `Hình thức thanh toán: ${order.PhuongThucThanhToan}` }),
          ...(qrBox ? [qrBox] : []),
          el('p', { class: 'muted', text: isBankTransfer ? 'Vui lòng quét mã VietQR ở trên để chuyển khoản. Hệ thống SePay sẽ tự động duyệt đơn ngay khi nhận được tiền.' : 'Cảm ơn bạn đã mua hàng tại MiniMart! Đơn hàng của bạn đã được ghi nhận và đang được đóng gói giao sớm.' }),
          el('div', { class: 'profile-actions' },
            link('Xem chi tiết đơn hàng', `#/don-hang/${encodeURIComponent(order.MaHD)}`, 'button'),
            link('Tiếp tục mua sắm', '#/tim-kiem', 'button secondary')
          )
        )
      );
      return true;
    }
    if (result.trangThai === 'THAT_BAI') {
      clearAttempt();
      feedback.replaceChildren(errorBox(new Error(result.error?.message || 'Yêu cầu không thể hoàn tất. Vui lòng thử lại.')));
      return true;
    }
    return false;
  }

  function pendingMessage(message) {
    lockForm(true);
    progress.hidden = false;
    const retry = el('button', { type: 'button', class: 'button secondary', text: 'Kiểm tra lại trạng thái đơn hàng' });
    retry.addEventListener('click', () => busy(retry, resume));
    progress.replaceChildren(
      el('h2', { text: 'Đang xử lý đơn hàng' }),
      el('p', { text: message }),
      el('p', { class: 'code', text: `Mã giao dịch: ${attempt.key}` }),
      retry
    );
  }

  async function send() {
    if (!attempt) return;
    pendingMessage('Đơn hàng đang được hệ thống xử lý, vui lòng chờ trong giây lát…');
    try {
      const result = await api.write('/don-hang', 'POST', { maBaoGia: attempt.quoteId }, { idempotencyKey: attempt.key });
      if (!await displayResult(result.data)) {
        pendingMessage('Cửa hàng đang hoàn tất xử lý. Bạn có thể kiểm tra lại kết quả.');
      }
    } catch (error) {
      feedback.replaceChildren(errorBox(error));
      try {
        const result = await api.get(`/yeu-cau-dat-hang/${encodeURIComponent(attempt.key)}`);
        if (await displayResult(result.data)) return;
      } catch (statusError) {
        if (statusError.status === 404 && [400, 409].includes(error.status) && !['IDEMPOTENCY_CONFLICT', 'QUOTE_ALREADY_USED'].includes(error.code)) {
          clearAttempt();
          return;
        }
      }
      pendingMessage('Chưa xác định chắc chắn kết quả. Mã được giữ nguyên để gửi lại an toàn.');
    }
  }

  async function resume() {
    try {
      const result = await api.get(`/yeu-cau-dat-hang/${encodeURIComponent(attempt.key)}`);
      if (await displayResult(result.data)) return;
    } catch (error) {
      if (error.status !== 404) {
        feedback.replaceChildren(errorBox(error));
        return;
      }
    }
    await send();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    feedback.replaceChildren();

    const values = Object.fromEntries(new FormData(form));

    // Ràng buộc kiểm tra phía client: SĐT và Địa chỉ không thể để trống
    const name = String(values.name || '').trim();
    const rawPhone = String(values.phone || '').trim();
    const phone = rawPhone.replace(/[\s.\-]/g, '').replace(/^\+84/, '0');
    const address = String(values.address || '').trim();

    if (!name || name.length < 2) {
      feedback.replaceChildren(errorBox(new Error('Vui lòng nhập họ tên người nhận hàng (tối thiểu 2 ký tự).')));
      nameInput.focus();
      return;
    }

    if (!phone || !/^0\d{9}$/.test(phone)) {
      feedback.replaceChildren(errorBox(new Error('Số điện thoại không được để trống và phải gồm đúng 10 chữ số bắt đầu bằng số 0 (ví dụ: 0987686441).')));
      phoneInput.focus();
      return;
    }

    if (!address || address.length < 3) {
      feedback.replaceChildren(errorBox(new Error('Địa chỉ giao hàng không được để trống. Vui lòng nhập địa chỉ nhận hàng cụ thể.')));
      addressInput.focus();
      return;
    }

    try {
      await busy(preview, async () => {
        const { data: quote } = await api.write('/thanh-toan/xem-truoc', 'POST', {
          diaChiGiao: {
            hoTenNguoiNhan: name,
            sdtNguoiNhan: phone,
            diaChi: address
          },
          phuongThuc: values.method,
          ...(values.coupon?.trim() ? { maKM: values.coupon.trim() } : {})
        });

        const finalAmount = quote.ThanhTien ?? quote.bill?.ThanhTien ?? 0;
        const confirm = el('button', {
          type: 'button',
          class: 'button btn-checkout',
          text: `Xác nhận đặt hàng (${money(finalAmount)}) →`
        });

        confirm.addEventListener('click', async () => {
          if (!attempt) {
            attempt = { quoteId: quote.maBaoGia, key: crypto.randomUUID() };
            try {
              sessionStorage.setItem(storageKey, JSON.stringify(attempt));
            } catch {
              attempt = undefined;
              feedback.replaceChildren(errorBox(new Error('Không lưu được phiên đặt hàng. Vui lòng kiểm tra quyền lưu trữ trình duyệt.')));
              return;
            }
          }
          confirm.disabled = true;
          await send();
        });

        quotePanel.replaceChildren(
          el('h2', { text: '🧾 Chi tiết báo giá' }),
          lines(quote.ChiTiet),
          totals(quote),
          el('p', { class: 'muted small', text: `Phương thức: ${quote.PhuongThucThanhToan || quote.PhuongThuc || values.method}` }),
          quote.KhuyenMai ? el('p', { class: 'badge', text: `Đã áp dụng mã: ${quote.KhuyenMai.MaKM} (${quote.KhuyenMai.TenKM})` }) : el('p', { class: 'muted small', text: 'Không áp dụng mã khuyến mãi.' }),
          confirm
        );
      });
    } catch (error) {
      feedback.replaceChildren(errorBox(error));
    }
  });

  form.addEventListener('input', () => {
    if (!attempt) {
      quotePanel.replaceChildren(
        el('h2', { text: '📋 Báo giá đơn hàng' }),
        el('p', { text: 'Thông tin nhận hàng đã thay đổi. Vui lòng nhấn "Xem báo giá & Tính tiền" để cập nhật lại.' })
      );
    }
  });

  root.append(feedback, progress, el('div', { class: 'cart-layout' }, form, quotePanel));
  if (attempt) pendingMessage('Có yêu cầu đặt hàng đang chờ xử lý. Nhấn kiểm tra để hoàn tất.');
  return root;
}
