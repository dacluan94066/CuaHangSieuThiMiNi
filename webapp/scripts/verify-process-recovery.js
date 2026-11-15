import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { loadConfig } from '../src/config.js';
import { assertStoreWriteTarget } from '../src/store/guards.js';
import { inspectStore } from '../src/store/preflight.js';
import { createTestActor, createTestProduct } from '../tests/helpers/store-test-fixtures.js';

// This controller never kills a process. The operator reviews and stops the exact
// paused child PID externally. If denied, create the .continue file to finish safely.
const config = loadConfig({ testMode: true });
assertStoreWriteTarget(config, config.dbName);
assert.equal(process.env.STORE_S4_PROCESS_TEST, 'ALLOW_TEST_PROCESS_CRASH');
assert.equal(process.env.STORE_CHECKOUT_API_TESTS, 'ALLOW_TEST_CHECKOUT');
const run = randomUUID();
const workerPath = fileURLToPath(new URL('../tests/helpers/store-process-crash-worker.js', import.meta.url));
const results = new URL('../tests/results/', import.meta.url); await mkdir(results, { recursive: true });
const controlFile = new URL(`process-${run}.json`, results); const continueFile = new URL(`process-${run}.continue`, results);
const proofFile = new URL(`process-${run}-result.json`, results);
const client = new MongoClient(config.mongoUri, { family: 4, retryWrites: false, serverSelectionTimeoutMS: 3000 });
let current; let phase = 'PREFLIGHT';
function worker(pause) {
  const child = spawn(process.execPath, [workerPath, `--run=${run}`, ...(pause ? ['--pause'] : [])], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: process.env });
  current = child; const messages = []; const waiters = [];
  child.on('message', message => { messages.push(message); for (const waiter of waiters) if (message.type === waiter.type) waiter.resolve(message); });
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  return { child, exited, wait(type) { const present = messages.find(message => message.type === type); return present ? Promise.resolve(present) : new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Worker timeout')), 30000); waiters.push({ type, resolve(message) { clearTimeout(timer); resolve(message); } });
  }); } };
}
function http(port) {
  let cookie = ''; let csrf;
  return async (path, method = 'GET', body, key) => {
    const response = await fetch(`http://127.0.0.1:${port}/store-api${path}`, { method, headers: { Cookie: cookie, Origin: config.storeOrigin, ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const json = await response.json(); if (json.data?.csrfToken) csrf = json.data.csrfToken;
    assert.doesNotMatch(JSON.stringify(json), /"(?:MatKhau[^"\s]*|Salt|SID|Snapshot|GiuChoOnline|DiemDaCongOnline|journal)"|mongodb(?:\+srv)?:\/\//i);
    return { status: response.status, ...json };
  };
}
try {
  await client.connect(); const db = client.db(config.dbName); assertStoreWriteTarget(config, db.databaseName); assert.equal((await inspectStore(db)).ready, true);
  const actor = await createTestActor(db, config, 'S4 real process recovery'); const product = await createTestProduct(db, config, 'S4 process stock', { stock: 5 });
  const first = worker(true); const ready = await first.wait('READY'); const call = http(ready.port);
  await call('/session'); assert.equal((await call('/auth/dang-nhap', 'POST', { sdt: actor.phone, matKhau: actor.password })).status, 200);
  assert.equal((await call('/gio-hang/items', 'POST', { maSP: product, soLuong: 1 })).status, 200);
  const quote = await call('/thanh-toan/xem-truoc', 'POST', { diaChiGiao: { hoTenNguoiNhan: 'Test phục hồi tiến trình', sdtNguoiNhan: '0901234567', diaChi: 'Địa chỉ Test phục hồi sau khi dừng tiến trình' }, phuongThuc: 'Chuyển khoản' });
  assert.equal(quote.status, 200); const key = randomUUID(); const payload = { maBaoGia: quote.data.maBaoGia };
  phase = 'WAIT_PAUSE'; const pending = call('/don-hang', 'POST', payload, key).catch(() => ({ disconnected: true }));
  const paused = await first.wait('PAUSED');
  assert.equal(await db.collection('HoaDon').countDocuments({ MaKH: actor.maKH, NguonDon: 'ONLINE' }), 1);
  assert.equal((await db.collection('SanPham').findOne({ MaSP: product })).SoLuongTon, 4);
  assert.equal((await db.collection('KhachHang').findOne({ MaKH: actor.maKH })).DiemTichLuy, 1);
  await writeFile(controlFile, JSON.stringify({ pid: paused.pid, run, workerPath, stage: paused.stage, database: config.dbName, continueFile: fileURLToPath(continueFile) }, null, 2));
  console.log(JSON.stringify({ phase: 'PAUSED_FOR_EXTERNAL_STOP', pid: paused.pid, run, controlFile: fileURLToPath(controlFile) }));
  let continued = false; let done = false; const exitPromise = first.exited.then(value => { done = true; return value; });
  const started = Date.now();
  while (!done) {
    if (!continued) {
      try { await access(continueFile); continued = true; first.child.send({ type: 'CONTINUE' }); } catch {}
      if (Date.now() - started > 180000) { continued = true; first.child.send({ type: 'CONTINUE' }); }
    }
    if (continued) { await pending; first.child.send({ type: 'STOP' }); }
    if (!done) await new Promise(resolve => setTimeout(resolve, 200));
  }
  const exited = await exitPromise; await pending;
  if (continued) {
    const proof = { passed: false, realKillVerified: false, reason: 'Continued gracefully instead of external kill', run, product, maKH: actor.maKH };
    await writeFile(proofFile, JSON.stringify(proof, null, 2)); console.log(JSON.stringify(proof)); process.exitCode = 2;
  } else {
    phase = 'RESTART_RECOVERY'; const second = worker(false); const next = await second.wait('READY'); const retry = http(next.port);
    await retry('/session'); assert.equal((await retry('/auth/dang-nhap', 'POST', { sdt: actor.phone, matKhau: actor.password })).status, 200);
    const recovered = await retry('/don-hang', 'POST', payload, key); assert.equal(recovered.status, 200);
    const replay = await retry('/don-hang', 'POST', payload, key); assert.equal(replay.status, 200); assert.equal(replay.data.hoaDon.MaHD, recovered.data.hoaDon.MaHD);
    assert.equal((await retry(`/don-hang/${recovered.data.hoaDon.MaHD}`)).status, 200);
    assert.equal(await db.collection('HoaDon').countDocuments({ MaKH: actor.maKH, NguonDon: 'ONLINE' }), 1);
    assert.equal((await db.collection('SanPham').findOne({ MaSP: product })).SoLuongTon, 4);
    assert.equal((await db.collection('KhachHang').findOne({ MaKH: actor.maKH })).DiemTichLuy, 1);
    assert.equal((await inspectStore(db)).ready, true);
    second.child.send({ type: 'STOP' }); await second.exited;
    const proof = { passed: true, realKillVerified: true, run, stage: paused.stage, exit: exited, restartedPid: next.pid, database: db.databaseName, product, maKH: actor.maKH, maHD: recovered.data.hoaDon.MaHD, stockBefore: 5, stockAfter: 4, pointsBefore: 0, pointsAfter: 1, onlineOrders: 1, replaySameOrder: true, pending: 0 };
    await writeFile(proofFile, JSON.stringify(proof, null, 2)); console.log(JSON.stringify(proof));
  }
} catch {
  console.error(`Process recovery verification failed at ${phase}; secrets suppressed. Review Test journal before retry.`); process.exitCode = 1;
  if (current?.connected) { current.send({ type: 'CONTINUE' }); setTimeout(() => { if (current?.connected) current.send({ type: 'STOP' }); }, 1000); }
} finally { await client.close(); }
