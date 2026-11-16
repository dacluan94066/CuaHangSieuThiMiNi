import { renderDashboard } from './pages/dashboard.js';
import { renderProducts, renderProductDetail } from './pages/products.js';
import { renderInventory } from './pages/inventory.js';
import { renderInvoices, renderInvoiceDetail } from './pages/invoices.js';
import { renderPurchases, renderPurchaseDetail } from './pages/purchases.js';
import { renderCustomers, renderCustomerDetail } from './pages/customers.js';
import { el } from './ui.js';
import { renderEmployees, renderPromotions } from './pages/management.js';
import { renderReports, renderIntegrity } from './pages/analytics.js';
import { bootstrapAuth, authState, canPage, logoutAdmin } from './auth-session.js';
import { renderLogin } from './pages/login.js';

const root = document.getElementById('main-content');
const sidebar = document.getElementById('sidebar');
const shade = document.getElementById('sidebar-shade');
const menu = document.getElementById('menu-toggle');
let controller;
let cleanup;
let loginNotice = '';
const identity = document.getElementById('admin-identity');
const firstPage = () => {
  const role = authState()?.user?.role;
  if (role === 'Quản trị') return '/dashboard';
  if (role === 'Thu ngân') return '/hoa-don';
  if (role === 'Kho') return '/canh-bao-kho';
  return '/san-pham';
};
function updateIdentity() {
  const state = authState(); document.body.classList.toggle('admin-anonymous', !state?.authenticated);
  identity.hidden = !state?.authenticated;
  document.getElementById('admin-name').textContent = state?.user?.hoTen || '';
  document.getElementById('admin-role').textContent = state?.user?.role || '';
  for (const item of sidebar.querySelectorAll('a.nav-item:not(.nav-store-link)')) item.hidden = !canPage(item.hash.slice(2));
  sidebar.querySelector('.brand').href = '#' + firstPage();
}
function stopPage() { controller?.abort(); cleanup?.(); cleanup = undefined; setMenu(false); }
function showLogin(message = '') { if (message) loginNotice = message; stopPage(); updateIdentity(); root.replaceChildren(); document.title = 'Đăng nhập quản trị · MiniMart'; document.querySelector('.breadcrumb strong').textContent = 'Đăng nhập'; renderLogin(root, () => { loginNotice = ''; updateIdentity(); const target = firstPage(); if (location.hash === '#' + target) route(); else location.hash = target; }, loginNotice); }
function forbidden() { stopPage(); root.replaceChildren(el('h1', { text: 'Không có quyền truy cập' }), el('p', { className: 'notice', role: 'alert', text: 'Bạn không có quyền xem mục này.' }), el('a', { className: 'button primary', href: '#' + firstPage(), text: 'Về trang được phép' })); root.focus(); }
document.getElementById('admin-logout').addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true; stopPage(); root.replaceChildren(el('p', { role: 'status', text: 'Đang đăng xuất…' }));
  try { await logoutAdmin(); updateIdentity(); location.hash = '/dang-nhap'; showLogin('Đã đăng xuất.'); }
  catch (error) { root.replaceChildren(el('p', { className: 'notice', role: 'alert', text: error.message }), el('button', { className: 'button', text: 'Tải lại', onClick: () => location.reload() })); }
  finally { button.disabled = false; }
});
window.addEventListener('admin:expired', () => { location.hash = '/dang-nhap'; showLogin('Phiên đã hết hạn. Vui lòng đăng nhập lại.'); });
window.addEventListener('admin:forbidden', forbidden);
function setMenu(open) {
  sidebar.classList.toggle('open', open); shade.hidden = !open;
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng');
}
menu.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
shade.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { setMenu(false); menu.focus(); } });
for (const link of sidebar.querySelectorAll('a.nav-item')) link.addEventListener('click', () => setMenu(false));
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); root.focus(); });

function route() {
  if (window.location.hash === '#main-content') { root.focus(); return; }
  controller?.abort(); cleanup?.();
  controller = new AbortController(); cleanup = undefined;
  const hash = window.location.hash.slice(1) || firstPage();
  const [path, query = ''] = hash.split('?');
  updateIdentity();
  if (!authState()?.authenticated) { showLogin(); return; }
  if (path === '/dang-nhap' || path === '/') { location.hash = firstPage(); return; }
  setMenu(false);
  const detail = path.match(/^\/(san-pham|hoa-don|phieu-nhap|khach-hang)\/([^/]+)$/);
  const group = path === '/' ? '/dashboard' : detail ? `/${detail[1]}` : path;
  if (!canPage(group.slice(1))) { forbidden(); return; }
  const labels = { '/dashboard': 'Tổng quan', '/san-pham': 'Sản phẩm', '/canh-bao-kho': 'Cảnh báo kho', '/hoa-don': 'Hóa đơn', '/phieu-nhap': 'Phiếu nhập', '/khach-hang': 'Khách hàng', '/nhan-vien': 'Nhân viên', '/khuyen-mai': 'Khuyến mãi', '/bao-cao': 'Báo cáo', '/kiem-tra-du-lieu': 'Kiểm tra dữ liệu' };
  document.querySelector('.breadcrumb strong').textContent = labels[group] || 'Trang chưa sẵn sàng';
  for (const link of sidebar.querySelectorAll('a.nav-item')) {
    const active = link.getAttribute('href') === `#${group}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  const context = { signal: controller.signal, params: new URLSearchParams(query), canViewSupply: authState().user.canViewSupply, canViewInventory: canPage('canh-bao-kho') };
  if (path === '/dashboard' || path === '/') {
    document.title = 'Tổng quan · MiniMart';
    cleanup = renderDashboard(root, context);
  } else if (path === '/san-pham') {
    document.title = 'Sản phẩm · MiniMart';
    cleanup = renderProducts(root, context);
  } else if (detail) {
    document.title = `${labels[group]} · Chi tiết · MiniMart`;
    const renderers = { 'san-pham': renderProductDetail, 'hoa-don': renderInvoiceDetail, 'phieu-nhap': renderPurchaseDetail, 'khach-hang': renderCustomerDetail };
    try { cleanup = renderers[detail[1]](root, { ...context, code: decodeURIComponent(detail[2]) }); }
    catch { root.replaceChildren(el('p', { className: 'notice', role: 'alert', text: 'Mã trong địa chỉ không hợp lệ.' }), el('a', { href: `#${group}`, text: 'Về danh sách' })); }
  } else if (path === '/hoa-don') {
    document.title = 'Hóa đơn · MiniMart'; cleanup = renderInvoices(root, context);
  } else if (path === '/phieu-nhap') {
    document.title = 'Phiếu nhập · MiniMart'; cleanup = renderPurchases(root, context);
  } else if (path === '/khach-hang') {
    document.title = 'Khách hàng · MiniMart'; cleanup = renderCustomers(root, context);
  } else if (['/nhan-vien', '/khuyen-mai', '/bao-cao', '/kiem-tra-du-lieu'].includes(path)) {
    document.title = `${labels[path]} · MiniMart`;
    cleanup = ({ '/nhan-vien': renderEmployees, '/khuyen-mai': renderPromotions, '/bao-cao': renderReports, '/kiem-tra-du-lieu': renderIntegrity })[path](root, context);
  } else if (path === '/canh-bao-kho') {
    document.title = 'Cảnh báo kho · MiniMart';
    cleanup = renderInventory(root, context);
  } else {
    document.title = 'Không tìm thấy trang · MiniMart';
    root.replaceChildren(el('h1', { text: 'Trang chưa sẵn sàng' }), el('p', { className: 'notice', text: 'Chức năng này hiện chưa mở. Bạn có thể quay lại Tổng quan để xem dữ liệu.' }), el('a', { href: '#/dashboard', className: 'button', text: 'Về Tổng quan' }));
  }
}
window.addEventListener('hashchange', route);
let booting = false;
async function boot() {
  if (booting) return; booting = true; stopPage(); root.replaceChildren(el('p', { role: 'status', text: 'Đang kiểm tra phiên nhân viên…' }));
  try { await bootstrapAuth(); route(); }
  catch (error) { root.replaceChildren(el('p', { className: 'notice', role: 'alert', text: error.message || 'Không kết nối được xác thực.' }), el('button', { className: 'button', text: 'Thử lại', onClick: boot })); }
  finally { booting = false; }
}
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
window.addEventListener('focus', () => { if (authState()?.authenticated) boot(); });
document.addEventListener('visibilitychange', () => { if (!authState()?.authenticated) return; if (document.hidden) { stopPage(); root.replaceChildren(); } else boot(); });
boot();
