import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccounts } from '../src/store/accounts.js';
import { memoryDatabase } from './helpers/store-memory.js';

const config = { dbName: 'QLSieuThiMini_Test', storeWriteEnabled: true };
const input = { hoTen: 'Khách bộ nhớ', sdt: '0901234567', matKhau: 'Memory only 2026!' };
const passwords = { hash: async () => ({ MatKhauBam: 'fake-memory-hash', Salt: 'memory-salt', ThamSoBam: {} }), verify: async (password, account) => Boolean(account && password === input.matKhau) };
const create = (memory, overrides = {}) => createAccounts({ config, database: memory.database, passwords, preflight: async () => ({ topology: 'standalone' }), ...overrides });
test('Đăng ký bộ nhớ: khách mới 0 điểm, tài khoản active, journal không chứa mật khẩu/hash', async () => {
  const memory = memoryDatabase(); const accounts = create(memory);
  const result = await accounts.register(input, 'IP');
  assert.match(result.MaKH, /^KH_ONL_[a-f0-9]{32}$/); assert.equal(result.DiemTichLuy, 0);
  assert.equal(memory.data.get('TaiKhoanKhachHang')[0].TrangThai, 'HoatDong');
  const journal = memory.data.get('YeuCauCuaHang')[0]; assert.equal(journal.TrangThai, 'HOAN_TAT');
  assert.doesNotMatch(JSON.stringify(journal), /matkhau|hash|salt/i);
  assert.doesNotMatch(JSON.stringify(result), /matkhau|salt/i);
});
test('Không gắn tài khoản mới vào SDT khách cũ, giữ điểm/hồ sơ cũ', async () => {
  const memory = memoryDatabase(); memory.data.get('KhachHang').push({ MaKH: 'KH001', SDT: input.sdt, DiemTichLuy: 999 });
  await assert.rejects(create(memory).register(input, 'IP'), { code: 'REGISTRATION_UNAVAILABLE' });
  assert.equal(memory.data.get('TaiKhoanKhachHang').length, 0);
  assert.deepEqual(memory.data.get('KhachHang'), [{ MaKH: 'KH001', SDT: input.sdt, DiemTichLuy: 999 }]);
});
test('Hai đăng ký cùng SDT bộ nhớ: một thành công, một xung đột', async () => {
  const memory = memoryDatabase(); const accounts = create(memory);
  const results = await Promise.allSettled([accounts.register(input, 'IP'), accounts.register(input, 'IP')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(memory.data.get('KhachHang').length, 1); assert.equal(memory.data.get('TaiKhoanKhachHang').length, 1);
});
for (const collection of ['TaiKhoanKhachHang', 'KhachHang']) for (const faultPhase of ['before', 'after']) test(`Lỗi ${faultPhase} insert ${collection}: hoàn tác đúng bản ghi sở hữu`, async () => {
  let injected = false;
  const memory = memoryDatabase((name, operation, doc, phase) => { if (!injected && name === collection && operation === 'insertOne' && phase === faultPhase) { injected = true; throw new Error('memory fault'); } });
  await assert.rejects(create(memory).register(input, 'IP'));
  assert.equal(memory.data.get('KhachHang').length, 0); assert.equal(memory.data.get('TaiKhoanKhachHang').length, 0);
  assert.equal(memory.data.get('YeuCauCuaHang')[0].TrangThai, 'THAT_BAI');
});
test('Mất phản hồi sau kích hoạt tài khoản: hoàn thiện tiến về trước, không xóa khách', async () => {
  let injected = false;
  const memory = memoryDatabase((name, operation, value, phase) => { if (!injected && name === 'TaiKhoanKhachHang' && operation === 'updateOne' && phase === 'after') { injected = true; throw new Error('ambiguous memory outcome'); } });
  const result = await create(memory).register(input, 'IP');
  assert.ok(result.MaKH); assert.equal(memory.data.get('TaiKhoanKhachHang')[0].TrangThai, 'HoatDong');
  assert.equal(memory.data.get('KhachHang').length, 1); assert.equal(memory.data.get('YeuCauCuaHang')[0].TrangThai, 'HOAN_TAT');
});
test('Phục hồi tác vụ cũ chỉ trong POST có guard, không xóa hồ sơ legacy cùng mã bị xung đột', async () => {
  const memory = memoryDatabase();
  memory.data.get('YeuCauCuaHang').push({ MaYeuCau: 'old-op', Loai: 'DANG_KY', MaKH: 'KH_ONL_old', MaTKKH: 'TKKH_old', TrangThai: 'DANG_XU_LY' });
  memory.data.get('TaiKhoanKhachHang').push({ MaTKKH: 'TKKH_old', MaKH: 'KH_ONL_old', SDT: '0909999999', TrangThai: 'DangTao', MaYeuCauDangKy: 'old-op' });
  memory.data.get('KhachHang').push({ MaKH: 'KH_ONL_old', SDT: '0901111111', DiemTichLuy: 500 });
  await create(memory).register(input, 'IP');
  assert.ok(memory.data.get('KhachHang').some(row => row.SDT === '0901111111' && row.DiemTichLuy === 500));
  assert.equal(memory.data.get('YeuCauCuaHang')[0].TrangThai, 'THAT_BAI');
});
test('Login sai/không tồn tại dùng cùng lỗi, đều gọi verifier; rate limit trước lookup', async () => {
  const verified = [];
  const memory = memoryDatabase(); const accounts = create(memory, { passwords: { ...passwords, verify: async (password, account) => { verified.push(Boolean(account)); return passwords.verify(password, account); } } }); await accounts.register(input, 'IP');
  for (const value of [{ ...input, matKhau: 'Wrong password 2026!' }, { ...input, sdt: '0900000000' }]) await assert.rejects(accounts.login(value, 'other-IP'), { code: 'INVALID_CREDENTIALS', message: 'SĐT hoặc mật khẩu không đúng.' });
  assert.deepEqual(verified, [true, false]);
  assert.equal((await accounts.login(input, 'good-IP')).SDT, input.sdt);
  let calls = 0;
  const limited = create(memory, { preflight: async () => { calls++; } });
  for (let i = 0; i < 5; i++) await assert.rejects(limited.login({ ...input, matKhau: 'Wrong password 2026!' }, 'limited-IP'), { status: 401 });
  await assert.rejects(limited.login(input, 'limited-IP'), { status: 429 }); assert.equal(calls, 5);
});
test('Guard sai DB chặn trước preflight/writer, ngay cả bật true', async () => {
  let touched = false;
  const accounts = createAccounts({ config: { dbName: 'QLSieuThiMini', storeWriteEnabled: true }, database: { write() { touched = true; } }, passwords, preflight: () => { touched = true; } });
  await assert.rejects(accounts.register(input, 'IP'), { code: 'STORE_WRITES_DISABLED' }); assert.equal(touched, false);
});
