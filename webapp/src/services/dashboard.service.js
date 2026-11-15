import { dateRange, nextMonthDate, TIMEZONE } from '../utils/dates.js';
import { salesSummary, monthlySales, topProducts, paymentSummary } from '../pipelines/reports.js';
import { publicError } from '../middleware/error-handler.js';

export async function dashboard(db, query) {
  const match = dateRange(query.from, query.to);
  const tasks = {
    async summary() {
      const [invoices, products, customers] = await Promise.all(['HoaDon', 'SanPham', 'KhachHang'].map(name => db.collection(name)));
      const [sales, soSanPham, soKhachHang, tonThap, hetHang] = await Promise.all([
        invoices.aggregate(salesSummary(match)).toArray(), products.countDocuments({}), customers.countDocuments({}),
        products.countDocuments({ SoLuongTon: { $gte: 1, $lte: 19 } }), products.countDocuments({ SoLuongTon: 0 })
      ]);
      return { ...(sales[0] || { doanhThu: 0, tienHang: 0, giamGia: 0, soHoaDon: 0 }), soSanPham, soKhachHang, tonThap, hetHang };
    },
    async monthly() {
      const collection = await db.collection('HoaDon');
      const [result] = await collection.aggregate(monthlySales(match)).toArray();
      const items = result?.items || [];
      const total = result?.total[0]?.value || 0;
      return { items, total, limit: 100, nextFrom: total > items.length ? nextMonthDate(items.at(-1).thang) : null };
    },
    async topProducts() { return (await db.collection('HoaDon')).aggregate(topProducts(match)).toArray(); },
    async payments() {
      const [result] = await (await db.collection('HoaDon')).aggregate(paymentSummary(match)).toArray();
      return { items: result?.items || [], total: result?.total[0]?.value || 0, limit: 100 };
    }
  };
  const entries = Object.entries(tasks);
  const results = await Promise.allSettled(entries.map(([, task]) => task()));
  const data = {};
  const errors = {};
  results.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === 'fulfilled') data[key] = result.value;
    else errors[key] = publicError(result.reason).body.error;
  });
  if (!Object.keys(data).length) throw results.find(result => result.status === 'rejected').reason;
  return { data, errors, meta: { timezone: TIMEZONE, updatedAt: new Date().toISOString(), range: { from: query.from || null, to: query.to || null } } };
}
