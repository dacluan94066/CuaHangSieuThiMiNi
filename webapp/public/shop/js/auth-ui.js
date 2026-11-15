export const LOGIN_SUCCESS = 'Đăng nhập thành công';
export const REGISTER_SUCCESS = 'Đăng ký thành công, hãy đăng nhập';

export function accountHeaderState(session) {
  if (!session?.authenticated) return { label: 'Đăng nhập', href: '#/dang-nhap', title: 'Đăng nhập', showLogout: false };
  const name = typeof session.customer?.HoTen === 'string' ? session.customer.HoTen.trim().replace(/\s+/gu, ' ') : '';
  const fullName = name || 'Khách hàng'; const characters = Array.from(fullName);
  const shortName = characters.length > 28 ? characters.slice(0, 27).join('') + '…' : fullName;
  return { label: `Xin chào, ${shortName}`, href: '#/tai-khoan', title: `Xem tài khoản của ${fullName}`, showLogout: true };
}
export function applyAccountHeader(session, account, logout, controls = {}) {
  const state = accountHeaderState(session);
  account.textContent = controls.name ? state.showLogout ? 'Tài khoản của tôi' : 'Đăng nhập' : state.label;
  account.href = state.href; account.title = state.title;
  account.setAttribute('aria-label', state.title); logout.hidden = !state.showLogout;
  if (controls.name) { controls.name.textContent = state.showLogout ? state.label.slice('Xin chào, '.length) : 'Đăng nhập / Đăng ký'; controls.name.title = state.title; }
  if (controls.eyebrow) controls.eyebrow.textContent = state.showLogout ? 'Xin chào,' : 'Tài khoản';
  if (controls.caption) controls.caption.textContent = state.showLogout ? state.label : 'Chào mừng đến MiniMart';
  if (controls.register) controls.register.hidden = state.showLogout;
  if (controls.orders) controls.orders.hidden = !state.showLogout;
  if (controls.toggle) controls.toggle.setAttribute('aria-label', state.showLogout ? `Mở tùy chọn tài khoản. ${state.label}` : 'Mở đăng nhập và đăng ký');
  if (controls.menu) controls.menu.open = false;
}
export function bindAccountDisclosure(menu, toggle, ownerDocument = document) {
  const close = () => { menu.open = false; };
  const outsideClick = event => { if (!menu.contains(event.target)) close(); };
  const escape = event => { if (event.key === 'Escape' && menu.open) { event.preventDefault(); close(); toggle.focus(); } };
  const focusOut = event => { if (event.relatedTarget && !menu.contains(event.relatedTarget)) close(); };
  const navigate = event => { if (event.target.closest('a')) close(); };
  ownerDocument.addEventListener('click', outsideClick); ownerDocument.addEventListener('keydown', escape);
  menu.addEventListener('focusout', focusOut); menu.addEventListener('click', navigate);
  return () => { ownerDocument.removeEventListener('click', outsideClick); ownerDocument.removeEventListener('keydown', escape); menu.removeEventListener('focusout', focusOut); menu.removeEventListener('click', navigate); };
}
export function loginFeedback(error) {
  if (error?.status === 429) return new Error('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi và thử lại.');
  if (error?.status === 0 || error?.code === 'NETWORK_ERROR') return new Error('Không kết nối được cửa hàng. Vui lòng thử lại.');
  if (error?.status >= 500) return new Error('Chưa thể đăng nhập lúc này. Vui lòng thử lại sau.');
  if (error?.status === 403) return new Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại trang và thử lại.');
  return new Error('Số điện thoại hoặc mật khẩu không đúng.');
}
