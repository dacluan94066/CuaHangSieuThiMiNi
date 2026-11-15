import { MongoClient } from 'mongodb';
import { StoreError } from './errors.js';
import { assertStoreWriteTarget } from './guards.js';

// A separate client: no writer is ever added to the admin read facade.
export function createStoreDatabase(config) {
  let client; let connecting;
  async function connect() {
    if (!connecting) {
      client = new MongoClient(config.mongoUri, { family: 4, serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, socketTimeoutMS: 10000, maxPoolSize: 4, retryWrites: false });
      connecting = client.connect().catch(async () => {
        await client.close().catch(() => {}); connecting = undefined;
        throw new StoreError(503, 'DATABASE_UNAVAILABLE');
      });
    }
    await connecting;
    return client.db(config.dbName);
  }
  return Object.freeze({
    read: connect,
    async write() {
      // Reject forbidden DB names before even connecting or accessing a writer.
      assertStoreWriteTarget(config, config.dbName);
      const db = await connect();
      assertStoreWriteTarget(config, db.databaseName);
      return db;
    },
    async close() { if (client) await client.close(); connecting = undefined; }
  });
}
