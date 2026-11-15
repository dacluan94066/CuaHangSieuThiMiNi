import { authFailure } from './auth-session.js';
export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.name = 'ApiError'; this.status = status; this.details = details; }
}

export async function get(path, params = {}, { signal } = {}) {
  if (!path.startsWith('/api/')) throw new Error('Đường dẫn API không hợp lệ.');
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  let response;
  try { response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('Không kết nối được ứng dụng. Hãy kiểm tra server và thử lại.', 0); }
  let body;
  try { body = await response.json(); } catch { throw new ApiError('Phản hồi từ server không hợp lệ.', response.status); }
  if (!response.ok) { if ([401, 403].includes(response.status)) authFailure(response.status); throw new ApiError(body.error?.message || 'Không thể tải dữ liệu.', response.status, body.error?.details); }
  return body;
}
