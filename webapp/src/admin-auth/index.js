import express, { Router } from 'express';
import { AdminError, AdminSessions, AdminLimiter, COOKIE, readAdminCookie, checkAdminCsrf, createAdminPasswords, validPassword, validCredential } from './security.js';
import { ROLES, ROLE_PAGES, canRead, canViewSupply, projectResponse } from './policy.js';
import { createAdminRepository } from './repository.js';

function eligible(record) {
  const { account: a, credential: c, employee: e } = record || {};
  return a && c && e && a.TrangThai === 'Hoạt động' && e.TrangThai === 'Đang làm' && a.MaNV !== 'NV_ONLINE' && a.MaNV === e.MaNV && a.MaNV === c.MaNV && a.TenDangNhap === c.TenDangNhap && ROLES.includes(a.VaiTro) && c.TrangThaiBaoMat === 'HoatDong' && Number.isSafeInteger(c.PhienBanXacThuc) && c.PhienBanXacThuc > 0 && validCredential(c);
}
const principal = row => ({ name: row.account.TenDangNhap, maNV: row.account.MaNV, role: row.account.VaiTro, version: row.credential.PhienBanXacThuc });
const profile = row => ({ tenDangNhap: row.account.TenDangNhap, hoTen: row.employee.HoTen, role: row.account.VaiTro, permissions: [...ROLE_PAGES[row.account.VaiTro]], canViewSupply: canViewSupply(row.account.VaiTro) });
export function createAdminAuth({ config, repository = createAdminRepository(config), sessions = new AdminSessions(), limiter = new AdminLimiter(), passwords = createAdminPasswords() }) {
  const origin = config.adminOrigin || `http://localhost:${config.port}`;
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: origin.startsWith('https:'), path: '/', maxAge: 28800000 };
  const router = Router({ caseSensitive: true, strict: true });
  const methods = { '/session': 'GET', '/dang-nhap': 'POST', '/dang-xuat': 'POST' };
  const setCookie = (res, sid) => res.cookie(COOKIE, sid, cookieOptions);
  async function current(sid, touch = false) {
    const session = sessions.get(sid, touch); if (!session?.principal) return null;
    const row = await repository.load(session.principal.name);
    if (!eligible(row) || JSON.stringify(principal(row)) !== JSON.stringify(session.principal)) { sessions.destroy(sid); return null; }
    return { session, row };
  }
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const method = methods[req.path];
    if (!method) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên.' } });
    if (req.method !== method) { res.set('Allow', method); return next(new AdminError(405, 'ADMIN_METHOD_NOT_ALLOWED')); }
    if (new URL(req.originalUrl, origin).searchParams.size) return next(new AdminError(400, 'ADMIN_INVALID_INPUT'));
    res.locals.adminSid = readAdminCookie(req.headers.cookie);
    if (req.method === 'POST') { try { checkAdminCsrf(req.headers.origin, origin, sessions.get(res.locals.adminSid), req.headers['x-csrf-token']); if (!req.is('application/json')) throw new AdminError(400, 'ADMIN_INVALID_INPUT'); } catch (error) { return next(error); } }
    next();
  });
  router.use(express.json({ limit: '4kb', strict: true }));
  router.get('/session', async (req, res) => {
    const live = await current(res.locals.adminSid);
    if (live) return res.json({ data: { authenticated: true, user: profile(live.row), csrfToken: live.session.csrfToken } });
    let session = sessions.get(res.locals.adminSid); if (!session) { const created = sessions.create(); session = created.session; setCookie(res, created.sid); }
    res.json({ data: { authenticated: false, csrfToken: session.csrfToken } });
  });
  router.post('/dang-nhap', async (req, res) => {
    const body = req.body;
    if (!body || Object.getPrototypeOf(body) !== Object.prototype || Object.keys(body).length !== 2 || typeof body.tenDangNhap !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(body.tenDangNhap.trim()) || !validPassword(body.matKhau)) throw new AdminError(400, 'ADMIN_INVALID_INPUT');
    const name = body.tenDangNhap.trim(); const finish = limiter.reserve(req.socket.remoteAddress, name); let success = false;
    try {
      const row = await repository.load(name); const allowed = eligible(row);
      const correct = await passwords.verify(body.matKhau, allowed ? row.credential : null);
      if (!allowed || !correct) throw new AdminError(401, 'ADMIN_INVALID_CREDENTIALS');
      // Recheck after the asynchronous KDF before issuing a new session.
      const checked = await repository.load(name);
      if (!eligible(checked) || JSON.stringify(principal(checked)) !== JSON.stringify(principal(row)) || checked.credential.MatKhauBam !== row.credential.MatKhauBam) throw new AdminError(401, 'ADMIN_INVALID_CREDENTIALS');
      const created = sessions.create(principal(checked)); sessions.destroy(res.locals.adminSid); setCookie(res, created.sid); success = true;
      res.json({ data: { authenticated: true, user: profile(checked), csrfToken: created.session.csrfToken } });
    } finally { finish(success); }
  });
  router.post('/dang-xuat', (req, res) => {
    if (!req.body || Object.getPrototypeOf(req.body) !== Object.prototype || Object.keys(req.body).length) throw new AdminError(400, 'ADMIN_INVALID_INPUT');
    sessions.destroy(res.locals.adminSid); res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined }); res.json({ data: { loggedOut: true } });
  });
  function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    const result = error instanceof AdminError ? error : error.status === 400 || error.status === 413 ? new AdminError(400, 'ADMIN_INVALID_INPUT') : error.status === 429 ? new AdminError(429, 'ADMIN_RATE_LIMIT', 1) : new AdminError(503, 'ADMIN_UNAVAILABLE');
    if (result.retryAfter) res.set('Retry-After', String(result.retryAfter));
    res.status(result.status).json({ error: { code: result.code, message: result.message } });
  }
  router.use(errorHandler);
  return {
    router,
    async authenticate(req, res, next) {
      try { const live = await current(readAdminCookie(req.headers.cookie), true); if (!live) throw new AdminError(401, 'ADMIN_AUTH_REQUIRED'); res.locals.admin = profile(live.row); next(); } catch (error) { errorHandler(error, req, res, next); }
    },
    authorize(resource) {
      return (req, res, next) => {
        if (!canRead(res.locals.admin?.role, resource)) return errorHandler(new AdminError(403, 'ADMIN_FORBIDDEN'), req, res, next);
        const hideSupply = !res.locals.admin.canViewSupply && ['san-pham', 'canh-bao-kho'].includes(resource);
        if (hideSupply && new URL(req.originalUrl, origin).searchParams.has('maNCC')) return errorHandler(new AdminError(403, 'ADMIN_FORBIDDEN'), req, res, next);
        const json = res.json.bind(res); res.json = value => json(projectResponse(value, hideSupply)); next();
      };
    },
    close: () => repository.close?.()
  };
}
