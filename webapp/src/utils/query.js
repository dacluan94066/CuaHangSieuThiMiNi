export function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function searchFilter(q, fields) {
  return q ? { $or: fields.map(field => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } })) } : {};
}

export function pagination(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function queryError(message, parameter = 'query') {
  const error = new Error(message);
  error.status = 400;
  error.code = 'INVALID_QUERY';
  error.details = [{ parameter, message }];
  return error;
}
