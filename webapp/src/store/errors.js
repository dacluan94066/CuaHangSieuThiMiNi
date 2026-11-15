import { randomUUID } from 'node:crypto';

const messages = Object.freeze({
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.', UNKNOWN_PARAMETER: 'Có tham số không được hỗ trợ.',
  AUTH_REQUIRED: 'Vui lòng đăng nhập.', INVALID_CREDENTIALS: 'SĐT hoặc mật khẩu không đúng.',
  CSRF_INVALID: 'Phiên bảo vệ yêu cầu không hợp lệ. Hãy tải lại phiên.', ORIGIN_INVALID: 'Nguồn yêu cầu không hợp lệ.',
  TOO_MANY_ATTEMPTS: 'Có quá nhiều yêu cầu. Vui lòng thử lại sau.',
  REGISTRATION_UNAVAILABLE: 'Không thể đăng ký với thông tin hiện tại.',
  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm.', CART_ITEM_NOT_FOUND: 'Không có sản phẩm này trong giỏ.',
  PRODUCT_UNAVAILABLE: 'Sản phẩm đã hết hàng, hết hạn hoặc hiện không bán.',
  PRODUCT_DATA_INVALID: 'Dữ liệu giá hoặc tồn kho chưa hợp lệ.', INSUFFICIENT_STOCK: 'Số lượng vượt tồn kho hiện có.',
  CART_LIMIT: 'Giỏ tối đa 50 mã, mỗi mã từ 1 đến 99 sản phẩm.',
  CART_EMPTY: 'Giỏ hàng đang trống.', CART_BUSY: 'Giỏ đang xử lý đơn. Hãy chờ yêu cầu hiện tại kết thúc.',
  CHECKOUT_DISABLED: 'Checkout đang khóa, cần hoàn tất kiểm chứng hoặc xem xét lỗi nhất quán.',
  IDEMPOTENCY_KEY_REQUIRED: 'Thiếu mã chống gửi trùng.', IDEMPOTENCY_CONFLICT: 'Mã chống gửi trùng đã dùng cho báo giá khác.',
  QUOTE_EXPIRED: 'Báo giá đã hết hạn hoặc không còn trong phiên. Hãy xem báo giá mới.',
  QUOTE_CHANGED: 'Giá, điều kiện hoặc giỏ đã thay đổi. Hãy xem lại báo giá.', QUOTE_ALREADY_USED: 'Báo giá này đã được dùng cho một yêu cầu đặt hàng.',
  PROMOTION_NOT_FOUND: 'Không tìm thấy mã khuyến mãi.', PROMOTION_NOT_STARTED: 'Khuyến mãi chưa bắt đầu.',
  PROMOTION_EXPIRED: 'Khuyến mãi đã hết hạn.', PROMOTION_NOT_ELIGIBLE: 'Đơn hàng hoặc điểm tích lũy chưa đủ điều kiện khuyến mãi.',
  PROMOTION_UNSUPPORTED: 'Dữ liệu hoặc điều kiện khuyến mãi chưa được hỗ trợ.',
  RECOVERY_ABORTED: 'Yêu cầu chưa tạo đơn; phần giữ tồn đã được hoàn tác. Hãy xem báo giá mới.',
  REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu đặt hàng.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  STORE_SETUP_REQUIRED: 'Cửa hàng chưa được thiết lập đầy đủ.',
  STORE_WRITES_DISABLED: 'Ghi cửa hàng chưa được bật cho database Test.',
  RECOVERY_PENDING: 'Có tác vụ cần phục hồi trước khi tiếp tục.',
  DATABASE_UNAVAILABLE: 'MongoDB chưa sẵn sàng.',
  METHOD_NOT_ALLOWED: 'Phương thức không được hỗ trợ.', NOT_FOUND: 'Không tìm thấy tài nguyên.',
  PAYLOAD_TOO_LARGE: 'Nội dung yêu cầu quá lớn.', INTERNAL_ERROR: 'Không thể xử lý yêu cầu.'
});

export class StoreError extends Error {
  constructor(status, code, retryAfter) {
    super(messages[code] || messages.INTERNAL_ERROR);
    this.status = status; this.code = code; this.retryAfter = retryAfter;
  }
}
export function storeErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const safe = error instanceof StoreError ? error
    : error.type === 'entity.too.large' ? new StoreError(413, 'PAYLOAD_TOO_LARGE')
      : (error instanceof SyntaxError || error instanceof URIError) && error.status === 400 ? new StoreError(400, 'VALIDATION_ERROR')
        : new StoreError(500, 'INTERNAL_ERROR');
  if (safe.retryAfter) res.set('Retry-After', String(safe.retryAfter));
  // Never log raw driver errors, input, cookies or connection strings.
  res.status(safe.status).json({ error: { code: safe.code, message: safe.message, requestId: res.locals.requestId || randomUUID() } });
}

export function customerDto(customer) {
  if (!customer) return null;
  return Object.fromEntries(['MaKH', 'HoTen', 'SDT', 'Email', 'DiaChi', 'DiemTichLuy', 'NgayDangKy']
    .filter(key => customer[key] !== undefined).map(key => [key, customer[key]]));
}
