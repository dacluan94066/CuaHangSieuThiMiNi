export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'disabled' || key === 'required') node[key] = Boolean(value);
    else node.setAttribute(key, String(value));
  }
  node.append(...children.filter(value => value !== null && value !== undefined));
  return node;
}
export const link = (text, href, className) => el('a', { href, class: className, text });
export function field(label, input, hint) {
  return el('div', { class: 'field' }, el('label', { for: input.id, text: label }), input, hint ? el('small', { text: hint }) : null);
}
export function errorBox(error) {
  const node = el('div', { class: 'error-box', role: 'alert', tabindex: -1, text: error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.' });
  queueMicrotask(() => { if (node.isConnected) node.focus(); });
  return node;
}
export function empty(message, action = link('Xem sản phẩm', '#/tim-kiem', 'button secondary')) { return el('div', { class: 'empty' }, el('p', { text: message }), action); }
export async function busy(button, action) {
  const original = button.textContent; button.disabled = true; button.textContent = 'Đang xử lý…';
  try { return await action(); } finally { button.disabled = false; button.textContent = original; }
}
