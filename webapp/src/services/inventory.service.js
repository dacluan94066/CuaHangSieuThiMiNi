import { expiryWindow } from '../utils/dates.js';
import { searchFilter } from '../utils/query.js';
import { stockFilter, productPage } from './products.service.js';

export function inventoryFilter(query, now = new Date()) {
  const { today, upcomingEnd } = expiryWindow(now);
  const conditions = {
    'het-hang': stockFilter('het-hang'),
    'ton-thap': stockFilter('ton-thap'),
    'het-han': { HanSuDung: { $type: 'date', $lt: today } },
    'sap-het-han': { HanSuDung: { $type: 'date', $gte: today, $lt: upcomingEnd } }
  };
  const warning = query.loai && query.loai !== 'tat-ca' ? conditions[query.loai] : { $or: Object.values(conditions) };
  return { $and: [searchFilter(query.q, ['MaSP', 'TenSP']), warning] };
}

export async function listInventory(db, query) {
  const now = new Date();
  const result = await productPage(db, inventoryFilter(query, now), { ...query, sort: 'ma-tang' }, now);
  const { today, upcomingEnd } = expiryWindow(now);
  return { ...result, meta: { ...result.meta, loai: query.loai, todayStart: today.toISOString(), upcomingEnd: upcomingEnd.toISOString() } };
}
