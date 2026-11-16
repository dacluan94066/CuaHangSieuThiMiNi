import { el } from '../ui.js';
import { loginAdmin } from '../auth-session.js';

export function renderLogin(root, onSuccess, message = '') {
  // Inputs
  const username = el('input', {
    id: 'admin-username',
    name: 'tenDangNhap',
    type: 'text',
    autoComplete: 'username',
    maxLength: 64,
    required: true,
    placeholder: 'Nhập tên đăng nhập nhân sự...'
  });

  const password = el('input', {
    id: 'admin-password',
    name: 'matKhau',
    type: 'password',
    autoComplete: 'current-password',
    maxLength: 256,
    required: true,
    placeholder: 'Nhập mật khẩu...'
  });

  let showPwd = false;
  const eyeBtn = el('button', {
    type: 'button',
    className: 'btn-toggle-eye',
    title: 'Hiện/ẩn mật khẩu'
  });
  eyeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  eyeBtn.addEventListener('click', () => {
    showPwd = !showPwd;
    password.type = showPwd ? 'text' : 'password';
    eyeBtn.innerHTML = showPwd
      ? `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });

  const feedback = el('div', { className: 'login-alert', role: 'alert', tabIndex: -1, hidden: !message });
  if (message) feedback.textContent = message;

  const submit = el('button', {
    type: 'submit',
    className: 'button primary login-submit-btn'
  });
  submit.innerHTML = `<span>Đăng nhập hệ thống</span><svg viewBox="0 0 24 24"><path d="M5 12h14 M12 5l7 7-7 7"/></svg>`;

  // Quick fill helper
  function fillAccount(u, p) {
    username.value = u;
    password.value = p;
    feedback.hidden = true;
    submit.focus();
  }

  // Demo pills
  const demoPills = [
    { name: 'Quản trị', user: 'admin', pass: 'admin123', color: '#dc2626' },
    { name: 'Thu ngân', user: 'thungan_mai', pass: 'mai123', color: '#2563eb' },
    { name: 'Kho hàng', user: 'kho_tram', pass: 'tram123', color: '#d97706' },
    { name: 'Bán hàng', user: 'banhang_khang', pass: 'khang123', color: '#16a34a' }
  ].map(item => {
    return el('button', {
      type: 'button',
      className: 'demo-pill-btn',
      title: `Nhấp để tự điền tài khoản ${item.name} (${item.user})`,
      onClick: () => fillAccount(item.user, item.pass)
    }, [
      el('span', { className: 'demo-pill-dot', style: `background: ${item.color};` }),
      el('div', {}, [
        el('strong', { text: item.name }),
        el('small', { text: item.user })
      ])
    ]);
  });

  // Left Hero column
  const heroCol = el('div', { className: 'login-hero' }, [
    el('div', {}, [
      el('div', { className: 'login-hero-brand' }, [
        el('span', { className: 'login-hero-logo' }, [
          el('svg', { viewBox: '0 0 24 24' }, [
            el('path', { d: 'M5 8h14l1 12H4L5 8Z M8 8V6a4 4 0 0 1 8 0v2 M9 12h.01 M15 12h.01' })
          ])
        ]),
        el('div', {}, [
          el('div', { className: 'login-hero-title', text: 'MiniMart.' }),
          el('span', { className: 'login-hero-badge', text: 'HỆ THỐNG QUẢN LÝ BÁN LẺ' })
        ])
      ]),
      el('h2', { className: 'login-hero-heading', text: 'Nền tảng vận hành siêu thị hiện đại & toàn diện.' }),
      el('p', { className: 'login-hero-desc', text: 'Tối ưu quy trình bán hàng tại quầy POS, quản trị kho hàng thông minh, tự động hóa đơn hàng trực tuyến và báo cáo doanh thu đa chiều trên cơ sở dữ liệu MongoDB.' }),
      el('div', { className: 'login-features' }, [
        el('div', { className: 'login-feature-item' }, [
          el('span', { className: 'login-feature-icon' }, [
            el('svg', { viewBox: '0 0 24 24' }, [
              el('circle', { cx: '9', cy: '21', r: '1' }),
              el('circle', { cx: '20', cy: '21', r: '1' }),
              el('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' })
            ])
          ]),
          el('div', { className: 'login-feature-meta' }, [
            el('strong', { text: 'Bán hàng & Thu ngân POS' }),
            el('small', { text: 'Quản lý giỏ hàng, tích điểm thành viên, áp dụng mã coupon giảm giá' })
          ])
        ]),
        el('div', { className: 'login-feature-item' }, [
          el('span', { className: 'login-feature-icon' }, [
            el('svg', { viewBox: '0 0 24 24' }, [
              el('rect', { x: '3', y: '3', width: '7', height: '7' }),
              el('rect', { x: '14', y: '3', width: '7', height: '7' }),
              el('rect', { x: '3', y: '14', width: '7', height: '7' }),
              el('path', { d: 'M14 14h3v3h-3z M20 14h1v1h-1z M14 20h1v1h-1z M17 17h4v4h-4z' })
            ])
          ]),
          el('div', { className: 'login-feature-meta' }, [
            el('strong', { text: 'Đơn hàng Online & Thanh toán QR' }),
            el('small', { text: 'Tích hợp Storefront trực tuyến, duyệt đơn & mã giao dịch MBBank/SePay' })
          ])
        ]),
        el('div', { className: 'login-feature-item' }, [
          el('span', { className: 'login-feature-icon' }, [
            el('svg', { viewBox: '0 0 24 24' }, [
              el('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
              el('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
              el('line', { x1: '12', y1: '22.08', x2: '12', y2: '12' })
            ])
          ]),
          el('div', { className: 'login-feature-meta' }, [
            el('strong', { text: 'Kiểm soát kho & Báo cáo NoSQL' }),
            el('small', { text: 'Cảnh báo tồn kho thấp, hạn sử dụng và báo cáo doanh thu đa chiều' })
          ])
        ])
      ])
    ]),
    el('div', { className: 'login-hero-footer' }, [
      el('span', { className: 'status-indicator' }),
      el('span', {}, ['Máy chủ Node.js & CSDL MongoDB: ', el('strong', { style: 'color:#fff;', text: 'Đã sẵn sàng' })])
    ])
  ]);

  // Right Form column
  const formElement = el('form', { className: 'login-form-content' }, [
    feedback,
    el('div', { className: 'login-input-group' }, [
      el('label', { htmlFor: username.id, text: 'Tên đăng nhập' }),
      el('div', { className: 'login-input-wrap' }, [
        el('span', { className: 'login-input-icon' }, [
          el('svg', { viewBox: '0 0 24 24' }, [
            el('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
            el('circle', { cx: '12', cy: '7', r: '4' })
          ])
        ]),
        username
      ])
    ]),
    el('div', { className: 'login-input-group' }, [
      el('label', { htmlFor: password.id, text: 'Mật khẩu' }),
      el('div', { className: 'login-input-wrap' }, [
        el('span', { className: 'login-input-icon' }, [
          el('svg', { viewBox: '0 0 24 24' }, [
            el('rect', { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }),
            el('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
          ])
        ]),
        password,
        eyeBtn
      ])
    ]),
    submit,
    el('div', { className: 'demo-accounts-wrap' }, [
      el('span', { className: 'demo-accounts-title', text: 'Tài khoản thử nghiệm theo vai trò (Bấm để điền):' }),
      el('div', { className: 'demo-pills-grid' }, demoPills)
    ]),
    el('div', { className: 'login-footer-links' }, [
      el('a', {
        href: '/shop/',
        className: 'storefront-pill-link',
        target: '_blank',
        rel: 'noopener'
      }, [
        el('svg', { viewBox: '0 0 24 24' }, [
          el('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
          el('polyline', { points: '9 22 9 12 15 12 15 22' })
        ]),
        el('span', { text: 'Khách mua sắm? Đến Cửa hàng Online ↗' })
      ])
    ])
  ]);

  const formPane = el('div', { className: 'login-form-pane' }, [
    el('div', { className: 'login-form-header' }, [
      el('span', { className: 'welcome-label', text: 'CỔNG ĐĂNG NHẬP NỘI BỘ' }),
      el('h1', { text: 'Đăng nhập MiniMart' }),
      el('p', { text: 'Vui lòng nhập tài khoản nhân sự được cấp để truy cập không gian làm việc.' })
    ]),
    formElement
  ]);

  formElement.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Đang đăng nhập…';
    feedback.hidden = true;
    feedback.textContent = '';
    try {
      await loginAdmin(username.value, password.value);
      password.value = '';
      onSuccess();
    } catch (error) {
      feedback.textContent = error.message || 'Chưa thể đăng nhập. Vui lòng kiểm tra lại thông tin.';
      feedback.hidden = false;
      feedback.focus();
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Đăng nhập hệ thống';
    }
  });

  const portal = el('div', { className: 'login-portal' }, [heroCol, formPane]);
  root.replaceChildren(portal);
  username.focus();
}
