import { get, patch } from '../api.js';
import { el, loading, errorBox, table, badge, detailRow as row, detailSection as section, metricCards, renderReadList, setConnectionState } from '../ui.js';
import { money, number, dateTime, promotionEndDate } from '../format.js';

export const invoiceColumns = [
  { label: 'Mã hóa đơn', render: value => el('a', { href: `#/hoa-don/${encodeURIComponent(value.MaHD)}`, className: 'code-link', text: value.MaHD }) },
  { label: 'Ngày lập', render: value => dateTime(value.NgayLap) },
  {
    label: 'Kênh bán',
    render: value => value.NguonDon === 'ONLINE'
      ? el('span', { className: 'badge badge-online', text: '🌐 Online' })
      : el('span', { className: 'badge badge-pos', text: '🏬 Tại quầy' })
  },
  {
    label: 'Khách hàng',
    render: value => el('div', { className: 'table-product' }, [
      el('a', { href: `#/khach-hang/${encodeURIComponent(value.MaKH)}`, text: value.TenKH }),
      el('small', { text: value.KhachHang?.SDT || value.MaKH })
    ])
  },
  {
    label: 'Phương thức TT',
    render: value => {
      const p = value.PhuongThucThanhToan || '';
      if (p.includes('VietQR') || p.includes('MBBank') || p.includes('SePay') || value.TrangThaiThanhToan?.includes('SePay')) {
        return el('span', { className: 'badge badge-sepay', text: '💳 MBBank (SePay)' });
      }
      if (p.includes('COD')) {
        return el('span', { className: 'badge badge-cod', text: '💵 COD' });
      }
      return el('span', { className: 'badge badge-pos', text: p || 'Tiền mặt' });
    }
  },
  {
    label: 'Trạng thái đơn',
    render: value => {
      if (value.NguonDon !== 'ONLINE') return el('span', { className: 'badge badge-status-done', text: 'Hoàn tất' });
      const status = value.TrangThaiDon || 'Đã xác nhận';
      let cls = 'badge-status-confirmed';
      if (status === 'Đang giao hàng') cls = 'badge-status-shipping';
      else if (status === 'Hoàn tất') cls = 'badge-status-done';
      else if (status === 'Đã hủy') cls = 'badge-status-cancelled';
      return el('span', { className: `badge ${cls}`, text: status });
    }
  },
  { label: 'Tiền hàng', numeric: true, render: value => money(value.TongTien) },
  { label: 'Giảm giá', numeric: true, render: value => money(value.GiamGia) },
  { label: 'Thực thu', numeric: true, render: value => money(value.ThanhTien) }
];

export function renderInvoices(container, context) {
  return renderReadList(container, context, {
    kind: 'invoices',
    path: '/hoa-don',
    api: '/api/hoa-don',
    title: 'Hóa đơn & Đơn hàng',
    eyebrow: 'TRUNG TÂM GIAO DỊCH',
    description: 'Quản lý toàn bộ hóa đơn bán lẻ tại quầy và các đơn đặt hàng trực tuyến từ website Storefront.',
    placeholder: 'Ví dụ: HD009 hoặc HD_ONL_...',
    tableTitle: 'Danh sách hóa đơn',
    emptyText: 'Không có hóa đơn hoặc đơn hàng nào phù hợp bộ lọc.',
    note: 'Đơn mới nhất xếp trước. Hỗ trợ đối soát mã giao dịch MBBank và SePay tự động.',
    columns: invoiceColumns,
    filters: [
      {
        key: 'nguonDon',
        label: 'Kênh bán hàng',
        options: [
          ['', 'Tất cả kênh bán'],
          ['ONLINE', '🌐 Đơn hàng Online (Storefront)'],
          ['POS', '🏬 Bán lẻ tại quầy (POS)']
        ]
      },
      {
        key: 'trangThaiDon',
        label: 'Trạng thái đơn Online',
        options: [
          ['', 'Tất cả trạng thái'],
          ['Đã xác nhận', 'Đã xác nhận'],
          ['Đang giao hàng', 'Đang giao hàng'],
          ['Hoàn tất', 'Hoàn tất'],
          ['Đã hủy', 'Đã hủy']
        ]
      },
      { key: 'from', label: 'Từ ngày', type: 'date' },
      { key: 'to', label: 'Đến ngày', type: 'date' },
      { key: 'thanhToan', label: 'Phương thức thanh toán', source: '/api/phuong-thuc-thanh-toan', valueField: 'phuongThuc', labelField: 'phuongThuc', allLabel: 'Tất cả phương thức' },
      { key: 'thucThuTren', label: 'Thực thu lớn hơn (VNĐ)', type: 'number', placeholder: 'Không giới hạn' }
    ]
  });
}

function promotionConditions(conditions = {}) {
  const descriptions = { DonHangToiThieu: ['Đơn tối thiểu', money], GiamToiDa: ['Giảm tối đa', money], DiemToiThieu: ['Điểm tối thiểu', number], MaDM: ['Mã danh mục', String], SoLuongToiThieu: ['Số lượng tối thiểu', number] };
  const items = Object.entries(conditions).map(([key, value]) => {
    const [title, formatter] = descriptions[key] || [key, value => typeof value === 'object' ? JSON.stringify(value) : String(value)];
    return el('li', { text: `${title}: ${formatter(value)}` });
  });
  return items.length ? el('ul', { className: 'condition-list' }, items) : 'Không có điều kiện bổ sung';
}

export function renderInvoiceDetail(container, { signal, code }) {
  const body = el('div', {}, [loading()]);
  container.replaceChildren(el('a', { className: 'back-link', href: '#/hoa-don', text: '← Danh sách hóa đơn' }), body);

  async function load() {
    body.replaceChildren(loading()); setConnectionState('loading');
    try {
      const { data, meta } = await get(`/api/hoa-don/${encodeURIComponent(code)}`, {}, { signal });
      if (signal.aborted) return;
      document.title = `${data.MaHD} · Hóa đơn · MiniMart`;
      const isOnline = data.NguonDon === 'ONLINE';

      // Promotion Card
      const promotion = data.KhuyenMai;
      const promotionCard = promotion ? section('Khuyến mãi đã lưu trên hóa đơn', [
        row('Mã / tên chương trình', `${promotion.MaKM} · ${promotion.TenKM}`),
        row('Giá trị chương trình', promotion.LoaiKhuyenMai === 'Phần trăm' ? `${number(promotion.GiaTri)}%` : money(promotion.GiaTri)),
        row('Bắt đầu (giờ Việt Nam)', dateTime(promotion.NgayBatDau)), row('Ngày kết thúc (UTC)', promotionEndDate(promotion.NgayKetThuc)),
        row('Trạng thái tính theo hiện tại', badge(promotion.TrangThaiTinhToan)), row('Trạng thái gốc trong DB', badge(promotion.TrangThai)),
        row('Trạng thái tại ngày lập hóa đơn', badge(promotion.TrangThaiTaiNgayLap)), row('Điều kiện', promotionConditions(promotion.DieuKien))
      ]) : section('Khuyến mãi', [row('Thông tin', data.MaKM ? `Không tìm thấy thông tin liên kết cho ${data.MaKM}.` : 'Hóa đơn không sử dụng mã khuyến mãi.')]);

      // Online Fulfillment Card
      let fulfillmentElement = null;
      if (isOnline) {
        const status = data.TrangThaiDon || 'Đã xác nhận';
        let statusBadgeCls = 'badge-status-confirmed';
        if (status === 'Đang giao hàng') statusBadgeCls = 'badge-status-shipping';
        else if (status === 'Hoàn tất') statusBadgeCls = 'badge-status-done';
        else if (status === 'Đã hủy') statusBadgeCls = 'badge-status-cancelled';

        const actionButtons = [];
        if (status === 'Đã xác nhận') {
          actionButtons.push(
            el('button', {
              type: 'button',
              className: 'btn-status btn-status-ship',
              onClick: () => changeStatus('Đang giao hàng')
            }, ['🚀 Bắt đầu giao hàng']),
            el('button', {
              type: 'button',
              className: 'btn-status btn-status-cancel',
              onClick: () => changeStatus('Đã hủy')
            }, ['❌ Hủy đơn'])
          );
        } else if (status === 'Đang giao hàng') {
          actionButtons.push(
            el('button', {
              type: 'button',
              className: 'btn-status btn-status-done',
              onClick: () => changeStatus('Hoàn tất')
            }, ['✅ Giao thành công & Hoàn tất']),
            el('button', {
              type: 'button',
              className: 'btn-status btn-status-cancel',
              onClick: () => changeStatus('Đã hủy')
            }, ['❌ Hủy đơn'])
          );
        }

        const diaChi = data.DiaChiGiao || {};
        fulfillmentElement = el('div', { className: 'order-fulfillment-card' }, [
          el('div', { className: 'fulfillment-header' }, [
            el('div', {}, [
              el('strong', { style: 'font-size:16px;display:block;margin-bottom:4px;', text: 'Tiến độ xử lý đơn hàng Online' }),
              el('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
                el('span', { text: 'Trạng thái hiện tại:' }),
                el('span', { className: `badge ${statusBadgeCls}`, text: status })
              ])
            ]),
            el('div', { className: 'fulfillment-actions' }, actionButtons)
          ]),
          el('div', { className: 'shipping-info-grid' }, [
            el('div', { className: 'shipping-item' }, [
              el('span', { text: 'Người nhận hàng' }),
              el('strong', { text: diaChi.HoTenNguoiNhan || 'Chưa có' })
            ]),
            el('div', { className: 'shipping-item' }, [
              el('span', { text: 'Số điện thoại nhận' }),
              el('strong', { text: diaChi.SDTNguoiNhan || 'Chưa có' })
            ]),
            el('div', { className: 'shipping-item' }, [
              el('span', { text: 'Địa chỉ nhận hàng' }),
              el('strong', { text: diaChi.DiaChi || 'Chưa có' })
            ]),
            el('div', { className: 'shipping-item' }, [
              el('span', { text: 'Trạng thái thanh toán' }),
              el('strong', {
                style: `color:${data.TrangThaiThanhToan?.includes('SePay') || data.TrangThaiThanhToan?.includes('Đã thanh toán') ? '#16a34a' : '#d97706'}`,
                text: data.TrangThaiThanhToan || 'Chưa rõ'
              })
            ]),
            el('div', { className: 'shipping-item' }, [
              el('span', { text: 'Mã GD Ngân hàng / SePay' }),
              el('strong', { text: data.MaGiaoDichNganHang || 'Chưa có (hoặc thanh toán COD)' })
            ]),
            el('div', { className: 'shipping-item' }, [
              el('span', { text: 'Tích lũy điểm thưởng' }),
              el('strong', { text: `+${data.DiemDuocCong || 0} điểm (${data.TrangThaiTichDiem === 'DaCong' ? 'Đã cộng vào tài khoản' : 'Sẽ cộng khi hoàn tất'})` })
            ])
          ])
        ]);
      }

      async function changeStatus(newStatus) {
        if (!confirm(`Xác nhận chuyển trạng thái đơn hàng sang "${newStatus}"?`)) return;
        try {
          await patch(`/api/hoa-don/${encodeURIComponent(code)}/trang-thai`, { trangThai: newStatus });
          load();
        } catch (err) {
          alert('Lỗi cập nhật trạng thái: ' + (err.message || 'Thao tác không thành công'));
        }
      }

      body.replaceChildren(
        el('div', { className: 'page-heading detail-heading' }, [
          el('div', {}, [
            el('span', { className: 'welcome-label', text: isOnline ? 'ĐƠN HÀNG TRỰC TUYẾN' : 'CHI TIẾT HÓA ĐƠN' }),
            el('h1', { text: `Hóa đơn ${data.MaHD}` }),
            el('p', { text: `Lập lúc ${dateTime(data.NgayLap)} · Kênh: ${isOnline ? 'Online Storefront' : 'Bán tại quầy'} · ${data.PhuongThucThanhToan}` })
          ])
        ]),
        ...(fulfillmentElement ? [fulfillmentElement] : []),
        metricCards([
          ['Tiền hàng trước giảm', money(data.TongTien)],
          ['Giảm giá', money(data.GiamGia)],
          ['Thực thu', money(data.ThanhTien)]
        ]),
        el('div', { className: 'detail-grid' }, [
          section('Thông tin giao dịch', [
            row('Khách hàng', el('a', { href: `#/khach-hang/${encodeURIComponent(data.MaKH)}`, text: `${data.MaKH} · ${data.TenKH}` })),
            row('Số điện thoại khách', data.KhachHang?.SDT || data.DiaChiGiao?.SDTNguoiNhan),
            row('Nhân viên lập / phụ trách', `${data.MaNV} · ${data.TenNV}`),
            row('Chức vụ', data.NhanVien?.ChucVu),
            row('Phương thức thanh toán', data.PhuongThucThanhToan),
            row('Kênh bán hàng', isOnline ? 'Đặt hàng trực tuyến (Storefront)' : 'Bán lẻ tại quầy (POS)')
          ]),
          promotionCard
        ]),
        ...(promotion && !['Đang áp dụng', 'Chưa xác định'].includes(promotion.TrangThaiTaiNgayLap) ? [el('p', { className: 'notice missing-reference', role: 'status', text: 'Thời điểm lập hóa đơn nằm ngoài hiệu lực của chương trình khuyến mãi. Dữ liệu được giữ nguyên.' })] : []),
        el('section', { className: 'card transaction-lines' }, [
          el('div', { className: 'list-toolbar' }, [el('h2', { className: 'card-title', text: 'Chi tiết sản phẩm đã mua' })]),
          table([
            {
              label: 'Ảnh',
              render: item => el('img', {
                src: `/images/products/${item.MaSP}.jpg`,
                alt: item.TenSP,
                className: 'admin-product-thumb',
                onError: (e) => { e.target.src = '/images/products/SP001.jpg'; }
              })
            },
            { label: 'Mã SP', render: item => el('a', { href: `#/san-pham/${encodeURIComponent(item.MaSP)}`, className: 'code-link', text: item.MaSP }) },
            { label: 'Tên sản phẩm', key: 'TenSP' },
            { label: 'Số lượng', numeric: true, render: value => number(value.SoLuong) },
            { label: 'Đơn giá đã lưu', numeric: true, render: value => money(value.DonGia) },
            { label: 'Thành tiền dòng', numeric: true, render: value => money(value.ThanhTien) }
          ], data.ChiTiet || [], `Chi tiết hóa đơn ${data.MaHD}`),
          el('p', { className: 'table-note line-note', text: 'Tên và đơn giá lấy từ chi tiết giao dịch đã lưu trong database.' })
        ]),
        ...(data.ThamChieuThieu?.length ? [el('p', { className: 'notice missing-reference', text: `Không tìm thấy thông tin liên kết: ${data.ThamChieuThieu.join(', ')}. Hóa đơn vẫn được hiển thị.` })] : []),
        el('p', { className: 'summary-note', text: `Đọc lúc ${dateTime(meta.updatedAt)}. Toàn bộ dữ liệu được lưu trữ và đồng bộ an toàn.` })
      );
      setConnectionState('connected');
    } catch (error) {
      if (error.name !== 'AbortError' && !signal.aborted) {
        body.replaceChildren(errorBox(error.message, load));
        setConnectionState(error.status === 404 ? 'connected' : 'failed');
      }
    }
  }
  load();
}
