export const adminValidator = { $jsonSchema: { bsonType: 'object', additionalProperties: false,
  required: ['MaTKQT', 'TenDangNhap', 'MaNV', 'MatKhauBam', 'Salt', 'ThamSoBam', 'ChinhSachMatKhau', 'TrangThaiBaoMat', 'PhienBanXacThuc', 'NgayTao', 'NgayCapNhat'],
  properties: {
    _id: { bsonType: 'objectId' }, MaTKQT: { bsonType: 'string', minLength: 1, maxLength: 50 }, TenDangNhap: { bsonType: 'string', pattern: '^[A-Za-z0-9_.-]{1,64}$' }, MaNV: { bsonType: 'string', minLength: 1, maxLength: 50 },
    MatKhauBam: { bsonType: 'string', pattern: '^[A-Za-z0-9+/]{86}==$' }, Salt: { bsonType: 'string', pattern: '^[A-Za-z0-9+/]{22}==$' },
    ThamSoBam: { bsonType: 'object', additionalProperties: false, required: ['algorithm', 'version', 'N', 'r', 'p', 'keylen'], properties: { algorithm: { enum: ['scrypt'] }, version: { enum: [1] }, N: { enum: [131072] }, r: { enum: [8] }, p: { enum: [1] }, keylen: { enum: [64] } } },
    ChinhSachMatKhau: { enum: ['IMPORT_DEMO', 'DAT_LAI'] }, TrangThaiBaoMat: { enum: ['HoatDong', 'Khoa'] }, PhienBanXacThuc: { bsonType: ['int', 'long'], minimum: 1 }, NgayTao: { bsonType: 'date' }, NgayCapNhat: { bsonType: 'date' }
  }
} };
export const adminIndexes = ['TenDangNhap', 'MaTKQT'].map(field => ({ key: { [field]: 1 }, name: `uq_TaiKhoanQuanTri_${field}` }));
