import { loadConfig } from './src/config.js';
import { createDatabase } from './src/db.js';
import { createApp } from './src/app.js';
import { createStoreDatabase } from './src/store/database.js';
import { createAccounts } from './src/store/accounts.js';
import { inspectStore } from './src/store/preflight.js';
import { createCatalog } from './src/store/catalog.js';
import { createCartService } from './src/store/cart.js';
import { createCheckout } from './src/store/checkout.js';
import { createOrders } from './src/store/orders.js';
import { createAdminAuth } from './src/admin-auth/index.js';

let db;
let storeDatabase;
let adminAuth;
try {
  const config = loadConfig({ testMode: process.argv.includes('--test') });
  db = createDatabase(config);
  storeDatabase = createStoreDatabase(config);
  const accounts = createAccounts({ config, database: storeDatabase });
  const catalog = createCatalog(storeDatabase);
  const carts = createCartService(catalog);
  const checkout = createCheckout({ config, database: storeDatabase });
  const orders = createOrders(storeDatabase);
  adminAuth = createAdminAuth({ config });
  const server = createApp({ config, db, store: { accounts, catalog, carts, checkout, orders, database: storeDatabase }, adminAuth }).listen(config.port, config.host, () => {
    console.log(`MiniMart đang chạy tại http://localhost:${config.port} (Database: ${config.dbName})`);
    console.log(`- Quản trị Admin: http://localhost:${config.port}/`);
    console.log(`- Cửa hàng Shop:  http://localhost:${config.port}/shop/`);
    // Read-only startup inspection. Never run setup or recovery here.
    storeDatabase.read().then(inspectStore).then(result => {
      console.log(`[Store preflight] ${result.topology}; ${result.ready ? 'READY' : result.setupReady ? 'RECOVERY_PENDING' : 'STORE_SETUP_REQUIRED'}`);
    }).catch(() => console.log('[Store preflight] DATABASE_UNAVAILABLE'));
  });
  server.on('error', () => { console.error('Không thể mở cổng ứng dụng. Kiểm tra PORT và ứng dụng đang chạy.'); process.exitCode = 1; });
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.close();
    await db.close();
    await storeDatabase.close();
    await adminAuth.close();
    console.log('Đã dừng ứng dụng.');
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error(error.code === 'CONFIG_ERROR' ? `[Cấu hình] ${error.message}` : 'Không thể khởi động. Kiểm tra cấu hình ứng dụng.');
  process.exitCode = 1;
}
