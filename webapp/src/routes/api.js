import { Router } from 'express';
import { schemas, validate, codeValue } from '../middleware/validate.js';
import { listCatalog, paymentOptions } from '../services/catalog.service.js';
import { dashboard } from '../services/dashboard.service.js';
import { listProducts, productDetail, createProduct, updateProduct, deleteProduct } from '../services/products.service.js';
import { listInventory } from '../services/inventory.service.js';
import { listInvoices, invoiceDetail, updateOrderStatus } from '../services/invoices.service.js';
import { createPromotion, updatePromotion, deletePromotion } from '../services/promotions.service.js';
import { listEmployeesWithAccounts, createEmployee, updateEmployee, deleteEmployee, listCustomerAccounts } from '../services/employees.service.js';
import { listPurchases, purchaseDetail } from '../services/purchases.service.js';
import { listCustomers, customerDetail, createCustomer, updateCustomer, deleteCustomer } from '../services/customers.service.js';
import { listEmployees, listPromotions, salesOverview, revenueReport, productReport, customerReport } from '../services/analytics.service.js';
import { checkIntegrity } from '../services/integrity.service.js';
import { ROUTE_POLICIES } from '../admin-auth/policy.js';

export function createApi(db, adminAuth) {
  const router = Router({ caseSensitive: true, strict: true });
  // Every registration goes through this default-deny policy wrapper.
  const get = (path, ...handlers) => router.get(path, adminAuth.authorize(ROUTE_POLICIES[path]), ...handlers);
  for (const [path, schema, handler] of [
    ['/khuyen-mai', { ...schemas.search, ...schemas.promotions, ...schemas.pagination }, listPromotions],
    ['/bao-cao/tong-quan', schemas.dates, salesOverview],
    ['/bao-cao/doanh-thu', { ...schemas.dates, ...schemas.revenueReport, ...schemas.pagination }, revenueReport],
    ['/bao-cao/san-pham', { ...schemas.dates, ...schemas.productReport, ...schemas.pagination }, productReport],
    ['/bao-cao/khach-hang', { ...schemas.dates, ...schemas.customerReport, ...schemas.pagination }, customerReport],
    ['/kiem-tra-du-lieu', { ...schemas.integrity, ...schemas.pagination }, checkIntegrity]
  ]) get(path, validate(schema), async (req, res) => res.json(await handler(db, res.locals.query)));

  get('/nhan-vien', validate({ ...schemas.search, ...schemas.pagination }), async (req, res) => {
    const result = await listEmployeesWithAccounts(db, res.locals.query);
    res.json({
      data: result.data,
      pagination: { page: 1, limit: Math.max(1, result.total), total: result.total, totalPages: 1 },
      meta: { updatedAt: new Date().toISOString() }
    });
  });

  get('/tai-khoan-khach-hang', validate(), async (req, res) => {
    const result = await listCustomerAccounts(db, res.locals.query);
    res.json({
      data: result.data,
      pagination: { page: 1, limit: Math.max(1, result.total), total: result.total, totalPages: 1 },
      meta: { updatedAt: new Date().toISOString() }
    });
  });
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

  // Update order status (Fulfillment)
  router.patch('/hoa-don/:maHD/trang-thai', adminAuth.authorize('hoa-don'), async (req, res) => {
    try {
      const maHD = codeValue(req.params.maHD, 'maHD');
      const { trangThai } = req.body || {};
      if (!trangThai) {
        return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Trạng thái đơn không được để trống.' } });
      }
      const result = await updateOrderStatus(db, maHD, trangThai);
      if (!result.ok) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: result.message } });
      }
      res.json({ data: result.data, message: 'Cập nhật trạng thái đơn hàng thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'ORDER_UPDATE_ERROR', message: err.message } });
    }
  });

  // Product CRUD
  router.post('/san-pham', adminAuth.authorize('san-pham'), async (req, res) => {
    try {
      if (!['Quản trị', 'Kho'].includes(res.locals.admin?.role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị hoặc Kho mới có quyền thêm sản phẩm.' } });
      }
      const created = await createProduct(db, req.body);
      res.status(201).json({ data: created.data, message: 'Thêm sản phẩm mới thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'CREATE_PRODUCT_ERROR', message: err.message } });
    }
  });

  router.put('/san-pham/:maSP', adminAuth.authorize('san-pham'), async (req, res) => {
    try {
      if (!['Quản trị', 'Kho'].includes(res.locals.admin?.role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị hoặc Kho mới có quyền cập nhật sản phẩm.' } });
      }
      const maSP = codeValue(req.params.maSP, 'maSP');
      const updated = await updateProduct(db, maSP, req.body);
      res.json({ data: updated.data, message: 'Cập nhật sản phẩm thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'UPDATE_PRODUCT_ERROR', message: err.message } });
    }
  });

  router.delete('/san-pham/:maSP', adminAuth.authorize('san-pham'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền xóa sản phẩm.' } });
      }
      const maSP = codeValue(req.params.maSP, 'maSP');
      const result = await deleteProduct(db, maSP);
      res.json({ data: result, message: result.message });
    } catch (err) {
      res.status(400).json({ error: { code: 'DELETE_PRODUCT_ERROR', message: err.message } });
    }
  });

  // Promotion CRUD (Quản trị only)
  router.post('/khuyen-mai', adminAuth.authorize('khuyen-mai'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền tạo mã khuyến mãi.' } });
      }
      const created = await createPromotion(db, req.body);
      res.status(201).json({ data: created, message: 'Tạo mã khuyến mãi mới thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'CREATE_PROMOTION_ERROR', message: err.message } });
    }
  });

  router.put('/khuyen-mai/:maKM', adminAuth.authorize('khuyen-mai'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền chỉnh sửa mã khuyến mãi.' } });
      }
      const maKM = codeValue(req.params.maKM, 'maKM');
      const updated = await updatePromotion(db, maKM, req.body);
      res.json({ data: updated, message: 'Cập nhật mã khuyến mãi thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'UPDATE_PROMOTION_ERROR', message: err.message } });
    }
  });

  router.delete('/khuyen-mai/:maKM', adminAuth.authorize('khuyen-mai'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền xóa mã khuyến mãi.' } });
      }
      const maKM = codeValue(req.params.maKM, 'maKM');
      const result = await deletePromotion(db, maKM);
      res.json({ data: result, message: result.message });
    } catch (err) {
      res.status(400).json({ error: { code: 'DELETE_PROMOTION_ERROR', message: err.message } });
    }
  });

  // Employee CRUD (Quản trị only)
  router.post('/nhan-vien', adminAuth.authorize('nhan-vien'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền thêm nhân viên & cấp tài khoản.' } });
      }
      const created = await createEmployee(db, req.body);
      res.status(201).json({ data: created, message: 'Thêm nhân viên và cấp tài khoản thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'CREATE_EMPLOYEE_ERROR', message: err.message } });
    }
  });

  router.put('/nhan-vien/:maNV', adminAuth.authorize('nhan-vien'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền chỉnh sửa nhân viên & tài khoản.' } });
      }
      const maNV = codeValue(req.params.maNV, 'maNV');
      const updated = await updateEmployee(db, maNV, req.body);
      res.json({ data: updated, message: 'Cập nhật nhân viên và tài khoản thành công!' });
    } catch (err) {
      res.status(400).json({ error: { code: 'UPDATE_EMPLOYEE_ERROR', message: err.message } });
    }
  });

  router.delete('/nhan-vien/:maNV', adminAuth.authorize('nhan-vien'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền xóa / khóa nhân viên.' } });
      }
      const maNV = codeValue(req.params.maNV, 'maNV');
      const result = await deleteEmployee(db, maNV);
      res.json({ data: result, message: result.message });
    } catch (err) {
      res.status(400).json({ error: { code: 'DELETE_EMPLOYEE_ERROR', message: err.message } });
    }
  });

  // Customer CRUD
  router.post('/khach-hang', adminAuth.authorize('khach-hang'), async (req, res) => {
    try {
      if (!['Quản trị', 'Thu ngân', 'Bán hàng'].includes(res.locals.admin?.role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thêm khách hàng mới.' } });
      }
      const created = await createCustomer(db, req.body);
      res.status(201).json({ data: created.data, message: created.message });
    } catch (err) {
      res.status(400).json({ error: { code: 'CREATE_CUSTOMER_ERROR', message: err.message } });
    }
  });

  router.put('/khach-hang/:maKH', adminAuth.authorize('khach-hang'), async (req, res) => {
    try {
      if (!['Quản trị', 'Thu ngân', 'Bán hàng'].includes(res.locals.admin?.role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bạn không có quyền cập nhật khách hàng.' } });
      }
      const maKH = codeValue(req.params.maKH, 'maKH');
      const isAdmin = res.locals.admin?.role === 'Quản trị';
      const updated = await updateCustomer(db, maKH, req.body, isAdmin);
      res.json({ data: updated.data, message: updated.message });
    } catch (err) {
      res.status(400).json({ error: { code: 'UPDATE_CUSTOMER_ERROR', message: err.message } });
    }
  });

  router.delete('/khach-hang/:maKH', adminAuth.authorize('khach-hang'), async (req, res) => {
    try {
      if (res.locals.admin?.role !== 'Quản trị') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Quản trị mới có quyền xóa khách hàng.' } });
      }
      const maKH = codeValue(req.params.maKH, 'maKH');
      const result = await deleteCustomer(db, maKH);
      res.json({ data: result, message: result.message });
    } catch (err) {
      res.status(400).json({ error: { code: 'DELETE_CUSTOMER_ERROR', message: err.message } });
    }
  });

  return router;
}
