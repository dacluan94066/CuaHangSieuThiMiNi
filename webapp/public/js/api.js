import { authFailure, authState } from './auth-session.js';
export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.name = 'ApiError'; this.status = status; this.details = details; }
}

export async function get(path, params = {}, { signal } = {}) {
  if (!path.startsWith('/api/')) throw new Error('Đường dẫn API không hợp lệ.');
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  let response;
  try { response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store', signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('Không kết nối được ứng dụng. Hãy kiểm tra server và thử lại.', 0); }
  let body;
  try { body = await response.json(); } catch { throw new ApiError('Phản hồi từ server không hợp lệ.', response.status); }
  if (!response.ok) { if ([401, 403].includes(response.status)) authFailure(response.status); throw new ApiError(body.error?.message || 'Không thể tải dữ liệu.', response.status, body.error?.details); }
  return body;
}

export async function sendRequest(method, path, body = undefined, { signal } = {}) {
  if (!path.startsWith('/api/')) throw new Error('Đường dẫn API không hợp lệ.');
  const url = new URL(path, window.location.origin);
  const session = authState();
  const headers = { Accept: 'application/json' };
  if (session?.csrfToken) headers['X-CSRF-Token'] = session.csrfToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Không kết nối được ứng dụng. Hãy kiểm tra server và thử lại.', 0);
  }
  let resBody;
  try { resBody = await response.json(); } catch { throw new ApiError('Phản hồi từ server không hợp lệ.', response.status); }
  if (!response.ok) {
    if ([401, 403].includes(response.status)) authFailure(response.status);
    throw new ApiError(resBody.error?.message || 'Yêu cầu không thành công.', response.status, resBody.error?.details);
  }
  return resBody;
}

export const post = (path, body, opts) => sendRequest('POST', path, body, opts);
export const put = (path, body, opts) => sendRequest('PUT', path, body, opts);
export const patch = (path, body, opts) => sendRequest('PATCH', path, body, opts);
export const del = (path, opts) => sendRequest('DELETE', path, undefined, opts);
