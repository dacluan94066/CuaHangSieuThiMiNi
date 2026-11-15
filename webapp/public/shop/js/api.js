let session; let bootstrapping;
export class ApiError extends Error { constructor(message, code, status) { super(message); this.code = code; this.status = status; } }
async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  if (method !== 'GET') await getSession();
  const headers = method === 'GET' ? {} : { 'X-CSRF-Token': session.csrfToken };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`/store-api${path}`, { method, headers, credentials: 'same-origin', cache: 'no-store', signal: controller.signal, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) {
      if (result.error?.code === 'CSRF_INVALID' || response.status === 401) session = undefined;
      throw new ApiError(result.error?.message || 'Không thể xử lý yêu cầu.', result.error?.code, response.status);
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Không kết nối được cửa hàng. Kiểm tra server và thử lại.', 'NETWORK_ERROR', 0);
  } finally { clearTimeout(timeout); }
}
export async function getSession(force = false) {
  if (force) session = undefined;
  if (session) return session;
  if (!bootstrapping) bootstrapping = request('/session').then(result => (session = result.data)).finally(() => { bootstrapping = undefined; });
  return bootstrapping;
}
export const get = path => request(path);
export const write = (path, method, body, options = {}) => request(path, { method, body, ...options });
export async function login(body) {
  const result = await write('/auth/dang-nhap', 'POST', body);
  session = { authenticated: true, ...result.data };
  return session;
}
export async function logout() { await write('/auth/dang-xuat', 'POST', {}); session = undefined; }
