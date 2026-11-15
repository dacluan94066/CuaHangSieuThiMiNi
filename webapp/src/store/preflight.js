import { baseCollections, baseUniqueIndexes, storeValidators, storeExtensions, storeIndexes, onlineEmployee, canonical, indexMatches, extensionPresent } from './schema.js';
import { StoreError } from './errors.js';

export async function inspectStore(db) {
  const hello = await db.command({ hello: 1 });
  const topology = hello.setName ? 'replica-set' : hello.msg === 'isdbgrid' ? 'sharded' : 'standalone';
  const infos = await db.listCollections({}, { nameOnly: false }).toArray();
  const byName = new Map(infos.map(info => [info.name, info]));
  const problems = [];
  for (const name of [...baseCollections, ...Object.keys(storeValidators)]) if (!byName.has(name) || byName.get(name).type !== 'collection') problems.push(`collection:${name}`);
  for (const [name, expected] of Object.entries(storeValidators)) {
    const options = byName.get(name)?.options;
    if (canonical(options?.validator || {}) !== canonical(expected) || (options?.validationLevel || 'strict') !== 'strict' || (options?.validationAction || 'error') !== 'error') problems.push(`validator:${name}`);
  }
  for (const [name, extension] of Object.entries(storeExtensions)) {
    const options = byName.get(name)?.options;
    if (!extensionPresent(options?.validator, extension) || (options?.validationLevel || 'strict') !== 'strict' || (options?.validationAction || 'error') !== 'error') problems.push(`extension:${name}`);
  }
  const indexCache = new Map();
  for (const expected of [...baseUniqueIndexes, ...storeIndexes]) {
    if (!byName.has(expected.collection)) continue;
    if (!indexCache.has(expected.collection)) indexCache.set(expected.collection, await db.collection(expected.collection).listIndexes().toArray());
    const actual = indexCache.get(expected.collection).find(index => index.name === expected.options.name);
    if (!indexMatches(actual, expected)) problems.push(`index:${expected.options.name}`);
  }
  if (byName.has('NhanVien')) {
    const employee = await db.collection('NhanVien').findOne({ MaNV: onlineEmployee.MaNV }, { projection: { _id: 0, ...Object.fromEntries(Object.keys(onlineEmployee).map(key => [key, 1])), NgayVaoLam: 1 } });
    if (!employee || !Object.entries(onlineEmployee).every(([key, value]) => employee[key] === value) || !(employee.NgayVaoLam instanceof Date)) problems.push('employee:NV_ONLINE');
  }
  let pendingRegistrations = 0; let pendingOrders = 0;
  if (byName.has('YeuCauCuaHang')) {
    const collection = db.collection('YeuCauCuaHang');
    const pending = { $in: ['DANG_XU_LY', 'CAN_PHUC_HOI'] };
    pendingRegistrations = await collection.countDocuments({ Loai: 'DANG_KY', TrangThai: pending });
    pendingOrders = await collection.countDocuments({ Loai: 'DAT_HANG', TrangThai: pending });
  }
  return { ready: problems.length === 0 && !pendingRegistrations && !pendingOrders, setupReady: !problems.length, topology, problems, pendingRegistrations, pendingOrders };
}
export function createPreflight(database) {
  return async function preflight({ allowRegistrationRecovery = false, allowPendingOrders = false } = {}) {
    let result;
    try { result = await inspectStore(await database.read()); }
    catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(503, 'DATABASE_UNAVAILABLE'); }
    if (!result.setupReady) throw new StoreError(503, 'STORE_SETUP_REQUIRED');
    // S0 approved standalone. An unreviewed topology change must not enable writes.
    if (result.topology !== 'standalone' || (result.pendingOrders && !allowPendingOrders) || (result.pendingRegistrations && !allowRegistrationRecovery)) throw new StoreError(503, 'RECOVERY_PENDING');
    return result;
  };
}
