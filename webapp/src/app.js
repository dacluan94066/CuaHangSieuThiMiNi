import express from 'express';
import { fileURLToPath } from 'node:url';
import { createApi } from './routes/api.js';
import { errorHandler } from './middleware/error-handler.js';
import { safeJsonReplacer } from './utils/projections.js';
import { createStoreRouter } from './store/router.js';
import { createAdminAuth } from './admin-auth/index.js';
import { createSepayWebhookHandler } from './store/sepay.js';

export function createApp({ config, db, store, adminAuth = createAdminAuth({ config }) }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('json replacer', safeJsonReplacer(config.mongoUri));
  app.use((req, res, next) => {
    if (req.path === '/' || req.path === '/index.html') res.set('Cache-Control', 'no-store');
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://qr.sepay.vn https://img.vietqr.io; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    next();
  });

  // SePay Payment Webhook (nhận thông báo tiền vào từ SePay)
  if (store?.database) {
    const sepayHandler = createSepayWebhookHandler({
      database: store.database,
      apiKey: config.sepay?.apiKey
    });
    app.get('/api/sepay-webhook', (req, res) => res.json({ status: 'ok', message: 'SePay Webhook server MiniMart sẵn sàng!' }));
    app.post('/api/sepay-webhook', express.json(), sepayHandler);
    app.post('/store-api/webhook/sepay', express.json(), sepayHandler);
    // Phòng hờ khi điền link gốc không có /api/sepay-webhook
    app.post('/', express.json(), (req, res, next) => {
      if (req.headers['authorization'] || req.body?.gateway || req.body?.transferAmount) {
        return sepayHandler(req, res, next);
      }
      next();
    });
  }
  // Trước router: Express tự xử lý HEAD như GET nếu không có chốt này.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET') return res.set('Allow', 'GET').status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'API chỉ hỗ trợ phương thức GET.' } });
    next();
  }, adminAuth.authenticate, createApi(db, adminAuth));
  app.use('/admin-auth', adminAuth.router);
  if (store) app.use('/store-api', createStoreRouter({ config, ...store }));
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url)), { dotfiles: 'ignore', index: 'index.html' }));
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên.' } }));
  app.use(errorHandler);
  return app;
}
