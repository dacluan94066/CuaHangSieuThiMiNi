import { Router } from 'express';
import { schemas, validate, codeValue } from '../middleware/validate.js';
import { listCatalog, paymentOptions } from '../services/catalog.service.js';
import { dashboard } from '../services/dashboard.service.js';
import { listProducts, productDetail } from '../services/products.service.js';
import { listInventory } from '../services/inventory.service.js';
import { listInvoices, invoiceDetail } from '../services/invoices.service.js';
import { listPurchases, purchaseDetail } from '../services/purchases.service.js';
import { listCustomers, customerDetail } from '../services/customers.service.js';
import { listEmployees, listPromotions, salesOverview, revenueReport, productReport, customerReport } from '../services/analytics.service.js';
import { checkIntegrity } from '../services/integrity.service.js';
import { ROUTE_POLICIES } from '../admin-auth/policy.js';

export function createApi(db, adminAuth) {
  const router = Router({ caseSensitive: true, strict: true });
  // Every registration goes through this default-deny policy wrapper.
  const get = (path, ...handlers) => router.get(path, adminAuth.authorize(ROUTE_POLICIES[path]), ...handlers);
  for (const [path, schema, handler] of [
    ['/nhan-vien', { ...schemas.search, ...schemas.dates, ...schemas.pagination }, listEmployees],
    ['/khuyen-mai', { ...schemas.search, ...schemas.promotions, ...schemas.pagination }, listPromotions],
    ['/bao-cao/tong-quan', schemas.dates, salesOverview],
    ['/bao-cao/doanh-thu', { ...schemas.dates, ...schemas.revenueReport, ...schemas.pagination }, revenueReport],
    ['/bao-cao/san-pham', { ...schemas.dates, ...schemas.productReport, ...schemas.pagination }, productReport],
    ['/bao-cao/khach-hang', { ...schemas.dates, ...schemas.customerReport, ...schemas.pagination }, customerReport],
    ['/kiem-tra-du-lieu', { ...schemas.integrity, ...schemas.pagination }, checkIntegrity]
  ]) get(path, validate(schema), async (req, res) => res.json(await handler(db, res.locals.query)));
  get('/health', validate(), async (req, res) => {
    await (await db.collection('DanhMuc')).countDocuments({}, { limit: 1 });
    res.json({ data: { status: 'ok', database: 'connected', readOnly: true } });
  });
  for (const [path, name] of [['/danh-muc', 'DanhMuc'], ['/nha-cung-cap', 'NhaCungCap']]) {
    get(path, validate({ ...schemas.pagination, ...schemas.search }), async (req, res) => res.json(await listCatalog(db, name, res.locals.query)));
  }
  get('/phuong-thuc-thanh-toan', validate(schemas.pagination), async (req, res) => res.json(await paymentOptions(db, res.locals.query)));
  get('/dashboard', validate(schemas.dates), async (req, res) => res.json(await dashboard(db, res.locals.query)));
  get('/san-pham', validate({ ...schemas.pagination, ...schemas.search, ...schemas.products }), async (req, res) => res.json(await listProducts(db, res.locals.query)));
  get('/san-pham/:maSP', validate(), async (req, res) => {
    const result = await productDetail(db, codeValue(req.params.maSP));
    if (!result) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm.' } });
    res.json(result);
  });
  get('/canh-bao-kho', validate({ ...schemas.pagination, ...schemas.search, ...schemas.inventory }), async (req, res) => res.json(await listInventory(db, res.locals.query)));
  get('/hoa-don', validate({ ...schemas.pagination, ...schemas.search, ...schemas.dates, ...schemas.invoices }), async (req, res) => res.json(await listInvoices(db, res.locals.query)));
  get('/phieu-nhap', validate({ ...schemas.pagination, ...schemas.search, ...schemas.dates, ...schemas.purchases }), async (req, res) => res.json(await listPurchases(db, res.locals.query)));
  get('/khach-hang', validate({ ...schemas.pagination, ...schemas.search }), async (req, res) => res.json(await listCustomers(db, res.locals.query)));
  for (const [path, param, reader, title] of [
    ['/hoa-don/:maHD', 'maHD', invoiceDetail, 'hóa đơn'],
    ['/phieu-nhap/:maPN', 'maPN', purchaseDetail, 'phiếu nhập'],
    ['/khach-hang/:maKH', 'maKH', customerDetail, 'khách hàng']
  ]) {
    get(path, validate(), async (req, res) => {
      const result = await reader(db, codeValue(req.params[param], param));
      if (!result) return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Không tìm thấy ${title}.` } });
      res.json(result);
    });
  }
  return router;
}
