import * as api from './api.js';
import { el, field, link, busy, errorBox } from './dom.js';
import { date } from './format.js';
import { LOGIN_SUCCESS, REGISTER_SUCCESS, loginFeedback } from './auth-ui.js';

export async function authPage(register, ctx) {
  const feedback = el('div');
  const form = el('form', { class: 'panel auth-form' },
    el('p', { class: 'auth-audience', text: 'Cổng khách hàng' }),
    el('h1', { text: register ? 'Tạo tài khoản khách hàng' : 'Đăng nhập khách hàng' }),
    el('p', { class: 'muted small', text: register ? 'Đăng ký bằng số điện thoại chưa có trong hệ thống.' : 'Dùng số điện thoại đã đăng ký để tiếp tục với giỏ hàng của bạn.' }));
  if (register) form.append(field('Họ và tên', el('input', { id: 'auth-name', name: 'hoTen', autocomplete: 'name', maxlength: 100, required: true })));
  form.append(field('Số điện thoại khách hàng', el('input', { id: 'auth-phone', name: 'sdt', type: 'tel', inputmode: 'tel', autocomplete: 'username', maxlength: 40, required: true }), 'Ví dụ: 0901234567 hoặc +84 901 234 567. Không nhập tên tài khoản nhân viên.'),
    field('Mật khẩu', el('input', { id: 'auth-password', name: 'matKhau', type: 'password', autocomplete: register ? 'new-password' : 'current-password', required: true }), 'Từ 12 đến 128 ký tự. Giữ nguyên cả khoảng trắng nếu có.'));
  if (register) {
    form.append(field('Email (không bắt buộc)', el('input', { id: 'auth-email', name: 'email', type: 'email', maxlength: 254, autocomplete: 'email' })),
      field('Địa chỉ (không bắt buộc)', el('input', { id: 'auth-address', name: 'diaChi', maxlength: 500, autocomplete: 'street-address' })),
      el('p', { class: 'hint-box', text: 'Tài khoản mới không tự liên kết với hồ sơ khách cũ chỉ dựa trên SĐT. Điểm khởi đầu là 0.' }));
  }
  const submit = el('button', { type: 'submit', text: register ? 'Đăng ký' : 'Đăng nhập' });
  form.append(feedback, submit,
    el('p', { class: 'after-form' }, register ? 'Đã có tài khoản khách hàng? ' : 'Chưa có tài khoản khách hàng? ', link(register ? 'Đăng nhập' : 'Đăng ký', register ? '#/dang-nhap' : '#/dang-ky')),
    el('div', { class: 'auth-switch' },
      el('strong', { text: 'Bạn là nhân viên hoặc quản trị?' }),
      el('span', { text: 'Dùng tên đăng nhập tại cổng quản trị.' }),
      link('Đăng nhập trang quản trị', '/#/dang-nhap', 'button secondary')));
  form.addEventListener('submit', async event => {
    event.preventDefault(); feedback.replaceChildren();
    const body = Object.fromEntries([...new FormData(form)].filter(([, value]) => value !== ''));
    if ([...body.matKhau].length < 12 || [...body.matKhau].length > 128) { feedback.append(errorBox(register ? new Error('Mật khẩu cần từ 12 đến 128 ký tự.') : loginFeedback())); return; }
    try {
      await busy(submit, async () => {
        if (register) {
          await api.write('/auth/dang-ky', 'POST', body);
          ctx.toast(REGISTER_SUCCESS); location.hash = '/dang-nhap';
        } else {
          await api.login(body);
          // Authentication succeeded even if the following cart/header read fails.
          try { await ctx.refreshHeader(); } catch { /* The destination page can retry its own read. */ }
          ctx.toast(LOGIN_SUCCESS);
          const next = new URLSearchParams(location.hash.split('?')[1] || '').get('next');
          location.hash = ['thanh-toan', 'don-hang'].includes(next) ? `/${next}` : '/gio-hang';
        }
        form.elements.matKhau.value = '';
      });
    } catch (error) { feedback.replaceChildren(errorBox(register ? error : loginFeedback(error))); }
  });
  return el('div', { class: 'auth-layout' }, el('section', { class: 'auth-intro' }, el('p', { class: 'eyebrow', text: 'Tài khoản MiniMart' }),
    el('h2', { text: 'Chọn hàng thuận tiện, xem thông tin rõ ràng.' }), el('p', { text: 'Giỏ của bạn được giữ khi đăng nhập trong cùng phiên. Khi server khởi động lại, bạn cần đăng nhập và chọn hàng lại.' }), link('Tiếp tục xem sản phẩm', '#/tim-kiem')), form);
}
export async function accountPage(ctx) {
  let customer;
  try { customer = (await api.get('/tai-khoan')).data; }
  catch (error) { if (error.status === 401) { location.hash = '/dang-nhap'; return el('p', { text: 'Đang chuyển đến đăng nhập…' }); } throw error; }

  const feedback = el('div');

  // Tạo avatar từ 2 chữ cái viết tắt của tên
  const initials = (customer.HoTen || 'KH')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  // 1. Thẻ Header Profile (Banner phong cách E-commerce)
  const avatar = el('div', { class: 'account-avatar', text: initials });
  const nameInfo = el('div', { class: 'account-user-meta' },
    el('div', { class: 'account-name-row' },
      el('h1', { text: customer.HoTen }),
      el('span', { class: 'badge-membership', text: '⭐ Thành viên thân thiết' })
    ),
    el('p', { class: 'account-submeta', text: `Tham gia ngày ${date(customer.NgayDangKy)} · Khách hàng Siêu thị Mini` })
  );

  const headerCard = el('div', { class: 'account-header-card' },
    el('div', { class: 'account-profile-main' }, avatar, nameInfo),
    el('div', { class: 'account-stats-row' },
      el('div', { class: 'stat-box' },
        el('div', { class: 'stat-icon' }, el('span', { text: '🎁' })),
        el('div', { class: 'stat-content' },
          el('span', { class: 'stat-label', text: 'Điểm tích lũy' }),
          el('strong', { class: 'stat-value', text: `${customer.DiemTichLuy ?? 0} điểm` })
        )
      ),
      el('a', { href: '#/don-hang', class: 'stat-box stat-clickable' },
        el('div', { class: 'stat-icon' }, el('span', { text: '📦' })),
        el('div', { class: 'stat-content' },
          el('span', { class: 'stat-label', text: 'Lịch sử mua sắm' }),
          el('strong', { class: 'stat-value highlight', text: 'Xem đơn hàng →' })
        )
      ),
      el('a', { href: '#/gio-hang', class: 'stat-box stat-clickable' },
        el('div', { class: 'stat-icon' }, el('span', { text: '🛒' })),
        el('div', { class: 'stat-content' },
          el('span', { class: 'stat-label', text: 'Giỏ hàng hiện có' }),
          el('strong', { class: 'stat-value highlight', text: 'Mở giỏ hàng →' })
        )
      )
    )
  );

  // 2. Thẻ bên trái: Thông tin cá nhân & Liên hệ
  const infoCard = el('div', { class: 'panel account-card' },
    el('h2', { class: 'account-card-title', text: '👤 Thông tin tài khoản' }),
    el('div', { class: 'account-field-list' },
      el('div', { class: 'account-field-item' },
        el('span', { class: 'field-label', text: 'Số điện thoại' }),
        el('div', { class: 'field-val-row' },
          el('strong', { class: 'field-val', text: customer.SDT }),
          el('span', { class: 'verified-tag', text: '✓ Đã kích hoạt' })
        )
      ),
      el('div', { class: 'account-field-item' },
        el('span', { class: 'field-label', text: 'Email' }),
        el('strong', { class: 'field-val', text: customer.Email || 'Chưa cập nhật' })
      ),
      el('div', { class: 'account-field-item' },
        el('span', { class: 'field-label', text: 'Địa chỉ giao hàng' }),
        el('strong', { class: 'field-val', text: customer.DiaChi || 'Chưa cập nhật' })
      ),
      el('div', { class: 'account-field-item' },
        el('span', { class: 'field-label', text: 'Mã khách hàng' }),
        el('code', { class: 'account-code-box', text: customer.MaKH })
      )
    )
  );

  // 3. Thẻ bên phải: Tiện ích & Lối tắt
  const logoutBtn = el('button', { type: 'button', class: 'btn-logout', text: '🚪 Đăng xuất tài khoản' });
  logoutBtn.addEventListener('click', async () => {
    if (confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản này?')) {
      try { await busy(logoutBtn, () => ctx.logout()); }
      catch (error) { feedback.replaceChildren(errorBox(error)); }
    }
  });

  const actionsCard = el('div', { class: 'panel account-card' },
    el('h2', { class: 'account-card-title', text: '⚡ Tiện ích & Lối tắt' }),
    el('div', { class: 'account-shortcuts' },
      el('a', { href: '#/don-hang', class: 'shortcut-item' },
        el('div', { class: 'shortcut-icon' }, el('span', { text: '📦' })),
        el('div', { class: 'shortcut-text' },
          el('strong', { text: 'Đơn hàng của tôi' }),
          el('p', { text: 'Theo dõi tình trạng đơn và lịch sử mua sắm' })
        ),
        el('span', { class: 'shortcut-chevron', text: '›' })
      ),
      el('a', { href: '#/gio-hang', class: 'shortcut-item' },
        el('div', { class: 'shortcut-icon' }, el('span', { text: '🛒' })),
        el('div', { class: 'shortcut-text' },
          el('strong', { text: 'Giỏ hàng của tôi' }),
          el('p', { text: 'Xem các món đã chọn và thanh toán đơn hàng' })
        ),
        el('span', { class: 'shortcut-chevron', text: '›' })
      ),
      el('a', { href: '#/tim-kiem', class: 'shortcut-item' },
        el('div', { class: 'shortcut-icon' }, el('span', { text: '🏷️' })),
        el('div', { class: 'shortcut-text' },
          el('strong', { text: 'Mua sắm sản phẩm' }),
          el('p', { text: 'Khám phá hơn 20 sản phẩm tiêu dùng thiết yếu' })
        ),
        el('span', { class: 'shortcut-chevron', text: '›' })
      )
    ),
    el('div', { class: 'account-card-footer' }, logoutBtn)
  );

  return el('div', { class: 'account-dashboard-wrap' },
    headerCard,
    feedback,
    el('div', { class: 'account-grid' }, infoCard, actionsCard)
  );
}
