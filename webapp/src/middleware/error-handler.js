export function publicError(error) {
  if (error.status === 400) {
    const trusted = error.code === 'INVALID_QUERY';
    return { status: 400, body: { error: { code: 'INVALID_QUERY', message: trusted ? error.message : 'Yêu cầu không hợp lệ.', ...(trusted ? { details: error.details } : {}) } } };
  }
  const databaseFailure = error.status === 503 || /Mongo(?:Network|ServerSelection|TopologyClosed|PoolCleared|NotConnected|OperationTimeout)/.test(error.name || '');
  return databaseFailure
    ? { status: 503, body: { error: { code: 'DATABASE_UNAVAILABLE', message: 'MongoDB chưa sẵn sàng. Hãy kiểm tra dịch vụ và thử lại.' } } }
    : { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' } } };
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const result = publicError(error);
  // Không log error.message/stack, URI hoặc thông tin kết nối.
  if (result.status >= 500) console.error(`[API] ${result.body.error.code}`);
  res.status(result.status).json(result.body);
}
