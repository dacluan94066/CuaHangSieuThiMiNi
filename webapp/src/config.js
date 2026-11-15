import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

function configError(message) { return Object.assign(new Error(message), { code: 'CONFIG_ERROR' }); }

export function loadConfig({ testMode = false } = {}) {
  const loaded = dotenv.config({ path: fileURLToPath(new URL(testMode ? '../.env.test' : '../.env', import.meta.url)), quiet: true });
  if (testMode && loaded.error) throw configError('Thiếu .env.test. Sao chép .env.test.example sang .env.test trước khi chạy start:test.');
  const { MONGO_URI, DB_NAME, PORT } = process.env;
  const missing = Object.entries({ MONGO_URI, DB_NAME, PORT }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw configError(`Thiếu biến cấu hình: ${missing.join(', ')}. Kiểm tra .env.`);
  let uri;
  try { uri = new URL(MONGO_URI); } catch { throw configError('Cấu hình kết nối MongoDB không hợp lệ.'); }
  if (uri.protocol !== 'mongodb:' || !['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname)) {
    throw configError('Bản minh họa yêu cầu MongoDB local, không sử dụng SRV.');
  }
  for (const [key, value] of uri.searchParams) {
    if (/^(timeoutMS|timeoutMode|authMechanismProperties)$/i.test(key) || (/^authMechanism$/i.test(key) && /OIDC/i.test(value))) {
      throw configError('Cấu hình kết nối sử dụng tùy chọn không được hỗ trợ trong bản minh họa.');
    }
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(DB_NAME)) throw configError('DB_NAME không hợp lệ.');
  if (!/^\d+$/.test(PORT) || Number(PORT) < 1 || Number(PORT) > 65535) throw configError('PORT phải trong khoảng 1–65535.');
  if (testMode && (DB_NAME !== 'QLSieuThiMini_Test' || PORT !== '3001')) throw configError('start:test yêu cầu DB_NAME=QLSieuThiMini_Test và PORT=3001. Kiểm tra cả biến môi trường terminal.');
  const storeOrigin = process.env.STORE_ORIGIN || `http://localhost:${Number(PORT)}`;
  let origin;
  try { origin = new URL(storeOrigin); } catch { throw configError('STORE_ORIGIN không hợp lệ.'); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== storeOrigin || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw configError('STORE_ORIGIN phải là origin local chính xác.');
  const enabled = process.env.STORE_WRITE_ENABLED || 'false';
  if (!['true', 'false'].includes(enabled)) throw configError('STORE_WRITE_ENABLED phải là true hoặc false.');
  if (enabled === 'true' && !['QLSieuThiMini', 'QLSieuThiMini_Test'].includes(DB_NAME)) throw configError('Bật ghi cửa hàng chỉ cho phép trên QLSieuThiMini hoặc QLSieuThiMini_Test.');
  const checkoutEnabled = process.env.STORE_CHECKOUT_ENABLED || 'false';
  const adminOrigin = process.env.ADMIN_ORIGIN || `http://localhost:${Number(PORT)}`;
  let parsedAdminOrigin;
  try { parsedAdminOrigin = new URL(adminOrigin); } catch { throw configError('ADMIN_ORIGIN không hợp lệ.'); }
  if (!['http:', 'https:'].includes(parsedAdminOrigin.protocol) || parsedAdminOrigin.origin !== adminOrigin || !['localhost', '127.0.0.1', '[::1]'].includes(parsedAdminOrigin.hostname)) throw configError('ADMIN_ORIGIN phải là origin local chính xác.');
  if (!['true', 'false'].includes(checkoutEnabled) || (checkoutEnabled === 'true' && !['QLSieuThiMini', 'QLSieuThiMini_Test'].includes(DB_NAME))) throw configError('Checkout chỉ có thể bật trên QLSieuThiMini hoặc QLSieuThiMini_Test.');
  const sepay = Object.freeze({
    apiKey: process.env.SEPAY_API_KEY || 'MINIMART_SEPAY_SECRET_2026',
    bankName: process.env.SEPAY_BANK_NAME || 'MBBank',
    accountNo: process.env.SEPAY_ACCOUNT_NO || '1114110511',
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN DAC LUAN'
  });
  return Object.freeze({ mongoUri: MONGO_URI, dbName: DB_NAME, port: Number(PORT), host: '127.0.0.1', storeOrigin, adminOrigin, storeCookieSecure: origin.protocol === 'https:', storeWriteEnabled: enabled === 'true', storeCheckoutEnabled: checkoutEnabled === 'true', sepay });
}
