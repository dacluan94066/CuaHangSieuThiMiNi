// Admin GET regression + admin method rejection. No store write request.
import { loadConfig } from '../src/config.js';
import { createDatabase } from '../src/db.js';
import { createStoreDatabase } from '../src/store/database.js';
import { createApp } from '../src/app.js';
import { createAccounts } from '../src/store/accounts.js';
import { inspectStore } from '../src/store/preflight.js';
import { createAdminAuth } from '../src/admin-auth/index.js';

let base = process.env.S1_BASE_URL;
let server; let admin; let storeDatabase; let readiness; let adminAuth; let cookie = ''; let authenticated = false;
const config = Object.freeze({ ...loadConfig({ testMode: process.argv.includes('--test') }), storeWriteEnabled: false });
if (!base) {
  admin = createDatabase(config); storeDatabase = createStoreDatabase(config);
  readiness = await inspectStore(await storeDatabase.read());
  adminAuth = createAdminAuth({ config });
  server = createApp({ config, db: admin, adminAuth, store: { accounts: createAccounts({ config, database: storeDatabase }) } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('S1_BASE_URL must be an explicit local origin');
const checks = [];
async function check(path, expected, method = 'GET') {
  const response = await fetch(base + path, { method, headers: { Cookie: path.startsWith('/api') ? cookie : '' } });
  const body = await response.json();
  if (/matkhau|"salt"|thamSoBam|mongodb(?:\+srv)?:\/\//i.test(JSON.stringify(body))) throw new Error('Sensitive field in response');
  if (response.status !== expected) throw new Error(`${method} ${path}: ${response.status} != ${expected}`);
  checks.push({ method, path, status: response.status, total: body.pagination?.total, errorCode: body.error?.code });
}
try {
if (process.env.ADMIN_TEST_USERNAME || process.env.ADMIN_TEST_PASSWORD) {
  if (!process.env.ADMIN_TEST_USERNAME || !process.env.ADMIN_TEST_PASSWORD) throw new Error('Cần đủ credential Test qua env; không in giá trị.');
  const bootstrap = await fetch(base + '/admin-auth/session'); const initial = await bootstrap.json();
  const loggedIn = await fetch(base + '/admin-auth/dang-nhap', { method: 'POST', headers: { Cookie: bootstrap.headers.get('set-cookie').split(';')[0], Origin: config.adminOrigin, 'X-CSRF-Token': initial.data.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tenDangNhap: process.env.ADMIN_TEST_USERNAME, matKhau: process.env.ADMIN_TEST_PASSWORD }) });
  if (loggedIn.status !== 200) throw new Error('Không đăng nhập được; cần setup/credential Test hợp lệ, không bypass.');
  const result = await loggedIn.json(); if (result.data.user.role !== 'Quản trị') throw new Error('Cần role Quản trị cho smoke toàn bộ trang.');
  cookie = loggedIn.headers.get('set-cookie').split(';')[0]; authenticated = true;
}
for (const path of ['/api/health', '/api/danh-muc', '/api/nha-cung-cap', '/api/phuong-thuc-thanh-toan', '/api/dashboard', '/api/san-pham', '/api/san-pham/SP001', '/api/canh-bao-kho', '/api/hoa-don', '/api/hoa-don/HD009', '/api/phieu-nhap', '/api/phieu-nhap/PN001', '/api/khach-hang', '/api/khach-hang/KH001']) await check(path, authenticated ? 200 : 401);
for (const method of ['POST', 'PUT', 'DELETE']) for (const path of ['/api', '/api/health', '/api/san-pham', '/api/hoa-don']) await check(path, 405, method);
await check('/api/san-pham?limit=101', authenticated ? 400 : 401); await check('/api/san-pham?unknown=1', authenticated ? 400 : 401);
await check('/store-api/session', 200); await check('/store-api/tai-khoan', 401); await check('/store-api/session?unknown=1', 400);
for (const path of ['/store-api/san-pham', '/store-api/gio-hang', '/store-api/don-hang']) await check(path, server ? 404 : path.endsWith('don-hang') ? 401 : 200);
console.log(JSON.stringify({ base, authenticatedDataChecks: authenticated, mode: authenticated ? 'AUTHENTICATED_DATA' : 'ANONYMOUS_GUARDS_ONLY', readiness: readiness ? { ready: readiness.ready, topology: readiness.topology } : undefined, checks, count: checks.length, allPassed: true, storeWriteRequests: 0 }, null, 2));
} finally {
  if (server) { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
  await admin?.close(); await storeDatabase?.close();
  await adminAuth?.close();
}
