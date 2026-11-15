import { el } from '../ui.js';
import { loginAdmin } from '../auth-session.js';
export function renderLogin(root, onSuccess, message = '') {
  const username = el('input', { id: 'admin-username', name: 'tenDangNhap', autoComplete: 'username', maxLength: 64, required: true });
  const password = el('input', { id: 'admin-password', name: 'matKhau', type: 'password', autoComplete: 'current-password', maxLength: 256, required: true });
  const feedback = el('div', { className: 'admin-login-feedback', role: 'alert', tabIndex: -1 });
  const submit = el('button', { type: 'submit', className: 'button primary', text: 'Đăng nhập quản trị' });
  const form = el('form', { className: 'card admin-login' }, [el('span', { className: 'welcome-label', text: 'KHÔNG GIAN NHÂN VIÊN' }), el('h1', { text: 'Đăng nhập MiniMart' }),
    el('p', { text: 'Dùng tài khoản nhân viên. Các mục được hiển thị theo vai trò của bạn.' }),
    el('div', { className: 'field' }, [el('label', { htmlFor: username.id, text: 'Tên đăng nhập' }), username]),
    el('div', { className: 'field' }, [el('label', { htmlFor: password.id, text: 'Mật khẩu' }), password]), feedback, submit,
    el('p', { className: 'summary-note', text: 'Cần thiết lập tài khoản băm thủ công trên DB Test trước lần đăng nhập đầu tiên.' }), el('a', { href: '/shop/', text: 'Bạn là khách hàng? Đến cửa hàng' })]);
  if (message) feedback.textContent = message;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submit.disabled) return; submit.disabled = true; submit.textContent = 'Đang đăng nhập…'; feedback.textContent = '';
    try { await loginAdmin(username.value, password.value); password.value = ''; onSuccess(); }
    catch (error) { feedback.textContent = error.message || 'Chưa thể đăng nhập. Vui lòng thử lại.'; feedback.focus(); }
    finally { submit.disabled = false; submit.textContent = 'Đăng nhập quản trị'; }
  });
  root.replaceChildren(form); username.focus();
}
