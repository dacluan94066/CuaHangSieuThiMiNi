const moneyFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const money = value => Number.isFinite(value) ? moneyFormat.format(value) : 'Chưa xác định';
export const date = (value, utc = false) => value && Number.isFinite(new Date(value).getTime())
  ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: utc ? 'UTC' : 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa có hạn sử dụng';
export function conditionText(value) {
  const parts = [];
  if (value.DonHangToiThieu !== undefined) parts.push(`Đơn từ ${money(value.DonHangToiThieu)}`);
  if (value.DiemToiThieu !== undefined) parts.push(`Cần ${value.DiemToiThieu} điểm tích lũy`);
  if (value.MaDM) parts.push(`Áp dụng danh mục ${value.MaDM}`);
  if (value.SoLuongToiThieu !== undefined) parts.push(`Tối thiểu ${value.SoLuongToiThieu} sản phẩm phù hợp`);
  if (value.GiamToiDa !== undefined) parts.push(`Giảm tối đa ${money(value.GiamToiDa)}`);
  return parts.join(' · ') || 'Xem điều kiện trước khi áp dụng';
}
