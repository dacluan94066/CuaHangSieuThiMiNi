// MANUAL NODE SCRIPT ONLY. Runtime never imports or executes this module.
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { loadConfig } from '../src/config.js';
import { ROLES } from '../src/admin-auth/policy.js';
import { assertAdminTarget, createAdminPasswords, validCredential, validPassword } from '../src/admin-auth/security.js';
import { adminValidator, adminIndexes } from '../src/admin-auth/schema.js';
import { canonical } from '../src/store/schema.js';

const conflict = () => new Error('ADMIN_SETUP_CONFLICT');
let setupTarget;
export async function planAdminImport(accounts, employees, existing, passwords) {
  const plans = []; const counts = { create: 0, skip: 0, blocked: 0 };
  const unique = rows => { const seen = new Set(); for (const row of rows) { if (seen.has(row.TenDangNhap)) throw conflict(); seen.add(row.TenDangNhap); } };
  unique(accounts); unique(existing);
  for (const source of accounts) {
    const employee = employees.filter(row => row.MaNV === source.MaNV);
    if (source.TrangThai !== 'Hoạt động' || source.MaNV === 'NV_ONLINE' || employee.length !== 1 || employee[0].TrangThai !== 'Đang làm' || !ROLES.includes(source.VaiTro)) { counts.blocked++; continue; }
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(source.TenDangNhap) || typeof source.MaNV !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(source.MaNV)) throw conflict();
    const old = existing.find(row => row.TenDangNhap === source.TenDangNhap);
    if (old) {
      if (old.MaNV !== source.MaNV || !validCredential(old) || !Number.isSafeInteger(old.PhienBanXacThuc) || old.PhienBanXacThuc < 1 || !['IMPORT_DEMO', 'DAT_LAI'].includes(old.ChinhSachMatKhau)) throw conflict();
      if (old.ChinhSachMatKhau === 'IMPORT_DEMO' && !await passwords.verify(source.MatKhau, old)) throw conflict();
      counts.skip++; continue;
    }
    const secret = await passwords.hash(source.MatKhau); const now = new Date();
    plans.push({ MaTKQT: 'TKQT_' + randomUUID().replaceAll('-', ''), TenDangNhap: source.TenDangNhap, MaNV: source.MaNV, ...secret, ChinhSachMatKhau: 'IMPORT_DEMO', TrangThaiBaoMat: 'HoatDong', PhienBanXacThuc: 1, NgayTao: now, NgayCapNhat: now }); counts.create++;
  }
  return { plans, counts };
}
async function hiddenPassword(prompt) {
  if (!process.stdin.isTTY) throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  process.stdout.write(prompt);
  const silent = new Writable({ write(chunk, encoding, callback) { callback(); } });
  const input = createInterface({ input: process.stdin, output: silent, terminal: true });
  try { return await input.question(''); } finally { input.close(); process.stdout.write('\n'); }
}
async function main() {
  const args = process.argv.slice(2); const known = /^(?:--test|--apply|--mode=(?:import|reset|sync-source)|--username=[A-Za-z0-9_.-]{1,64})$/;
  if (args.some(arg => !known.test(arg)) || new Set(args.map(arg => arg.split('=')[0])).size !== args.length) throw new Error('INVALID_FLAGS');
  const config = loadConfig({ testMode: args.includes('--test') }); setupTarget = config.dbName; assertAdminTarget(config.dbName);
  const apply = args.includes('--apply'); const mode = args.find(arg => arg.startsWith('--mode='))?.slice(7) || 'import'; const username = args.find(arg => arg.startsWith('--username='))?.slice(11);
  if ((mode === 'import' && username) || (mode !== 'import' && !username)) throw new Error('INVALID_FLAGS');
  const client = new MongoClient(config.mongoUri, { family: 4, retryWrites: false, serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect(); const db = client.db(config.dbName); assertAdminTarget(db.databaseName);
    const names = (await db.admin().listDatabases({ nameOnly: true })).databases.map(row => row.name); if (!names.includes(config.dbName)) throw new Error('TARGET_DB_MUST_EXIST');
    const infos = await db.listCollections({}, { nameOnly: false }).toArray();
    for (const source of ['TaiKhoan', 'NhanVien']) if (!infos.some(row => row.name === source && row.type === 'collection')) throw new Error('SOURCE_REQUIRED');
    for (const [collection, field] of [['TaiKhoan', 'TenDangNhap'], ['NhanVien', 'MaNV']]) {
      const indexes = await db.collection(collection).listIndexes().toArray();
      if (!indexes.some(index => index.unique === true && canonical(index.key) === canonical({ [field]: 1 }) && !index.partialFilterExpression && !index.sparse)) throw new Error('SOURCE_UNIQUE_REQUIRED');
    }
    const info = infos.find(row => row.name === 'TaiKhoanQuanTri'); let indexes = [];
    if (info) {
      if (info.type !== 'collection' || canonical(info.options.validator) !== canonical(adminValidator) || (info.options.validationLevel || 'strict') !== 'strict' || (info.options.validationAction || 'error') !== 'error') throw new Error('SCHEMA_CONFLICT');
      indexes = await db.collection('TaiKhoanQuanTri').listIndexes().toArray();
      for (const index of adminIndexes) { const old = indexes.find(item => item.name === index.name); if (old && (!old.unique || old.sparse || old.partialFilterExpression || canonical(old.key) !== canonical(index.key))) throw new Error('INDEX_CONFLICT'); }
    }
    const accounts = await db.collection('TaiKhoan').find(username ? { TenDangNhap: username } : {}, { projection: { _id: 0, TenDangNhap: 1, MaNV: 1, VaiTro: 1, TrangThai: 1, MatKhau: 1 }, maxTimeMS: 5000 }).toArray();
    const employees = await db.collection('NhanVien').find({}, { projection: { _id: 0, MaNV: 1, TrangThai: 1 }, maxTimeMS: 5000 }).toArray();
    const existing = info ? await db.collection('TaiKhoanQuanTri').find({}).toArray() : [];
    const passwords = createAdminPasswords(); const write = { writeConcern: { w: 1, j: true, wtimeoutMS: 5000 } };
    const guard = () => { assertAdminTarget(config.dbName); assertAdminTarget(db.databaseName); if (db.databaseName !== config.dbName) throw new Error('TARGET_MISMATCH'); };
    if (mode === 'import') {
      const { plans, counts } = await planAdminImport(accounts, employees, existing, passwords);
      if (apply) {
        guard(); if (!info) await db.createCollection('TaiKhoanQuanTri', { validator: adminValidator, validationLevel: 'strict', validationAction: 'error' });
        for (const index of adminIndexes) if (!indexes.some(old => old.name === index.name)) { guard(); await db.collection('TaiKhoanQuanTri').createIndex(index.key, { name: index.name, unique: true }); }
        for (const plan of plans) { guard(); await db.collection('TaiKhoanQuanTri').insertOne(plan, write); }
      }
      console.log(JSON.stringify({ database: db.databaseName, mode, apply, ...counts }));
    } else {
      const source = accounts.length === 1 ? accounts[0] : null; const old = existing.find(row => row.TenDangNhap === username);
      if (!source || !old || source.MaNV !== old.MaNV || source.MaNV === 'NV_ONLINE' || source.TrangThai !== 'Hoạt động' || !ROLES.includes(source.VaiTro) || employees.filter(row => row.MaNV === source.MaNV && row.TrangThai === 'Đang làm').length !== 1 || !validCredential(old) || !Number.isSafeInteger(old.PhienBanXacThuc) || old.PhienBanXacThuc >= Number.MAX_SAFE_INTEGER) throw conflict();
      if (apply) {
        let password = source.MatKhau;
        if (mode === 'reset') { password = await hiddenPassword('Mật khẩu mới (không hiện ký tự): '); const confirm = await hiddenPassword('Nhập lại mật khẩu mới: '); if (!validPassword(password, 12) || password !== confirm) throw new Error('PASSWORD_POLICY_OR_CONFIRMATION'); }
        const unchanged = mode === 'sync-source' && old.ChinhSachMatKhau === 'IMPORT_DEMO' && await passwords.verify(password, old);
        if (!unchanged) {
          const secret = await passwords.hash(password, mode === 'reset' ? 12 : 1); guard();
          const result = await db.collection('TaiKhoanQuanTri').updateOne({ TenDangNhap: username, MaNV: old.MaNV, PhienBanXacThuc: old.PhienBanXacThuc, MatKhauBam: old.MatKhauBam }, { $set: { ...secret, ChinhSachMatKhau: mode === 'reset' ? 'DAT_LAI' : 'IMPORT_DEMO', NgayCapNhat: new Date() }, $inc: { PhienBanXacThuc: 1 } }, write);
          if (result.matchedCount !== 1) throw conflict();
        }
        password = undefined;
      }
      console.log(JSON.stringify({ database: db.databaseName, mode, apply, selected: 1 }));
    }
  } finally { await client.close(); }
}
const entry = process.argv[1] && resolve(process.argv[1]); const self = fileURLToPath(import.meta.url);
if (entry && (process.platform === 'win32' ? entry.toLowerCase() === self.toLowerCase() : entry === self)) main().catch(error => {
  const reasons = ['INVALID_FLAGS', 'TARGET_DB_MUST_EXIST', 'SOURCE_REQUIRED', 'SOURCE_UNIQUE_REQUIRED', 'SCHEMA_CONFLICT', 'INDEX_CONFLICT', 'ADMIN_SETUP_CONFLICT', 'INTERACTIVE_TERMINAL_REQUIRED', 'PASSWORD_POLICY_OR_CONFIRMATION', 'TARGET_MISMATCH', 'ADMIN_AUTH_TARGET_FORBIDDEN', 'ADMIN_INVALID_INPUT'];
  const reason = reasons.includes(error.code) ? error.code : reasons.includes(error.message) ? error.message : 'CHECK_CONFIG_MAPPING_OR_IO';
  console.error(JSON.stringify({ code: 'ADMIN_SETUP_STOPPED', target: setupTarget || null, reason, note: 'Dừng, không đổi DB đích. Ghi trước lỗi (nếu có) được giữ để review/chạy lại; không in thông tin bí mật.' })); process.exitCode = 1;
});
