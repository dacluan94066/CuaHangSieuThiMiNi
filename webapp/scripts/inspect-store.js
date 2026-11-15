// Read-only: metadata, hello, version, counts. Never calls setup or write().
import { loadConfig } from '../src/config.js';
import { createStoreDatabase } from '../src/store/database.js';
import { inspectStore } from '../src/store/preflight.js';
import { baseCollections } from '../src/store/schema.js';

const config = loadConfig();
const connection = createStoreDatabase(config);
try {
  const db = await connection.read();
  const version = await db.command({ buildInfo: 1 });
  const readiness = await inspectStore(db);
  const counts = {};
  for (const name of baseCollections) counts[name] = await db.collection(name).countDocuments({});
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name).sort();
  const databases = await db.admin().listDatabases({ nameOnly: true });
  console.log(JSON.stringify({ dbName: db.databaseName, version: version.version, readiness, counts, collections: names,
    testDatabaseExists: databases.databases.some(item => item.name === 'QLSieuThiMini_Test') }, null, 2));
} catch {
  console.error('Không kiểm tra được metadata DB; không ghi dữ liệu và không in chi tiết kết nối.');
  process.exitCode = 1;
} finally { await connection.close(); }
