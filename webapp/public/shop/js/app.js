import * as api from './api.js';
import { el, link, errorBox, busy } from './dom.js';
import { applyAccountHeader, bindAccountDisclosure } from './auth-ui.js';
import { catalogPage, detailPage } from './catalog.js';
import { cartPage } from './cart.js';
import { authPage, accountPage } from './account.js';
import { checkoutPage } from './checkout.js';
import { ordersPage, orderDetailPage } from './orders.js';

const main = document.getElementById('shop-main');
const accountLink = document.getElementById('account-link');
const headerLogout = document.getElementById('header-logout');
const headerFeedback = document.getElementById('header-feedback');
const accountControls = { menu: document.getElementById('account-menu'), toggle: document.getElementById('account-toggle'), name: document.getElementById('account-name'), eyebrow: document.getElementById('account-eyebrow'), caption: document.getElementById('account-menu-caption'), register: document.getElementById('header-register'), orders: document.getElementById('header-orders') };
bindAccountDisclosure(accountControls.menu, accountControls.toggle);
function showHeaderError(message) { headerFeedback.hidden = false; headerFeedback.replaceChildren(errorBox(new Error(message))); }
let epoch = 0; let categoryCache; let toastTimer;
const ctx = {
  render,
  toast(message) {
    const node = document.getElementById('shop-toast'); clearTimeout(toastTimer); node.textContent = message; node.hidden = false;
    toastTimer = setTimeout(() => { node.hidden = true; }, 6500);
  },
  setCartCount(quantity) {
    document.getElementById('cart-count').textContent = String(quantity);
    document.getElementById('cart-link').setAttribute('aria-label', `Giỏ hàng, ${quantity} sản phẩm`);
  },
  async categories() {
    if (!categoryCache) categoryCache = api.get('/danh-muc?limit=100').then(result => result.data).catch(error => { categoryCache = undefined; throw error; });
    return categoryCache;
  },
  async refreshHeader() {
    const session = await api.getSession();
    applyAccountHeader(session, accountLink, headerLogout, accountControls);
    headerFeedback.hidden = true; headerFeedback.replaceChildren();
    const { data } = await api.get('/gio-hang'); ctx.setCartCount(data.soLuong);
  },
  async logout() {
    await api.logout();
    applyAccountHeader({ authenticated: false }, accountLink, headerLogout, accountControls); ctx.setCartCount(0);
    ctx.toast('Đã đăng xuất.');
    try { await ctx.refreshHeader(); }
    catch { showHeaderError('Đã đăng xuất. Chưa tải lại được giỏ hàng, vui lòng thử làm mới trang.'); }
    if (location.hash === '#/' || !location.hash) render(); else location.hash = '/';
  }
};
headerLogout.addEventListener('click', async () => {
  accountControls.menu.open = false;
  headerFeedback.hidden = true; headerFeedback.replaceChildren();
  try { await busy(headerLogout, () => ctx.logout()); }
  catch { showHeaderError('Chưa thể đăng xuất. Vui lòng thử lại hoặc tải lại trang.'); }
});
async function render() {
  accountControls.menu.open = false;
  const current = ++epoch;
  main.setAttribute('aria-busy', 'true'); main.replaceChildren(el('p', { class: 'loading', role: 'status', text: 'Đang tải…' }));
  try {
    const route = new URL((location.hash.slice(1) || '/'), location.origin);
    document.getElementById('header-q').value = route.searchParams.get('q') || '';
    for (const item of document.querySelectorAll('#category-nav a')) {
      if (item.getAttribute('href') === `#${route.pathname}`) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
    const parts = route.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let page;
    if (!parts.length) page = await catalogPage({ home: true, query: route.searchParams }, ctx);
    else if (parts[0] === 'tim-kiem' && parts.length === 1) page = await catalogPage({ query: route.searchParams }, ctx);
    else if (parts[0] === 'danh-muc' && parts.length === 2) page = await catalogPage({ category: parts[1], query: route.searchParams }, ctx);
    else if (parts[0] === 'san-pham' && parts.length === 2) page = await detailPage(parts[1], ctx);
    else if (parts[0] === 'gio-hang' && parts.length === 1) page = await cartPage(ctx);
    else if (parts[0] === 'dang-ky' && parts.length === 1) page = await authPage(true, ctx);
    else if (parts[0] === 'dang-nhap' && parts.length === 1) page = await authPage(false, ctx);
    else if (parts[0] === 'tai-khoan' && parts.length === 1) page = await accountPage(ctx);
    else if (parts[0] === 'thanh-toan' && parts.length === 1) page = await checkoutPage(ctx);
    else if (parts[0] === 'don-hang' && parts.length === 1) page = await ordersPage(route.searchParams);
    else if (parts[0] === 'don-hang' && parts.length === 2) page = await orderDetailPage(parts[1]);
    else page = el('section', { class: 'empty' }, el('h1', { text: 'Không tìm thấy trang' }), link('Về cửa hàng', '#/'));
    if (current === epoch) { main.replaceChildren(page); document.title = `${page.querySelector('h1')?.textContent || 'Cửa hàng'} · MiniMart`; }
  } catch (error) {
    if (current === epoch) main.replaceChildren(errorBox(error), el('button', { type: 'button', class: 'secondary', text: 'Thử lại', onclick: render }));
  } finally {
    if (current === epoch) { main.setAttribute('aria-busy', 'false'); main.focus({ preventScroll: true }); }
  }
}
document.getElementById('header-search').addEventListener('submit', event => {
  event.preventDefault(); location.hash = `/tim-kiem?${new URLSearchParams({ q: new FormData(event.currentTarget).get('q') })}`;
});
document.getElementById('skip-content').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
window.addEventListener('hashchange', () => { window.scrollTo({ top: 0, behavior: 'auto' }); render(); });
async function boot() {
  try {
    await ctx.refreshHeader();
    const nav = document.getElementById('category-nav');
    for (const category of await ctx.categories()) nav.append(link(category.TenDM, `#/danh-muc/${encodeURIComponent(category.MaDM)}`));
  } catch (error) { ctx.toast(error.message); }
  await render();
}
boot();
