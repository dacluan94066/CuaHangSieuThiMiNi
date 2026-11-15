let session;
export const authState = () => session;
export const canPage = page => Boolean(session?.authenticated && session.user?.permissions.includes(page));
export function authFailure(status) {
  if (status === 401) { session = undefined; window.dispatchEvent(new Event('admin:expired')); }
  if (status === 403) window.dispatchEvent(new Event('admin:forbidden'));
}
async function request(path, body) {
  let response; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
  try { response = await fetch('/admin-auth/' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': session?.csrfToken || '' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  catch { throw new Error('Không kết nối được ứng dụng. Vui lòng thử lại.'); }
  finally { clearTimeout(timer); }
  let json; try { json = await response.json(); } catch { throw new Error('Phản hồi xác thực không hợp lệ.'); }
  if (!response.ok) { if ([401, 403].includes(response.status)) session = undefined; throw new Error(json.error?.message || 'Không thể xác thực. Vui lòng thử lại.'); }
  return json.data;
}
export async function bootstrapAuth() { session = await request('session'); return session; }
export async function loginAdmin(tenDangNhap, matKhau) { if (!session) await bootstrapAuth(); session = await request('dang-nhap', { tenDangNhap, matKhau }); return session; }
export async function logoutAdmin() { if (!session) await bootstrapAuth(); await request('dang-xuat', {}); session = undefined; }
