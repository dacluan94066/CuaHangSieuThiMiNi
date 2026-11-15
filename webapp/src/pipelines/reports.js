import { TIMEZONE } from '../utils/dates.js';

// Chuyển logic bài 1, 2/22, 6, 13 của file 05 sang pipeline chỉ đọc.
export const salesSummary = match => [
  { $match: match },
  { $group: { _id: null, doanhThu: { $sum: '$ThanhTien' }, tienHang: { $sum: '$TongTien' }, giamGia: { $sum: '$GiamGia' }, soHoaDon: { $sum: 1 } } },
  { $project: { _id: 0, doanhThu: 1, tienHang: 1, giamGia: 1, soHoaDon: 1 } }
];
export const monthlySales = match => [
  { $match: match },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m', date: '$NgayLap', timezone: TIMEZONE } },
    doanhThu: { $sum: '$ThanhTien' }, soHoaDon: { $sum: 1 }, trungBinhHoaDon: { $avg: '$ThanhTien' }
  } },
  { $sort: { _id: 1 } },
  { $facet: {
    items: [{ $limit: 100 }, { $project: { _id: 0, thang: '$_id', doanhThu: 1, soHoaDon: 1, trungBinhHoaDon: 1 } }],
    total: [{ $count: 'value' }]
  } }
];
export const topProducts = match => [
  { $match: match }, { $unwind: '$ChiTiet' },
  { $group: { _id: '$ChiTiet.MaSP', tenSP: { $first: '$ChiTiet.TenSP' }, soLuongBan: { $sum: '$ChiTiet.SoLuong' } } },
  { $sort: { soLuongBan: -1, _id: 1 } }, { $limit: 5 },
  { $project: { _id: 0, maSP: '$_id', tenSP: 1, soLuongBan: 1 } }
];
export const paymentSummary = match => [
  { $match: match },
  { $group: { _id: '$PhuongThucThanhToan', soHoaDon: { $sum: 1 }, doanhThu: { $sum: '$ThanhTien' } } },
  { $sort: { soHoaDon: -1, _id: 1 } },
  { $facet: {
    items: [{ $limit: 100 }, { $project: { _id: 0, phuongThuc: '$_id', soHoaDon: 1, doanhThu: 1 } }],
    total: [{ $count: 'value' }]
  } }
];
