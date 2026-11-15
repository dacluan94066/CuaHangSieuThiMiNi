import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { StoreError, customerDto, storeErrorHandler } from './errors.js';
import { SessionStore, readSessionCookie, cookieOptions, COOKIE_NAME, checkCsrf } from './sessions.js';
import { registrationInput, loginInput, exactBody } from './validation.js';
import { storeQuery, storeCode, cartInput } from './query.js';
import { quoteInput, orderInput, uuid } from './checkout-rules.js';

const methods = Object.freeze({ '/session': 'GET', '/tai-khoan': 'GET', '/auth/dang-ky': 'POST', '/auth/dang-nhap': 'POST', '/auth/dang-xuat': 'POST' });
export function createStoreRouter({ config, accounts, catalog, carts, checkout, orders, sessions = new SessionStore() }) {
  const router = Router({ caseSensitive: true, strict: true });
  const options = cookieOptions(config.storeCookieSecure);
  router.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.set('Cache-Control', 'no-store');
    const extended = Boolean(catalog && carts);
    const kind = req.path === '/don-hang' && req.method === 'GET' && orders ? 'orders' : req.path === '/san-pham' ? 'products' : req.path === '/danh-muc' ? 'categories' : 'none';
    const orderMethods = req.path === '/don-hang' ? [orders ? 'GET' : null, checkout ? 'POST' : null].filter(Boolean).join(', ') : undefined;
    const allowed = methods[req.path] || orderMethods || (orders && /^\/don-hang\/[^/]+$/.test(req.path) ? 'GET' : undefined) || (checkout ? ({ '/thanh-toan/xem-truoc': 'POST' }[req.path] || (/^\/yeu-cau-dat-hang\/[^/]+$/.test(req.path) ? 'GET' : undefined)) : undefined) || (extended ? ({ '/danh-muc': 'GET', '/san-pham': 'GET', '/khuyen-mai': 'GET', '/gio-hang': 'GET, DELETE', '/gio-hang/items': 'POST' }[req.path]
      || (/^\/san-pham\/[^/]+$/.test(req.path) ? 'GET' : /^\/gio-hang\/items\/[^/]+$/.test(req.path) ? 'PATCH, DELETE' : undefined)) : undefined);
    if (!allowed) return next(new StoreError(404, 'NOT_FOUND'));
    if (!allowed.split(', ').includes(req.method)) { res.set('Allow', allowed); return next(new StoreError(405, 'METHOD_NOT_ALLOWED')); }
    const query = new URL(req.originalUrl, config.storeOrigin).searchParams;
    res.locals.query = storeQuery(query, extended || orders ? kind : 'none');
    res.locals.sid = readSessionCookie(req.headers.cookie);
    res.locals.session = sessions.get(res.locals.sid);
    if (req.method !== 'GET') {
      try { checkCsrf({ origin: req.headers.origin, expectedOrigin: config.storeOrigin, session: res.locals.session, token: req.headers['x-csrf-token'] }); }
      catch (error) { return next(error); }
      if (req.headers['transfer-encoding'] || Number(req.headers['content-length']) > 0) {
        if (!req.is('application/json')) return next(new StoreError(400, 'VALIDATION_ERROR'));
      }
    }
    next();
  });
  router.use(express.json({ limit: '16kb', strict: true }));
  function requireLogin(req, res, next) {
    if (!res.locals.session?.maKH) return next(new StoreError(401, 'AUTH_REQUIRED'));
    next();
  }
  function sessionForRead(res) {
    if (!res.locals.session) {
      const created = sessions.create();
      res.locals.sid = created.sid; res.locals.session = created.session;
      res.cookie(COOKIE_NAME, created.sid, options);
    }
    return res.locals.session;
  }
  router.get('/session', async (req, res) => {
    const session = sessionForRead(res);
    let customer = null;
    if (session.maKH) {
      try { customer = customerDto(await accounts.profile(session.maKH)); }
      catch (error) { if (error.code !== 'AUTH_REQUIRED') throw error; sessions.destroy(res.locals.sid); res.clearCookie(COOKIE_NAME, options); throw error; }
    }
    res.json({ data: { authenticated: Boolean(customer), customer, csrfToken: session.csrfToken } });
  });
  router.post('/auth/dang-ky', async (req, res) => {
    const input = registrationInput(req.body);
    delete req.body.matKhau;
    res.status(201).json({ data: customerDto(await accounts.register(input, req.socket.remoteAddress)) });
  });
  router.post('/auth/dang-nhap', async (req, res) => {
    const input = loginInput(req.body);
    delete req.body.matKhau;
    const profile = customerDto(await accounts.login(input, req.socket.remoteAddress));
    const created = sessions.rotate(res.locals.sid, profile.MaKH);
    res.cookie(COOKIE_NAME, created.sid, options);
    res.json({ data: { customer: profile, csrfToken: created.session.csrfToken } });
  });
  router.post('/auth/dang-xuat', requireLogin, (req, res) => {
    exactBody(req.body ?? {}, []);
    sessions.destroy(res.locals.sid);
    res.clearCookie(COOKIE_NAME, options);
    res.json({ data: { loggedOut: true } });
  });
  router.get('/tai-khoan', requireLogin, async (req, res) => res.json({ data: customerDto(await accounts.profile(res.locals.session.maKH)) }));
  if (orders) {
    router.get('/don-hang', requireLogin, async (req, res) => res.json(await orders.list(res.locals.session.maKH, res.locals.query)));
    router.get('/don-hang/:maHD', requireLogin, async (req, res) => res.json(await orders.detail(res.locals.session.maKH, storeCode(req.params.maHD))));
  }
  if (checkout) {
    router.post('/thanh-toan/xem-truoc', requireLogin, async (req, res) => res.json({ data: await checkout.quote(res.locals.session, quoteInput(req.body)) }));
    router.post('/don-hang', requireLogin, async (req, res) => {
      const result = await checkout.submit(res.locals.session, orderInput(req.body, req.headers['idempotency-key']));
      if (result.status === 202) res.set('Retry-After', '2');
      res.status(result.status).json({ data: result.data });
    });
    router.get('/yeu-cau-dat-hang/:key', requireLogin, async (req, res) => res.json({ data: await checkout.status(res.locals.session.maKH, uuid(req.params.key)) }));
  }
  if (catalog && carts) {
    router.get('/danh-muc', async (req, res) => res.json(await catalog.categories(res.locals.query)));
    router.get('/san-pham', async (req, res) => res.json(await catalog.list(res.locals.query)));
    router.get('/san-pham/:maSP', async (req, res) => res.json({ data: await catalog.detail(storeCode(req.params.maSP)) }));
    router.get('/khuyen-mai', async (req, res) => res.json(await catalog.promotions()));
    router.get('/gio-hang', async (req, res) => res.json({ data: await carts.view(sessionForRead(res)) }));
    router.post('/gio-hang/items', async (req, res) => {
      const input = cartInput(req.body, true);
      res.json({ data: await carts.add(res.locals.session, input.code, input.quantity) });
    });
    router.patch('/gio-hang/items/:maSP', async (req, res) => {
      const input = cartInput(req.body);
      res.json({ data: await carts.set(res.locals.session, storeCode(req.params.maSP), input.quantity) });
    });
    router.delete('/gio-hang/items/:maSP', async (req, res) => {
      exactBody(req.body ?? {}, []);
      res.json({ data: await carts.remove(res.locals.session, storeCode(req.params.maSP)) });
    });
    router.delete('/gio-hang', async (req, res) => {
      exactBody(req.body ?? {}, []);
      res.json({ data: await carts.clear(res.locals.session) });
    });
  }
  router.use(storeErrorHandler);
  return router;
}
