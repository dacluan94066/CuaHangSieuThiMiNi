import * as api from './api.js';
import { el } from './dom.js';
import { money } from './format.js';

export function createQrPaymentBox(order, onPaidCallback) {
  const isPaid = (order.TrangThaiThanhToan || '').includes('Đã thanh toán');
  const qrUrl = `https://qr.sepay.vn/img?bank=MBBank&acc=1114110511&template=compact&amount=${order.ThanhTien}&des=${order.MaHD}`;

  const box = el('div', { class: 'qr-payment-card' });
  box.append(
    el('h3', { text: '📱 Quét mã VietQR để thanh toán tự động' }),
    el('p', { class: 'muted small', text: 'Mở ứng dụng ngân hàng bất kỳ (MBBank, Vietcombank, Techcombank, MoMo...) và quét mã QR bên dưới.' })
  );

  const imgWrap = el('div', { class: 'qr-img-wrapper' });
  const qrImg = el('img', { src: qrUrl, alt: `VietQR MBBank ${order.MaHD}` });
  imgWrap.append(qrImg);
  box.append(imgWrap);

  const detailsGrid = el('div', { class: 'qr-details-grid' });

  function makeItem(label, val, copyText) {
    const d = el('div', {}, el('span', { text: label }), el('strong', { text: String(val) }));
    if (copyText) {
      const copyBtn = el('span', { class: 'qr-copy-tag', text: '📋 Sao chép' });
      copyBtn.onclick = () => {
        navigator.clipboard?.writeText(String(copyText));
        copyBtn.innerText = '✓ Đã chép';
        setTimeout(() => { copyBtn.innerText = '📋 Sao chép'; }, 2000);
      };
      d.append(copyBtn);
    }
    return d;
  }

  detailsGrid.append(
    makeItem('Ngân hàng', 'MBBank (Quân Đội)'),
    makeItem('Chủ tài khoản', 'NGUYEN DAC LUAN'),
    makeItem('Số tài khoản', '1114110511', '1114110511'),
    makeItem('Số tiền thanh toán', money(order.ThanhTien), String(order.ThanhTien)),
    makeItem('Nội dung chuyển khoản (Bắt buộc)', order.MaHD, order.MaHD)
  );
  box.append(detailsGrid);

  const statusBox = el('div', {
    class: isPaid ? 'qr-status-paid' : 'qr-status-waiting',
    id: `qr-status-${order.MaHD}`
  },
    el('span', { text: isPaid ? '✓' : '⏳' }),
    el('span', { text: isPaid ? 'Đơn hàng đã được thanh toán thành công!' : 'Đang chờ hệ thống ghi nhận thanh toán... (Tự động xác nhận sau 1-3 giây khi chuyển tiền)' })
  );
  box.append(statusBox);

  if (!isPaid) {
    let pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/don-hang/${encodeURIComponent(order.MaHD)}`);
        if (res?.data && (res.data.TrangThaiThanhToan || '').includes('Đã thanh toán')) {
          clearInterval(pollInterval);
          statusBox.className = 'qr-status-paid';
          statusBox.innerHTML = '🎉 Đã nhận được thanh toán thành công qua MBBank! Cảm ơn bạn.';
          if (onPaidCallback) onPaidCallback(res.data);
        }
      } catch { /* ignore polling errors */ }
    }, 3000);

    window.addEventListener('hashchange', () => clearInterval(pollInterval), { once: true });
  }

  return box;
}
