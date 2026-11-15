// Read-only evidence for the explicitly authorized S1 Test preparation.
// Outputs counts and SHA-256 only, never document contents or credentials.
import { createHash } from 'node:crypto';
import { MongoClient, BSON } from 'mongodb';
import { loadConfig } from '../src/config.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const config = loadConfig();
const client = new MongoClient(config.mongoUri, { family: 4, serverSelectionTimeoutMS: 3000, retryWrites: false });
try {
  await client.connect();
  const result = {};
  for (const name of ['QLSieuThiMini', 'QLSieuThiMini_Test']) {
    const db = client.db(name);
    const infos = (await db.listCollections({}, { nameOnly: false }).toArray()).sort((a, b) => a.name.localeCompare(b.name));
    const collections = {};
    for (const info of infos) {
      if (info.type !== 'collection') throw new Error('Unexpected collection type');
      const collection = db.collection(info.name);
      const documents = await collection.find({}).sort({ _id: 1 }).toArray();
      const indexes = (await collection.listIndexes().toArray()).map(index => Object.fromEntries(Object.entries(index).filter(([key]) => !['ns', 'buildUUID'].includes(key)))).sort((a, b) => a.name.localeCompare(b.name));
      collections[info.name] = {
        count: await collection.countDocuments({}),
        dataHash: hash(BSON.EJSON.serialize(documents, { relaxed: false })),
        optionsHash: hash(info.options),
        indexesHash: hash(indexes),
        indexKeysHash: hash(indexes.map(index => Object.entries(index.key))),
        indexCount: indexes.length
      };
    }
    result[name] = { collections, fingerprint: hash(collections) };
  }
  console.log(JSON.stringify(result, null, 2));
} catch {
  console.error('S1 snapshot failed; no writes and no raw driver error output.');
  process.exitCode = 1;
} finally { await client.close(); }
