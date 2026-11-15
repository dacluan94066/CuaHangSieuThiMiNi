import { StoreError } from './errors.js';
import { quantity as validateQuantity } from './query.js';
import { randomUUID } from 'node:crypto';

export function createCart() { return { id: randomUUID(), items: new Map(), revision: 0 }; }
export function cartSnapshot(session) {
  const cart = session.cart ??= createCart();
  return { revision: cart.revision, items: [...cart.items].map(([maSP, soLuong]) => ({ maSP, soLuong })) };
}
export function requirePurchasable(product, quantity) {
  if (product.DonGiaBan === null || product.SoLuongTon === null) throw new StoreError(409, 'PRODUCT_DATA_INVALID');
  if (!product.CoTheMua) throw new StoreError(409, 'PRODUCT_UNAVAILABLE');
  if (quantity > product.SoLuongTon) throw new StoreError(409, 'INSUFFICIENT_STOCK');
  if (!Number.isSafeInteger(product.DonGiaBan * quantity)) throw new StoreError(409, 'PRODUCT_DATA_INVALID');
}
export function cartView(snapshot, products) {
  const byCode = new Map(products.map(product => [product.MaSP, product]));
  let total = 0; let invalidTotal = false;
  const items = snapshot.items.map(({ maSP, soLuong }) => {
    const product = byCode.get(maSP);
    const warnings = product ? [...product.CanhBao] : ['Sản phẩm không còn tồn tại'];
    if (product && soLuong > product.SoLuongTon && product.SoLuongTon > 0) warnings.push(`Không đủ tồn kho: hiện còn ${product.SoLuongTon}`);
    const amount = product && product.DonGiaBan !== null && Number.isSafeInteger(product.DonGiaBan * soLuong) ? product.DonGiaBan * soLuong : null;
    if (amount === null) invalidTotal = true;
    else if (Number.isSafeInteger(total + amount)) total += amount;
    else { warnings.push('Tổng tiền vượt giới hạn cho phép'); invalidTotal = true; }
    return { MaSP: maSP, SoLuong: soLuong, SanPham: product || null, DonGia: product?.DonGiaBan ?? null, ThanhTien: amount, CanhBao: warnings,
      HopLe: Boolean(product?.CoTheMua && soLuong <= product.SoLuongTon && amount !== null) };
  });
  return { revision: snapshot.revision, items, soMa: items.length, soLuong: items.reduce((sum, item) => sum + item.SoLuong, 0), tongTamTinh: invalidTotal ? null : total,
    coCanhBao: invalidTotal || items.some(item => !item.HopLe), luuY: 'Giỏ hàng chưa giữ tồn kho. Giá và tồn được kiểm tra lại khi xem giỏ.' };
}
export function createCartService(catalog) {
  const queues = new WeakMap();
  async function view(session) {
    const snapshot = cartSnapshot(session);
    return cartView(snapshot, await catalog.forCart(snapshot.items.map(item => item.maSP)));
  }
  function mutate(session, operation) {
    const cart = session.cart ??= createCart();
    const previous = queues.get(cart) || Promise.resolve();
    const result = previous.catch(() => {}).then(async () => {
      if (cart.lockedBy) throw new StoreError(409, 'CART_BUSY');
      await operation(cart); return view(session);
    });
    queues.set(cart, result);
    result.finally(() => { if (queues.get(cart) === result) queues.delete(cart); }).catch(() => {});
    return result;
  }
  return Object.freeze({
    view,
    add(session, code, quantity) {
      validateQuantity(quantity);
      return mutate(session, async cart => {
        const next = (cart.items.get(code) || 0) + quantity;
        if (next > 99 || (!cart.items.has(code) && cart.items.size >= 50)) throw new StoreError(400, 'CART_LIMIT');
        requirePurchasable(await catalog.detail(code), next);
        if (cart.lockedBy) throw new StoreError(409, 'CART_BUSY');
        cart.items.set(code, next); cart.revision++;
      });
    },
    set(session, code, quantity) {
      validateQuantity(quantity);
      return mutate(session, async cart => {
        if (!cart.items.has(code)) throw new StoreError(404, 'CART_ITEM_NOT_FOUND');
        requirePurchasable(await catalog.detail(code), quantity);
        if (cart.lockedBy) throw new StoreError(409, 'CART_BUSY');
        if (cart.items.get(code) !== quantity) { cart.items.set(code, quantity); cart.revision++; }
      });
    },
    remove(session, code) {
      return mutate(session, cart => {
        if (!cart.items.delete(code)) throw new StoreError(404, 'CART_ITEM_NOT_FOUND');
        cart.revision++;
      });
    },
    clear(session) { return mutate(session, cart => { if (cart.items.size) { cart.items.clear(); cart.revision++; } }); }
  });
}
