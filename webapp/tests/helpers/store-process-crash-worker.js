import { loadConfig } from '../../src/config.js';
import { createApp } from '../../src/app.js';
import { createDatabase } from '../../src/db.js';
import { createStoreDatabase } from '../../src/store/database.js';
import { createAccounts } from '../../src/store/accounts.js';
import { createCatalog } from '../../src/store/catalog.js';
import { createCartService } from '../../src/store/cart.js';
import { createCheckout } from '../../src/store/checkout.js';
import { createOrders } from '../../src/store/orders.js';
import { assertStoreWriteTarget } from '../../src/store/guards.js';

// IPC only; the pause cannot be enabled through an HTTP request or production server.
const config = { ...loadConfig({ testMode: true }), checkoutTestHarness: true };
assertStoreWriteTarget(config, config.dbName);
if (!process.send || process.env.STORE_S4_PROCESS_TEST !== 'ALLOW_TEST_PROCESS_CRASH' || process.env.STORE_CHECKOUT_API_TESTS !== 'ALLOW_TEST_CHECKOUT') throw new Error('Guarded IPC Test worker only');
const run = process.argv.find(value => value.startsWith('--run='))?.slice(6);
if (!/^[a-f0-9-]{36}$/.test(run || '')) throw new Error('Missing Test run identity');
const database = createStoreDatabase(config); const admin = createDatabase(config);
let resume; let server; let paused = false;
process.on('message', async message => {
  if (message?.type === 'CONTINUE') resume?.();
  if (message?.type === 'STOP') {
    resume?.();
    server?.close(); server?.closeAllConnections(); await database.close(); await admin.close(); process.exit(0);
  }
});
const catalog = createCatalog(database);
const hooks = process.argv.includes('--pause') ? { async hit(stage) {
  if (stage === 'after-points' && !paused) {
    paused = true;
    await new Promise(resolve => { resume = resolve; process.send({ type: 'PAUSED', pid: process.pid, stage, run }); });
  }
} } : undefined;
server = createApp({ config, db: admin, store: { accounts: createAccounts({ config, database }), catalog, carts: createCartService(catalog), orders: createOrders(database), checkout: createCheckout({ config, database, testHooks: hooks }) } }).listen(0, '127.0.0.1', () => process.send({ type: 'READY', port: server.address().port, pid: process.pid, run }));
process.on('uncaughtException', () => { process.stderr.write('Test worker failed; details suppressed.\n'); process.exit(1); });
