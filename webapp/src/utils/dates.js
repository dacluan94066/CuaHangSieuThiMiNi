export const TIMEZONE = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;
const VN_OFFSET = 7 * 60 * 60 * 1000;

export function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ngày phải có dạng yyyy-MM-dd.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Ngày không tồn tại.');
  return date;
}

export function dateRange(from, to, field = 'NgayLap') {
  const range = {};
  if (from) range.$gte = new Date(parseCalendarDate(from).getTime() - VN_OFFSET);
  if (to) range.$lt = new Date(parseCalendarDate(to).getTime() + DAY - VN_OFFSET);
  if (from && to && from > to) throw new Error('Từ ngày phải nhỏ hơn hoặc bằng đến ngày.');
  return Object.keys(range).length ? { [field]: range } : {};
}

export function promotionStatus(start, end, now = new Date()) {
  const values = [start, end, now].map(value => new Date(value).getTime());
  if ([start, end, now].some(value => value == null) || values.some(value => !Number.isFinite(value)) || values[0] > values[1]) return 'Chưa xác định';
  if (values[2] < values[0]) return 'Sắp diễn ra';
  return values[2] > values[1] ? 'Đã kết thúc' : 'Đang áp dụng';
}

export function stockStatus(quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) return 'Chưa xác định';
  return quantity === 0 ? 'Hết hàng' : quantity < 20 ? 'Tồn thấp' : 'Còn hàng';
}

export function expiryStatus(expiry, now = new Date()) {
  if (expiry == null) return 'Chưa có hạn sử dụng';
  const end = new Date(expiry).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(current)) return 'Chưa xác định';
  const difference = Math.floor((end + VN_OFFSET) / DAY) - Math.floor((current + VN_OFFSET) / DAY);
  return difference < 0 ? 'Hết hạn' : difference <= 30 ? 'Sắp hết hạn' : 'Còn hạn';
}

export function expiryWindow(now = new Date()) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) throw new Error('Thời điểm kiểm tra không hợp lệ.');
  const start = Math.floor((time + VN_OFFSET) / DAY) * DAY - VN_OFFSET;
  return { today: new Date(start), upcomingEnd: new Date(start + 31 * DAY) };
}

export function nextMonthDate(month) {
  const date = parseCalendarDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}
