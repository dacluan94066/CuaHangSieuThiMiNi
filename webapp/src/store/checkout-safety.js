import fs from 'node:fs';
import { StoreError } from './errors.js';
export const checkoutLockPath = new URL('../../.checkout-locked', import.meta.url);
export function checkoutLocked() { return fs.existsSync(checkoutLockPath); }
export function lockCheckout() {
  fs.writeFileSync(checkoutLockPath, 'Checkout locked: required Test consistency verification failed. User review required.\n');
}
export function assertCheckoutEnabled(config) {
  if (config.storeCheckoutEnabled !== true || checkoutLocked()) throw new StoreError(503, 'CHECKOUT_DISABLED');
}
