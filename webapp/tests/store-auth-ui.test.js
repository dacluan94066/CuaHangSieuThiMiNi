import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accountHeaderState, applyAccountHeader, loginFeedback, bindAccountDisclosure } from '../public/shop/js/auth-ui.js';
import { errorBox } from '../public/shop/js/dom.js';

test('Shop login: phân biệt rõ cổng khách hàng và cổng quản trị', async () => {
  const source = await readFile(new URL('../public/shop/js/account.js', import.meta.url), 'utf8');
  assert.match(source, /Đăng nhập khách hàng/);
  assert.match(source, /Số điện thoại khách hàng/);
  assert.match(source, /Không nhập tên tài khoản nhân viên/);
  assert.match(source, /Đăng nhập trang quản trị/);
  assert.match(source, /\/#\/dang-nhap/);
});

test('Shop header: anonymous không lấy tên từ customer cũ và không có logout', () => {
  assert.deepEqual(accountHeaderState({ authenticated: false, customer: { HoTen: 'Tên cũ' } }), { label: 'Đăng nhập', href: '#/dang-nhap', title: 'Đăng nhập', showLogout: false });
  assert.equal(accountHeaderState().showLogout, false);
});
test('Shop header: hiện họ tên và tài khoản, có fallback khi thiếu tên', () => {
  const state = accountHeaderState({ authenticated: true, customer: { HoTen: '  Nguyễn   Minh Anh  ' } });
  assert.equal(state.label, 'Xin chào, Nguyễn Minh Anh'); assert.equal(state.href, '#/tai-khoan'); assert.equal(state.showLogout, true);
  assert.equal(accountHeaderState({ authenticated: true }).label, 'Xin chào, Khách hàng');
});
test('Shop header: cắt tên dài theo Unicode, giữ tên đầy đủ trong title', () => {
  const name = '🌻'.repeat(40); const state = accountHeaderState({ authenticated: true, customer: { HoTen: name } });
  assert.equal(state.label, 'Xin chào, ' + '🌻'.repeat(27) + '…'); assert.ok(state.title.includes(name));
});
test('Shop header: tên chứa markup chỉ được gán textContent, logout ẩn ngay khi anonymous', () => {
  const account = { setAttribute(key, value) { this[key] = value; }, set innerHTML(_) { throw new Error('Unsafe DOM assignment'); } }; const logout = {};
  applyAccountHeader({ authenticated: true, customer: { HoTen: '<script>test</script>' } }, account, logout);
  assert.equal(account.textContent, 'Xin chào, <script>test</script>'); assert.equal(logout.hidden, false);
  applyAccountHeader({ authenticated: false }, account, logout); assert.equal(account.textContent, 'Đăng nhập'); assert.equal(logout.hidden, true);
});
test('Shop retail header: cập nhật tên trên nút mở, menu tài khoản/đơn/logout và đăng ký', () => {
  const element = () => ({ setAttribute(key, value) { this[key] = value; }, set innerHTML(_) { throw new Error('Unsafe DOM assignment'); } });
  const account = element(); const logout = element(); const controls = { name: element(), eyebrow: element(), caption: element(), register: element(), orders: element(), toggle: element(), menu: { open: true } };
  applyAccountHeader({ authenticated: true, customer: { HoTen: '<Tên khách>' } }, account, logout, controls);
  assert.equal(controls.name.textContent, '<Tên khách>'); assert.equal(controls.eyebrow.textContent, 'Xin chào,');
  assert.equal(account.textContent, 'Tài khoản của tôi'); assert.equal(account.href, '#/tai-khoan');
  assert.equal(controls.register.hidden, true); assert.equal(controls.orders.hidden, false); assert.equal(logout.hidden, false); assert.equal(controls.menu.open, false);
  applyAccountHeader({ authenticated: false }, account, logout, controls);
  assert.equal(controls.name.textContent, 'Đăng nhập / Đăng ký'); assert.equal(controls.register.hidden, false); assert.equal(controls.orders.hidden, true); assert.equal(logout.hidden, true);
});
test('Shop retail disclosure: Escape, bấm ngoài, chuyển focus/link và gỡ listener (DOM giả lập)', () => {
  const events = () => ({ handlers: new Map(), addEventListener(type, fn) { this.handlers.set(type, fn); }, removeEventListener(type) { this.handlers.delete(type); }, emit(type, event) { this.handlers.get(type)?.(event); } });
  const doc = events(); const menu = events(); const inside = {}; const outside = {}; menu.contains = node => node === inside; let focuses = 0; let prevented = 0;
  const stop = bindAccountDisclosure(menu, { focus() { focuses++; } }, doc);
  menu.open = true; doc.emit('click', { target: inside }); assert.equal(menu.open, true);
  doc.emit('click', { target: outside }); assert.equal(menu.open, false);
  menu.open = true; doc.emit('keydown', { key: 'Escape', preventDefault() { prevented++; } }); assert.equal(menu.open, false); assert.equal(focuses, 1); assert.equal(prevented, 1);
  menu.open = true; menu.emit('focusout', { relatedTarget: inside }); assert.equal(menu.open, true); menu.emit('focusout', { relatedTarget: outside }); assert.equal(menu.open, false);
  menu.open = true; menu.emit('click', { target: { closest: () => ({}) } }); assert.equal(menu.open, false);
  stop(); assert.equal(doc.handlers.size, 0); assert.equal(menu.handlers.size, 0);
});
test('Shop login: không phản chiếu lỗi có thể lộ tài khoản/SĐT hoặc dữ liệu riêng tư', () => {
  for (const message of ['SĐT không tồn tại: private-phone', 'Mật khẩu sai: private-phone', 'MatKhau=private mongodb://private']) {
    const error = Object.assign(new Error(message), { status: 401 });
    assert.equal(loginFeedback(error).message, 'Số điện thoại hoặc mật khẩu không đúng.');
  }
});
test('Shop login: rate limit, mạng và server có thông báo riêng an toàn', () => {
  assert.match(loginFeedback({ status: 429, message: 'private' }).message, /quá nhiều lần/);
  assert.match(loginFeedback({ status: 0, message: 'private' }).message, /Không kết nối/);
  assert.match(loginFeedback({ status: 503, message: 'private' }).message, /Vui lòng thử lại sau/);
  assert.match(loginFeedback({ status: 403, message: 'private' }).message, /tải lại trang/);
});
test('Shop errorBox: alert có tabindex và focus sau khi được gắn vào trang (DOM giả lập)', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document'); let focused = 0;
  const node = { isConnected: false, attrs: {}, setAttribute(key, value) { this.attrs[key] = value; }, append() {}, focus() { focused++; } };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => node } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'document', original); else delete globalThis.document; });
  const error = errorBox(loginFeedback({ status: 401 })); error.isConnected = true; await Promise.resolve();
  assert.equal(error.attrs.role, 'alert'); assert.equal(error.attrs.tabindex, '-1'); assert.equal(focused, 1);
  assert.equal(error.textContent, 'Số điện thoại hoặc mật khẩu không đúng.');
});
