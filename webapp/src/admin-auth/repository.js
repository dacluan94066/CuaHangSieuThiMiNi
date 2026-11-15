import { MongoClient } from 'mongodb';
import { AdminError, assertAdminTarget } from './security.js';
const accountProjection = { _id: 0, TenDangNhap: 1, MaNV: 1, VaiTro: 1, TrangThai: 1 };
const credentialProjection = { _id: 0, TenDangNhap: 1, MaNV: 1, MatKhauBam: 1, Salt: 1, ThamSoBam: 1, TrangThaiBaoMat: 1, PhienBanXacThuc: 1 };
export function createAdminRepository(config) {
  let client; let connecting;
  async function connect() {
    assertAdminTarget(config.dbName);
    if (!connecting) { client = new MongoClient(config.mongoUri, { family: 4, retryWrites: false, serverSelectionTimeoutMS: 3000, maxPoolSize: 4 }); connecting = client.connect().catch(async () => { await client.close().catch(() => {}); connecting = undefined; throw new AdminError(503, 'ADMIN_UNAVAILABLE'); }); }
    await connecting; return client.db(config.dbName);
  }
  return {
    async load(name) {
      const db = await connect();
      if (!await db.collection('TaiKhoanQuanTri').countDocuments({}, { limit: 1, maxTimeMS: 3000 })) throw new AdminError(503, 'ADMIN_AUTH_SETUP_REQUIRED');
      const [accounts, credentials] = await Promise.all([
        db.collection('TaiKhoan').find({ TenDangNhap: name }, { projection: accountProjection, maxTimeMS: 3000 }).limit(2).toArray(),
        db.collection('TaiKhoanQuanTri').find({ TenDangNhap: name }, { projection: credentialProjection, maxTimeMS: 3000 }).limit(2).toArray()
      ]);
      if (accounts.length !== 1 || credentials.length !== 1) return null;
      const employees = await db.collection('NhanVien').find({ MaNV: accounts[0].MaNV }, { projection: { _id: 0, MaNV: 1, HoTen: 1, TrangThai: 1 }, maxTimeMS: 3000 }).limit(2).toArray();
      return { account: accounts[0], credential: credentials[0], employee: employees.length === 1 ? employees[0] : null };
    },
    async close() { if (client) await client.close(); connecting = undefined; }
  };
}
