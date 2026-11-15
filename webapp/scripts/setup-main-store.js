import { MongoClient } from 'mongodb';
import { storeValidators, storeExtensions, storeIndexes, onlineEmployee } from '../src/store/schema.js';
import { inspectStore } from '../src/store/preflight.js';

async function setup() {
  const c = new MongoClient('mongodb://localhost:27017');
  await c.connect();
  const db = c.db('QLSieuThiMini');
  
  // 1. Create collections
  for (const [name, validator] of Object.entries(storeValidators)) {
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    if (!exists) {
      await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
      console.log('Created collection:', name);
    }
  }

  // 2. Extend validators
  const infos = await db.listCollections().toArray();
  for (const [name, ext] of Object.entries(storeExtensions)) {
    const info = infos.find(i => i.name === name);
    const prev = info.options.validator;
    const isAlready = Array.isArray(prev?.$and) && prev.$and.some(part => JSON.stringify(part) === JSON.stringify(ext));
    if (!isAlready) {
      const validator = { $and: [prev, ext] };
      await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
      console.log('Extended validator for:', name);
    }
  }

  // 3. Create indexes
  for (const idx of storeIndexes) {
    await db.collection(idx.collection).createIndex(idx.key, idx.options);
    console.log('Created index:', idx.options.name);
  }

  // 4. Online employee
  await db.collection('NhanVien').updateOne(
    { MaNV: onlineEmployee.MaNV },
    { $setOnInsert: { ...onlineEmployee, NgayVaoLam: new Date() } },
    { upsert: true }
  );
  console.log('Ensured NV_ONLINE in NhanVien');

  // 5. Inspect store preflight
  const report = await inspectStore(db);
  console.log('Preflight status:', report.ready ? 'READY' : 'NOT_READY', 'Problems:', report.problems);

  await c.close();
}
setup().catch(err => {
  console.error(err);
  process.exit(1);
});
