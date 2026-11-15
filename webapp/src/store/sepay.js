export function createSepayWebhookHandler({ database, apiKey }) {
  return async (req, res) => {
    try {
      // 1. Verify API Key if configured
      if (apiKey) {
        const authHeader = req.headers['authorization'] || '';
        if (!authHeader.toLowerCase().includes(apiKey.toLowerCase())) {
          console.warn('[SePay Webhook] Unauthorized request. Header was:', authHeader);
          return res.status(401).json({ success: false, message: 'Invalid API Key' });
        }
      }

      const body = req.body || {};
      const { content, transferAmount, transferType, gateway, referenceCode } = body;

      console.log('[SePay Webhook] Nhận thông báo giao dịch:', {
        noiDung: content,
        soTien: transferAmount,
        loai: transferType,
        nganHang: gateway,
        maGD: referenceCode
      });

      if (transferType && transferType !== 'in') {
        return res.json({ success: true, message: 'Bỏ qua giao dịch chuyển tiền đi (out)' });
      }

      if (!content) {
        return res.status(400).json({ success: false, message: 'Thiếu nội dung chuyển khoản' });
      }

      // 2. Tìm đơn hàng tương ứng
      const db = await database.write();

      // Thử trích xuất mã hóa đơn dạng HD_ONL_... hoặc bất kỳ HD...
      const match = String(content).match(/HD_ONL_[a-f0-9]{32}/i) || String(content).match(/HD[A-Za-z0-9_]+/i);
      const possibleCode = match ? match[0] : null;

      let order = null;
      if (possibleCode) {
        order = await db.collection('HoaDon').findOne({
          $or: [
            { MaHD: possibleCode },
            { MaHD: new RegExp(possibleCode.replace(/[^a-zA-Z0-9]/g, '.*'), 'i') }
          ]
        });
      }

      if (!order) {
        // Tìm kiếm dự phòng: quét 15 đơn hàng online gần nhất
        const recentOrders = await db.collection('HoaDon').find({
          NguonDon: 'ONLINE',
          TrangThaiThanhToan: { $ne: 'Đã thanh toán (SePay)' }
        }).sort({ NgayLap: -1 }).limit(15).toArray();

        const cleanContent = String(content).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        for (const o of recentOrders) {
          const rawCode = o.MaHD.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (cleanContent.includes(rawCode) || rawCode.includes(cleanContent)) {
            order = o;
            break;
          }
        }
      }

      if (!order) {
        console.warn('[SePay Webhook] Không tìm thấy đơn hàng tương ứng với nội dung:', content);
        return res.status(200).json({ success: false, message: 'Không tìm thấy hóa đơn phù hợp trong hệ thống' });
      }

      // 3. Kiểm tra số tiền
      const paid = Number(transferAmount);
      if (paid < order.ThanhTien) {
        console.warn(`[SePay Webhook] Số tiền thanh toán chưa đủ: cần ${order.ThanhTien}, nhận được ${paid}`);
        return res.status(200).json({ success: false, message: 'Số tiền thanh toán chưa đủ' });
      }

      // 4. Cập nhật đơn hàng thành "Đã thanh toán (SePay)"
      await db.collection('HoaDon').updateOne(
        { MaHD: order.MaHD },
        {
          $set: {
            TrangThaiThanhToan: 'Đã thanh toán (SePay)',
            MaGiaoDichNganHang: String(referenceCode || body.id || 'SEPAY_' + Date.now()),
            NgayThanhToanThucTe: new Date()
          }
        }
      );

      console.log(`[SePay Webhook] 🎉 Đơn hàng ${order.MaHD} đã được tự động xác nhận ĐÃ THANH TOÁN!`);
      return res.json({ success: true, message: 'Xác nhận đơn hàng thành công', maHD: order.MaHD });
    } catch (err) {
      console.error('[SePay Webhook] Lỗi khi xử lý:', err);
      return res.status(500).json({ success: false, message: 'Lỗi server xử lý webhook' });
    }
  };
}
