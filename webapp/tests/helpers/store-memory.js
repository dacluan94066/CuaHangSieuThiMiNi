// In-memory fault-injection double only. Does not connect to any MongoDB.
export function memoryDatabase(fault = () => {}) {
  const data = new Map(['TaiKhoanKhachHang', 'KhachHang', 'YeuCauCuaHang'].map(name => [name, []]));
  const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => value && typeof value === 'object' && '$in' in value ? value.$in.includes(doc[key]) : doc[key] === value);
  const keys = { TaiKhoanKhachHang: ['MaTKKH', 'MaKH', 'SDT'], KhachHang: ['MaKH', 'SDT'], YeuCauCuaHang: ['MaYeuCau'] };
  const db = {
    databaseName: 'QLSieuThiMini_Test',
    collection(name) {
      const rows = data.get(name); if (!rows) throw new Error('Unexpected memory collection');
      function op(verb, input, mutate) {
        fault(name, verb, input, 'before'); const result = mutate(); fault(name, verb, input, 'after'); return result;
      }
      return {
        async findOne(filter) { return op('findOne', filter, () => structuredClone(rows.find(row => matches(row, filter)) || null)); },
        find(filter) { let limit = Infinity; return { limit(value) { limit = value; return this; }, async toArray() { return structuredClone(rows.filter(row => matches(row, filter)).slice(0, limit)); } }; },
        async insertOne(doc) { return op('insertOne', doc, () => {
          if (keys[name].some(key => rows.some(row => row[key] === doc[key]))) throw Object.assign(new Error('duplicate'), { code: 11000 });
          rows.push(structuredClone(doc)); return { acknowledged: true };
        }); },
        async updateOne(filter, update) { return op('updateOne', { filter, update }, () => {
          const row = rows.find(row => matches(row, filter)); if (row) Object.assign(row, structuredClone(update.$set)); return { matchedCount: row ? 1 : 0 };
        }); },
        async deleteOne(filter) { return op('deleteOne', filter, () => { const index = rows.findIndex(row => matches(row, filter)); if (index >= 0) rows.splice(index, 1); return { deletedCount: index >= 0 ? 1 : 0 }; }); }
      };
    }
  };
  return { data, db, database: { read: async () => db, write: async () => db } };
}
