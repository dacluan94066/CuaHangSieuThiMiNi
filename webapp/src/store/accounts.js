import { randomUUID } from 'node:crypto';
import { StoreError, customerDto } from './errors.js';
import { createPasswordService } from './passwords.js';
import { AttemptLimiter } from './rate-limit.js';
import { createPreflight } from './preflight.js';
import { assertStoreWriteTarget } from './guards.js';

const readOptions = { maxTimeMS: 5000 };
const customerProjection = { _id: 0, MaKH: 1, HoTen: 1, SDT: 1, Email: 1, DiaChi: 1, DiemTichLuy: 1, NgayDangKy: 1 };
const newCode = prefix => prefix + randomUUID().replaceAll('-', '');
const writeOptions = { writeConcern: { w: 1, j: true, wtimeoutMS: 5000 } };
const unavailable = () => new StoreError(503, 'RECOVERY_PENDING');

export function createAccounts({ config, database, passwords = createPasswordService(), limiter = new AttemptLimiter(), preflight = createPreflight(database) }) {
  let tail = Promise.resolve();
  let waiting = 0;
  function serial(job) {
    if (waiting >= 8) throw new StoreError(429, 'TOO_MANY_ATTEMPTS', 1);
    waiting++;
    const result = tail.then(job);
    tail = result.catch(() => {});
    return result.finally(() => { waiting--; });
  }
  async function ownProfile(db, maKH) {
    const customer = await db.collection('KhachHang').findOne({ MaKH: maKH }, { ...readOptions, projection: customerProjection });
    if (!customer) throw unavailable();
    return customerDto(customer);
  }
  async function recoverOne(db, item) {
    const accounts = db.collection('TaiKhoanKhachHang');
    const customers = db.collection('KhachHang');
    const journal = db.collection('YeuCauCuaHang');
    const owned = { MaYeuCauDangKy: item.MaYeuCau, MaKH: item.MaKH };
    const account = await accounts.findOne({ MaTKKH: item.MaTKKH, ...owned }, { ...readOptions, projection: { _id: 0, TrangThai: 1, SDT: 1 } });
    const customer = await customers.findOne(owned, { ...readOptions, projection: { _id: 0, SDT: 1 } });
    if (account?.TrangThai === 'HoatDong') {
      if (!customer || customer.SDT !== account.SDT) throw unavailable();
      const updated = await journal.updateOne({ MaYeuCau: item.MaYeuCau, Loai: 'DANG_KY' }, { $set: { TrangThai: 'HOAN_TAT', Buoc: 'HOAN_TAT', NgayCapNhat: new Date() } }, writeOptions);
      if (updated.matchedCount !== 1) throw unavailable();
      return 'HOAN_TAT';
    }
    if (account && account.TrangThai !== 'DangTao') throw unavailable();
    // These predicates cannot delete legacy or another registration's records.
    await customers.deleteOne({ ...owned, NguonTao: 'ONLINE' }, writeOptions);
    await accounts.deleteOne({ MaTKKH: item.MaTKKH, ...owned, TrangThai: 'DangTao' }, writeOptions);
    await journal.updateOne({ MaYeuCau: item.MaYeuCau, Loai: 'DANG_KY' }, { $set: { TrangThai: 'THAT_BAI', Buoc: 'DA_HOAN_TAC', Loi: 'REGISTRATION_UNAVAILABLE', NgayCapNhat: new Date() } }, writeOptions);
    return 'THAT_BAI';
  }
  async function recover(db) {
    const pending = await db.collection('YeuCauCuaHang').find({ Loai: 'DANG_KY', TrangThai: { $in: ['DANG_XU_LY', 'CAN_PHUC_HOI'] } },
      { ...readOptions, projection: { _id: 0, MaYeuCau: 1, MaKH: 1, MaTKKH: 1 } }).limit(101).toArray();
    if (pending.length > 100) throw unavailable();
    for (const item of pending) {
      if (!item.MaKH?.startsWith('KH_ONL_') || !item.MaTKKH?.startsWith('TKKH_') || !item.MaYeuCau) throw unavailable();
      await recoverOne(db, item);
    }
  }
  return Object.freeze({
    async profile(maKH) {
      await preflight({ allowPendingOrders: true });
      try {
        const db = await database.read();
        const account = await db.collection('TaiKhoanKhachHang').findOne({ MaKH: maKH, TrangThai: 'HoatDong' }, { ...readOptions, projection: { _id: 0, MaKH: 1 } });
        if (!account) throw new StoreError(401, 'AUTH_REQUIRED');
        return await ownProfile(db, maKH);
      } catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(503, 'DATABASE_UNAVAILABLE'); }
    },
    async login(input, ip) {
      // Reserve attempts before any lookup/KDF so parallel requests cannot bypass limits.
      limiter.consume(ip, input.sdt);
      await preflight({ allowPendingOrders: true });
      try {
        const db = await database.read();
        const account = await db.collection('TaiKhoanKhachHang').findOne({ SDT: input.sdt }, {
          ...readOptions, projection: { _id: 0, MaKH: 1, TrangThai: 1, MatKhauBam: 1, Salt: 1, ThamSoBam: 1 }
        });
        const valid = await passwords.verify(input.matKhau, account?.TrangThai === 'HoatDong' ? account : null);
        if (!valid || account?.TrangThai !== 'HoatDong') throw new StoreError(401, 'INVALID_CREDENTIALS');
        const profile = await ownProfile(db, account.MaKH);
        limiter.success(ip, input.sdt);
        return profile;
      } catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(503, 'DATABASE_UNAVAILABLE'); }
    },
    async register(input, ip) {
      assertStoreWriteTarget(config, config.dbName);
      limiter.consume(ip, input.sdt, 'register');
      return serial(async () => {
        await preflight({ allowRegistrationRecovery: true });
        const db = await database.write();
        assertStoreWriteTarget(config, db.databaseName);
        try { await recover(db); } catch { throw unavailable(); }
        const accounts = db.collection('TaiKhoanKhachHang');
        const customers = db.collection('KhachHang');
        const journal = db.collection('YeuCauCuaHang');
        let item;
        try {
          const secret = await passwords.hash(input.matKhau);
          const existingAccount = await accounts.findOne({ SDT: input.sdt }, { ...readOptions, projection: { _id: 1 } });
          const existingCustomer = await customers.findOne({ SDT: input.sdt }, { ...readOptions, projection: { _id: 1 } });
          if (existingAccount || existingCustomer) throw new StoreError(409, 'REGISTRATION_UNAVAILABLE');
          // Bound UUID collision retries before beginning a journal-owned operation.
          let maKH; let maTKKH;
          for (let attempt = 0; attempt < 3; attempt++) {
            maKH = newCode('KH_ONL_'); maTKKH = newCode('TKKH_');
            if (!await customers.findOne({ MaKH: maKH }, { ...readOptions, projection: { _id: 1 } }) && !await accounts.findOne({ MaTKKH: maTKKH }, { ...readOptions, projection: { _id: 1 } })) break;
            maKH = null;
          }
          if (!maKH) throw unavailable();
          const now = new Date();
          item = { MaYeuCau: randomUUID(), Loai: 'DANG_KY', MaKH: maKH, MaTKKH: maTKKH, TrangThai: 'DANG_XU_LY', Buoc: 'BAT_DAU', NgayTao: now, NgayCapNhat: now };
          await journal.insertOne({ ...item }, writeOptions);
          await accounts.insertOne({ MaTKKH: maTKKH, MaKH: maKH, SDT: input.sdt, ...secret, TrangThai: 'DangTao', MaYeuCauDangKy: item.MaYeuCau, NgayTao: now, NgayCapNhat: now }, writeOptions);
          await customers.insertOne({ MaKH: maKH, HoTen: input.hoTen, SDT: input.sdt, ...(input.email ? { Email: input.email } : {}), ...(input.diaChi ? { DiaChi: input.diaChi } : {}),
            DiemTichLuy: 0, NgayDangKy: now, NguonTao: 'ONLINE', MaYeuCauDangKy: item.MaYeuCau }, writeOptions);
          const activated = await accounts.updateOne({ MaTKKH: maTKKH, MaYeuCauDangKy: item.MaYeuCau, TrangThai: 'DangTao' }, { $set: { TrangThai: 'HoatDong', NgayCapNhat: new Date() } }, writeOptions);
          if (activated.matchedCount !== 1) throw unavailable();
          if (await recoverOne(db, item) !== 'HOAN_TAT') throw unavailable();
          return await ownProfile(db, maKH);
        } catch (error) {
          if (item) {
            try {
              // First read persisted evidence. Unknown write outcome is never guessed.
              const persisted = await journal.findOne({ MaYeuCau: item.MaYeuCau, Loai: 'DANG_KY', MaKH: item.MaKH, MaTKKH: item.MaTKKH }, readOptions);
              if (!persisted) throw unavailable();
              if (await recoverOne(db, item) === 'HOAN_TAT') return await ownProfile(db, item.MaKH);
            } catch { throw unavailable(); }
          }
          if (error instanceof StoreError) throw error;
          if (error.code === 11000) throw new StoreError(409, 'REGISTRATION_UNAVAILABLE');
          throw new StoreError(503, 'DATABASE_UNAVAILABLE');
        }
      });
    }
  });
}
