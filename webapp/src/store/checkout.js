import { createHash, randomUUID } from 'node:crypto';
import { StoreError } from './errors.js';
import { productDto, publicProductProjection } from './catalog.js';
import { cartSnapshot, requirePurchasable } from './cart.js';
import { calculateBill, bsonNumber, safeMoney, orderDto } from './checkout-rules.js';
import { createPreflight } from './preflight.js';
import { assertStoreWriteTarget } from './guards.js';
import { assertCheckoutEnabled } from './checkout-safety.js';
import { promotionStatus } from '../utils/dates.js';

const write = { writeConcern: { w: 1, j: true, wtimeoutMS: 5000 } };
const read = { maxTimeMS: 5000 };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pending = { $in: ['DANG_XU_LY', 'CAN_PHUC_HOI'] };
const recoveryError = () => new StoreError(503, 'RECOVERY_PENDING');

export function createCheckout({ config, database, testHooks }) {
  if (testHooks && (config.dbName !== 'QLSieuThiMini_Test' || config.checkoutTestHarness !== true || process.env.STORE_CHECKOUT_API_TESTS !== 'ALLOW_TEST_CHECKOUT')) throw new Error('Test checkout hooks are forbidden outside the guarded harness');
  const clock = testHooks?.clock || (() => new Date());
  const preflight = createPreflight(database);
  let tail = Promise.resolve(); let queued = 0; let abandoned = false;
  const quotes = new WeakMap();
  async function hit(stage, item) { if (testHooks?.hit) await testHooks.hit(stage, item); }
  function serial(job) {
    if (queued >= 16) throw new StoreError(429, 'TOO_MANY_ATTEMPTS', 1);
    queued++;
    const result = tail.then(async () => {
      assertCheckoutEnabled(config); assertStoreWriteTarget(config, config.dbName);
      if (abandoned) throw recoveryError();
      await preflight({ allowPendingOrders: true });
      const db = await database.write(); assertStoreWriteTarget(config, db.databaseName);
      await recoverAll(db);
      return job(db);
    });
    tail = result.catch(() => {});
    return result.finally(() => { queued--; });
  }
  async function customer(db, maKH) {
    const account = await db.collection('TaiKhoanKhachHang').findOne({ MaKH: maKH, TrangThai: 'HoatDong' }, { ...read, projection: { _id: 0, MaKH: 1 } });
    if (!account) throw new StoreError(401, 'AUTH_REQUIRED');
    const row = await db.collection('KhachHang').findOne({ MaKH: maKH }, { ...read, projection: { _id: 0, DiemTichLuy: 1 } });
    if (!row) throw recoveryError();
    return safeMoney(bsonNumber(row.DiemTichLuy));
  }
  async function pricing(db, session, input, now) {
    const snapshot = cartSnapshot(session);
    if (!snapshot.items.length) throw new StoreError(409, 'CART_EMPTY');
    const raw = await db.collection('SanPham').find({ MaSP: { $in: snapshot.items.map(item => item.maSP) } }, { ...read, projection: publicProductProjection }).toArray();
    const byCode = new Map(raw.map(row => [row.MaSP, row]));
    const lines = snapshot.items.map(item => {
      const source = byCode.get(item.maSP);
      if (!source) throw new StoreError(404, 'PRODUCT_NOT_FOUND');
      const product = productDto(source, now); requirePurchasable(product, item.soLuong);
      return { MaSP: product.MaSP, TenSP: product.TenSP, MaDM: product.MaDM, SoLuong: item.soLuong, DonGia: product.DonGiaBan, ThanhTien: product.DonGiaBan * item.soLuong };
    }).sort((a, b) => a.MaSP.localeCompare(b.MaSP));
    let coupon = null;
    if (input.code) {
      coupon = await db.collection('KhuyenMai').findOne({ MaKM: input.code }, { ...read, projection: { _id: 0, MaKM: 1, TenKM: 1, GiaTri: 1, LoaiKhuyenMai: 1, DieuKien: 1, NgayBatDau: 1, NgayKetThuc: 1, TrangThai: 1 } });
      if (!coupon) throw new StoreError(409, 'PROMOTION_NOT_FOUND');
      if (coupon.DieuKien?.MaDM && !await db.collection('DanhMuc').findOne({ MaDM: coupon.DieuKien.MaDM }, { ...read, projection: { _id: 1 } })) throw new StoreError(409, 'PROMOTION_NOT_ELIGIBLE');
    }
    const points = await customer(db, session.maKH);
    const bill = calculateBill(lines, coupon, points, now);
    const identity = { lines, bill, address: input.address, method: input.method,
      coupon: coupon ? { MaKM: coupon.MaKM, GiaTri: coupon.GiaTri, LoaiKhuyenMai: coupon.LoaiKhuyenMai, DieuKien: coupon.DieuKien, NgayBatDau: coupon.NgayBatDau, NgayKetThuc: coupon.NgayKetThuc } : null };
    return { lines, bill, coupon, sources: byCode, revision: snapshot.revision, fingerprint: digest(identity) };
  }
  function validateItem(item) {
    const order = item.Snapshot?.HoaDon;
    if (!order || order.MaHD !== item.MaHD || order.MaKH !== item.MaKH || order.MaChongGuiTrung !== item.MaChongGuiTrung || order.MaBaoGia !== item.MaBaoGia || !Array.isArray(order.ChiTiet) || !order.ChiTiet.length || order.ChiTiet.length > 50) throw recoveryError();
    const seen = new Set();
    for (const line of order.ChiTiet) {
      if (typeof line.MaSP !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(line.MaSP) || seen.has(line.MaSP) || !Number.isInteger(line.SoLuong) || line.SoLuong < 1 || line.SoLuong > 99) throw recoveryError();
      seen.add(line.MaSP);
    }
    safeMoney(order.ThanhTien);
    if (order.DiemDuocCong !== Math.floor(order.ThanhTien / 10000)) throw recoveryError();
    return order;
  }
  async function published(db, item) {
    return db.collection('HoaDon').findOne({ MaHD: item.MaHD, MaKH: item.MaKH, MaChongGuiTrung: item.MaChongGuiTrung, MaBaoGia: item.MaBaoGia, NguonDon: 'ONLINE' }, read);
  }
  async function finish(db, item, order) {
    validateItem(item);
    // A published order must retain evidence that all stock was reserved.
    for (const line of order.ChiTiet) {
      if (!await db.collection('SanPham').findOne({ MaSP: line.MaSP, GiuChoOnline: { $elemMatch: { MaYeuCau: item.MaYeuCau, SoLuong: line.SoLuong } } }, { ...read, projection: { _id: 1 } })) throw recoveryError();
    }
    const result = await db.collection('KhachHang').updateOne({ MaKH: item.MaKH, DiemDaCongOnline: { $ne: order.MaHD }, DiemTichLuy: { $lte: Number.MAX_SAFE_INTEGER - order.DiemDuocCong } },
      { $inc: { DiemTichLuy: order.DiemDuocCong }, $addToSet: { DiemDaCongOnline: order.MaHD } }, write);
    if (!result.matchedCount && !await db.collection('KhachHang').findOne({ MaKH: item.MaKH, DiemDaCongOnline: order.MaHD }, { ...read, projection: { _id: 1 } })) throw recoveryError();
    await hit('after-points', item);
    await db.collection('HoaDon').updateOne({ MaHD: item.MaHD, MaKH: item.MaKH }, { $set: { TrangThaiTichDiem: 'DaCong' } }, write);
    const complete = await db.collection('YeuCauCuaHang').updateOne({ MaYeuCau: item.MaYeuCau, Loai: 'DAT_HANG' }, { $set: { TrangThai: 'HOAN_TAT', Buoc: 'HOAN_TAT', NgayCapNhat: new Date() } }, write);
    if (complete.matchedCount !== 1) throw recoveryError();
    await hit('after-complete', item);
  }
  async function rollback(db, item, reason) {
    const order = validateItem(item);
    if (await published(db, item)) throw recoveryError();
    for (const line of order.ChiTiet) {
      await db.collection('SanPham').updateOne({ MaSP: line.MaSP, GiuChoOnline: { $elemMatch: { MaYeuCau: item.MaYeuCau, SoLuong: line.SoLuong } } },
        { $inc: { SoLuongTon: line.SoLuong }, $pull: { GiuChoOnline: { MaYeuCau: item.MaYeuCau, SoLuong: line.SoLuong } } }, write);
      if (await db.collection('SanPham').findOne({ MaSP: line.MaSP, 'GiuChoOnline.MaYeuCau': item.MaYeuCau }, { ...read, projection: { _id: 1 } })) throw recoveryError();
    }
    const result = await db.collection('YeuCauCuaHang').updateOne({ MaYeuCau: item.MaYeuCau, Loai: 'DAT_HANG' },
      { $set: { TrangThai: 'THAT_BAI', Buoc: 'DA_HOAN_TAC', Loi: reason, NgayCapNhat: new Date() } }, write);
    if (result.matchedCount !== 1) throw recoveryError();
  }
  async function repair(db, item, reason = 'RECOVERY_ABORTED') {
    const order = await published(db, item);
    if (order) await finish(db, item, order); else await rollback(db, item, reason);
  }
  async function recoverAll(db) {
    const items = await db.collection('YeuCauCuaHang').find({ Loai: 'DAT_HANG', TrangThai: pending }, read).limit(101).toArray();
    if (items.length > 100) throw recoveryError();
    for (const item of items) { try { await repair(db, item); } catch { throw recoveryError(); } }
  }
  function reconcileCart(session, item, success) {
    const cart = session.cart;
    if (cart?.id === item.Snapshot?.CartId) {
      if (success && cart.revision === item.Snapshot.CartRevision) { cart.items.clear(); cart.revision++; }
      if (cart.lockedBy === item.MaYeuCau) delete cart.lockedBy;
    }
  }
  async function response(db, session, item, status = 200) {
    if (item.TrangThai === 'THAT_BAI') { reconcileCart(session, item, false); throw new StoreError(409, item.Loi || 'RECOVERY_ABORTED'); }
    const order = await published(db, item);
    if (item.TrangThai === 'HOAN_TAT') { if (!order || order.TrangThaiTichDiem !== 'DaCong') throw recoveryError(); reconcileCart(session, item, true); }
    return { status: item.TrangThai === 'HOAN_TAT' ? status : 202, data: { trangThai: item.TrangThai, key: item.MaChongGuiTrung, ...(order ? { hoaDon: orderDto(order) } : {}) } };
  }
  return Object.freeze({
    quote(session, input) {
      return serial(async db => {
        const cart = session.cart;
        if (cart?.lockedBy) {
          const old = await db.collection('YeuCauCuaHang').findOne({ MaYeuCau: cart.lockedBy, MaKH: session.maKH }, read);
          if (old && ['HOAN_TAT', 'THAT_BAI'].includes(old.TrangThai)) reconcileCart(session, old, old.TrangThai === 'HOAN_TAT');
          else throw new StoreError(409, 'CART_BUSY');
        }
        const now = clock(); const priced = await pricing(db, session, input, now);
        const quote = { id: randomUUID(), maKH: session.maKH, cartId: cart.id, ...priced, input, expires: new Date(now.getTime() + 300000) };
        let memory = quotes.get(cart); if (!memory) { memory = new Map(); quotes.set(cart, memory); }
        for (const [key, value] of memory) if (value.expires < now) memory.delete(key);
        if (memory.size >= 5) memory.delete(memory.keys().next().value);
        memory.set(quote.id, quote);
        return { maBaoGia: quote.id, hetHanLuc: quote.expires, revision: quote.revision, ChiTiet: quote.lines, ...quote.bill,
          DiaChiGiao: input.address, PhuongThucThanhToan: input.method,
          KhuyenMai: quote.coupon ? { MaKM: quote.coupon.MaKM, TenKM: quote.coupon.TenKM, NgayBatDau: quote.coupon.NgayBatDau, NgayKetThuc: quote.coupon.NgayKetThuc, TrangThai: quote.coupon.TrangThai,
            TrangThaiTinhToan: promotionStatus(quote.coupon.NgayBatDau, quote.coupon.NgayKetThuc, now) } : null };
      });
    },
    submit(session, { quoteId, key }) {
      return serial(async db => {
        const journal = db.collection('YeuCauCuaHang');
        const existing = await journal.findOne({ Loai: 'DAT_HANG', MaKH: session.maKH, MaChongGuiTrung: key }, read);
        if (existing) {
          if (existing.MaBaoGia !== quoteId) throw new StoreError(409, 'IDEMPOTENCY_CONFLICT');
          return response(db, session, existing);
        }
        if (await journal.findOne({ Loai: 'DAT_HANG', MaKH: session.maKH, MaBaoGia: quoteId }, { ...read, projection: { _id: 1 } })) throw new StoreError(409, 'QUOTE_ALREADY_USED');
        const cart = session.cart; const quote = cart && quotes.get(cart)?.get(quoteId); const now = clock();
        if (!quote || quote.maKH !== session.maKH || now >= quote.expires) throw new StoreError(409, 'QUOTE_EXPIRED');
        if (cart.lockedBy) throw new StoreError(409, 'CART_BUSY');
        const priced = await pricing(db, session, quote.input, now);
        if (quote.fingerprint !== priced.fingerprint || cart.revision !== quote.revision || cart.id !== quote.cartId) throw new StoreError(409, 'QUOTE_CHANGED');
        let maHD;
        for (let attempt = 0; attempt < 3; attempt++) {
          maHD = 'HD_ONL_' + randomUUID().replaceAll('-', '');
          if (!await db.collection('HoaDon').findOne({ MaHD: maHD }, { ...read, projection: { _id: 1 } })) break;
          maHD = null;
        }
        if (!maHD) throw recoveryError();
        // Recheck revision after async reads, then lock before any stock write.
        if (cart.revision !== quote.revision || cart.lockedBy) throw new StoreError(409, 'QUOTE_CHANGED');
        const order = { MaHD: maHD, MaKH: session.maKH, MaNV: 'NV_ONLINE', NgayLap: now, ChiTiet: priced.lines, ...priced.bill,
          ...(quote.input.code ? { MaKM: quote.input.code } : {}), PhuongThucThanhToan: quote.input.method, NguonDon: 'ONLINE', TrangThaiDon: 'Đã xác nhận',
          DiaChiGiao: quote.input.address, MaChongGuiTrung: key, MaBaoGia: quoteId, ThanhToanGiaLap: true, TrangThaiThanhToan: 'Đã thanh toán giả lập',
          MaGiaoDichGiaLap: randomUUID(), TrangThaiTichDiem: 'ChoXuLy' };
        const item = { MaYeuCau: randomUUID(), Loai: 'DAT_HANG', MaKH: session.maKH, MaHD: maHD, MaChongGuiTrung: key, MaBaoGia: quoteId,
          DauVanTay: quote.fingerprint, TrangThai: 'DANG_XU_LY', Buoc: 'BAT_DAU', NgayTao: now, NgayCapNhat: now, GiuHang: [],
          Snapshot: { HoaDon: order, CartId: cart.id, CartRevision: quote.revision } };
        cart.lockedBy = item.MaYeuCau;
        try {
          await journal.insertOne(item, write);
          await hit('after-journal', item);
          for (let index = 0; index < priced.lines.length; index++) {
            const line = priced.lines[index]; const source = priced.sources.get(line.MaSP);
            await hit(`before-hold:${index}`, item);
            const result = await db.collection('SanPham').updateOne({ MaSP: line.MaSP, SoLuongTon: { $gte: line.SoLuong },
              DonGiaBan: source.DonGiaBan, TenSP: source.TenSP, MaDM: source.MaDM, TrangThai: source.TrangThai,
              HanSuDung: source.HanSuDung ?? { $exists: false }, GiuChoOnline: { $not: { $elemMatch: { MaYeuCau: item.MaYeuCau } } } },
              { $inc: { SoLuongTon: -line.SoLuong }, $push: { GiuChoOnline: { MaYeuCau: item.MaYeuCau, SoLuong: line.SoLuong } } }, write);
            if (result.matchedCount !== 1) throw new StoreError(409, 'INSUFFICIENT_STOCK');
            await hit(`after-hold:${index}`, item);
          }
          await hit('before-insert', item);
          await db.collection('HoaDon').insertOne(order, write);
          await hit('after-insert', item);
          await finish(db, item, order);
        } catch (error) {
          if (testHooks && error.code === 'SIMULATED_TEST_CRASH') { abandoned = true; return { status: 202, data: { trangThai: 'DANG_XU_LY', key } }; }
          try {
            const persisted = await journal.findOne({ MaYeuCau: item.MaYeuCau, MaKH: session.maKH, Loai: 'DAT_HANG' }, read);
            if (!persisted) { delete cart.lockedBy; throw error; }
            await repair(db, persisted, error instanceof StoreError ? error.code : 'RECOVERY_ABORTED');
          } catch { throw recoveryError(); }
        }
        const final = await journal.findOne({ MaYeuCau: item.MaYeuCau, MaKH: session.maKH }, read);
        return response(db, session, final, 201);
      });
    },
    async status(maKH, key) {
      const db = await database.read();
      const item = await db.collection('YeuCauCuaHang').findOne({ Loai: 'DAT_HANG', MaKH: maKH, MaChongGuiTrung: key }, read);
      if (!item) throw new StoreError(404, 'REQUEST_NOT_FOUND');
      const order = await published(db, item);
      return { trangThai: item.TrangThai, key, ...(order ? { hoaDon: orderDto(order) } : {}), ...(item.TrangThai === 'THAT_BAI' ? { error: { code: item.Loi, message: 'Yêu cầu chưa tạo đơn; phần giữ tồn đã được hoàn tác.' } } : {}) };
    }
  });
}
