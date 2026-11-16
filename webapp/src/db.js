import { MongoClient } from 'mongodb';

const COLLECTIONS = new Set(['DanhMuc', 'NhaCungCap', 'SanPham', 'KhachHang', 'NhanVien', 'TaiKhoan', 'KhuyenMai', 'HoaDon', 'PhieuNhap', 'TaiKhoanQuanTri', 'TaiKhoanKhachHang']);
const WRITE_STAGES = new Set(['$out', '$merge']);

function checkPipeline(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (WRITE_STAGES.has(key)) throw new Error('Pipeline không được phép ghi dữ liệu.');
    checkPipeline(nested);
  }
}

export function createDatabase(config) {
  let client;
  let connecting;
  async function connect() {
    if (!connecting) {
      client = new MongoClient(config.mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
        socketTimeoutMS: 10000,
        maxPoolSize: 8,
        retryWrites: false
      });
      connecting = client.connect().catch(async () => {
        await client.close().catch(() => {});
        connecting = undefined;
        const error = new Error('Không kết nối được MongoDB. Kiểm tra dịch vụ và cấu hình kết nối.');
        error.status = 503;
        error.code = 'DATABASE_UNAVAILABLE';
        throw error;
      });
    }
    await connecting;
    return client.db(config.dbName);
  }
  return Object.freeze({
    async collection(name) {
      if (!COLLECTIONS.has(name)) throw new Error('Collection không được hỗ trợ.');
      const collection = (await connect()).collection(name);
      return Object.freeze({
        find: (filter, options = {}) => collection.find(filter, { maxTimeMS: 5000, ...options }),
        findOne: (filter, options = {}) => collection.findOne(filter, { maxTimeMS: 5000, ...options }),
        insertOne: (doc, options = {}) => collection.insertOne(doc, options),
        updateOne: (filter, update, options = {}) => collection.updateOne(filter, update, options),
        deleteOne: (filter, options = {}) => collection.deleteOne(filter, options),
        aggregate(pipeline, options = {}) {
          checkPipeline(pipeline);
          return collection.aggregate(pipeline, { maxTimeMS: 5000, ...options });
        },
        countDocuments: (filter, options = {}) => collection.countDocuments(filter, { maxTimeMS: 5000, ...options })
      });
    },
    async close() { if (client) await client.close(); connecting = undefined; }
  });
}
