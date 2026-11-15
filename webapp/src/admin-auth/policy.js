export const ROLES = Object.freeze(['Quản trị', 'Thu ngân', 'Kho', 'Bán hàng']);
export const ROLE_PAGES = Object.freeze({
  'Quản trị': ['dashboard', 'san-pham', 'hoa-don', 'phieu-nhap', 'khach-hang', 'nhan-vien', 'khuyen-mai', 'bao-cao', 'canh-bao-kho', 'kiem-tra-du-lieu'],
  'Thu ngân': ['san-pham', 'hoa-don', 'khach-hang', 'khuyen-mai'],
  'Kho': ['san-pham', 'canh-bao-kho', 'phieu-nhap'],
  'Bán hàng': ['san-pham', 'canh-bao-kho', 'hoa-don', 'khach-hang', 'khuyen-mai']
});
export const ROUTE_POLICIES = Object.freeze({
  '/health': 'health', '/danh-muc': 'san-pham', '/nha-cung-cap': 'supply', '/phuong-thuc-thanh-toan': 'hoa-don', '/dashboard': 'dashboard',
  '/san-pham': 'san-pham', '/san-pham/:maSP': 'san-pham', '/hoa-don': 'hoa-don', '/hoa-don/:maHD': 'hoa-don',
  '/phieu-nhap': 'phieu-nhap', '/phieu-nhap/:maPN': 'phieu-nhap', '/khach-hang': 'khach-hang', '/khach-hang/:maKH': 'khach-hang',
  '/nhan-vien': 'nhan-vien', '/khuyen-mai': 'khuyen-mai', '/canh-bao-kho': 'canh-bao-kho',
  '/bao-cao/tong-quan': 'bao-cao', '/bao-cao/doanh-thu': 'bao-cao', '/bao-cao/san-pham': 'bao-cao', '/bao-cao/khach-hang': 'bao-cao', '/kiem-tra-du-lieu': 'kiem-tra-du-lieu'
});
export const canViewSupply = role => ['Quản trị', 'Kho'].includes(role);
export function canRead(role, resource) {
  if (!ROLES.includes(role) || !resource) return false;
  if (resource === 'health') return true;
  if (resource === 'supply') return canViewSupply(role);
  return ROLE_PAGES[role].includes(resource);
}
const privateField = /matkhau|password|hash|salt|^sid$|ThamSoBam|Snapshot|GiuChoOnline|DiemDaCongOnline|journal|DauVanTay|MONGO_URI|PhienBanXacThuc/i;
const supplyFields = new Set(['DonGiaNhap', 'MaNCC', 'TenNCC', 'NhaCungCap']);
export function projectResponse(value, hideSupply = false) {
  if (value == null || typeof value !== 'object' || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(item => projectResponse(item, hideSupply));
  if (value._bsontype) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !privateField.test(key) && !(hideSupply && supplyFields.has(key))).map(([key, item]) => [key, hideSupply && key === 'ThamChieuThieu' && Array.isArray(item) ? item.filter(code => code !== 'MaNCC') : projectResponse(item, hideSupply)]));
}
