import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { inspectStore } from '../src/store/preflight.js';
import { assertTestDatabase, assertStoreWriteTarget } from '../src/store/guards.js';
import { createStoreDatabase } from '../src/store/database.js';
import { baseCollections, storeValidators, storeExtensions, storeIndexes, baseUniqueIndexes, onlineEmployee, canonical, indexMatches } from '../src/store/schema.js';

function readOnlyMetadata({ omit, pending = 0, corruptIndex = false } = {}) {
  const infos = [...baseCollections, ...Object.keys(storeValidators)].filter(name => name !== omit).map(name => ({ name, type: 'collection', options: {
    validator: storeValidators[name] || (storeExtensions[name] ? { $and: [{ $jsonSchema: { bsonType: 'object' } }, storeExtensions[name]] } : { $jsonSchema: { bsonType: 'object' } })
  } }));
  return { command: async command => { assert.deepEqual(command, { hello: 1 }); return { isWritablePrimary: true, logicalSessionTimeoutMinutes: 30 }; },
    listCollections: () => ({ toArray: async () => infos }),
    collection(name) { return {
      listIndexes: () => ({ toArray: async () => [...baseUniqueIndexes, ...storeIndexes].filter(item => item.collection === name).map(item => ({ key: item.key, ...item.options, ...(corruptIndex ? { unique: false } : {}) })) }),
      findOne: async () => ({ ...onlineEmployee, NgayVaoLam: new Date() }),
      countDocuments: async filter => filter.Loai === 'DANG_KY' ? pending : 0
    }; }
  };
}
test('Preflight chỉ đọc: standalone có logical session vẫn không phải replica set', async () => {
  const result = await inspectStore(readOnlyMetadata());
  assert.equal(result.topology, 'standalone'); assert.equal(result.ready, true); assert.deepEqual(result.problems, []);
});
test('Preflight fail closed khi thiếu collection, index không unique, hoặc tác vụ dở dang', async () => {
  assert.equal((await inspectStore(readOnlyMetadata({ omit: 'TaiKhoanKhachHang' }))).setupReady, false);
  assert.equal((await inspectStore(readOnlyMetadata({ corruptIndex: true }))).setupReady, false);
  const pending = await inspectStore(readOnlyMetadata({ pending: 1 })); assert.equal(pending.ready, false); assert.equal(pending.pendingRegistrations, 1);
});
test('Index contract không chấp nhận sparse/hidden/TTL hoặc sai partial filter', () => {
  const expected = storeIndexes[0]; const correct = { key: expected.key, ...expected.options };
  assert.equal(indexMatches(correct, expected), true);
  for (const patch of [{ sparse: true }, { hidden: true }, { expireAfterSeconds: 0 }, { unique: false }, { partialFilterExpression: { wrong: true } }]) assert.equal(indexMatches({ ...correct, ...patch }, expected), false);
});
test('Runtime và harness guard: thiếu/sai/main/khác actualName bị chặn trước writer', async () => {
  for (const name of [undefined, '', 'QLSieuThiMini', 'QLSieuThiMini_test', 'other']) {
    assert.throws(() => assertTestDatabase({ dbName: name }, name));
    const db = createStoreDatabase({ dbName: name, storeWriteEnabled: true });
    await assert.rejects(db.write(), { code: 'STORE_WRITES_DISABLED' }); await db.close();
  }
  assert.throws(() => assertStoreWriteTarget({ dbName: 'QLSieuThiMini_Test', storeWriteEnabled: false }, 'QLSieuThiMini_Test'));
  assert.throws(() => assertTestDatabase({ dbName: 'QLSieuThiMini_Test' }, 'QLSieuThiMini'));
  assert.doesNotThrow(() => assertStoreWriteTarget({ dbName: 'QLSieuThiMini_Test', storeWriteEnabled: true }, 'QLSieuThiMini_Test'));
});
for (const filename of ['01_store_schema_indexes.js', '02_online_employee.js', '90_test_fixtures.js']) {
  test(`Script guard ${filename}: kiểm tra đoạn guard riêng, không chạy script DB`, () => {
    const source = fs.readFileSync(new URL(`../db-setup/${filename}`, import.meta.url), 'utf8');
    // Execute ONLY the declaration and fail-before-write guard, never the setup body.
    const guard = source.match(/var DB_NAME = "QLSieuThiMini_Test";\r?\n\s+if \([^\n]+/)[0];
    for (const name of ['QLSieuThiMini', 'admin', 'qlsieuthimini_test']) assert.throws(() => vm.runInNewContext(guard, { db: { getName: () => name } }));
    assert.doesNotThrow(() => vm.runInNewContext(guard, { db: { getName: () => 'QLSieuThiMini_Test' } }));
    assert.ok(!source.includes('getSiblingDB')); assert.ok(!source.includes('drop('));
  });
}
test('Manifest script setup khớp contract runtime, không chạy script setup', () => {
  const source = fs.readFileSync(new URL('../db-setup/01_store_schema_indexes.js', import.meta.url), 'utf8');
  const manifest = JSON.parse(source.match(/var manifest = ([\s\S]+?);\r?\n  function canonical/)[1]);
  assert.equal(canonical(manifest), canonical({ validators: storeValidators, extensions: storeExtensions, indexes: storeIndexes, baseCollections, baseUniqueIndexes }));
});
