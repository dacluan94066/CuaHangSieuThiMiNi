import { el, badge, renderReadList } from '../ui.js';
import { money, number, date, promotionEndDate } from '../format.js';
import { authState } from '../auth-session.js';
import { post, put, del } from '../api.js';

export function renderEmployees(container, context) {
  return renderReadList(container, context, {
    kind: 'employees', path: '/nhan-vien', api: '/api/nhan-vien', title: 'Nhân viên', eyebrow: 'ĐỘI NGŨ SIÊU THỊ', description: 'Số hóa đơn và thực thu theo nhân viên trong khoảng ngày đã chọn.',
    placeholder: 'Ví dụ: NV002, Mai hoặc NV_ONLINE', tableTitle: 'Danh sách nhân viên', emptyText: 'Không có nhân viên phù hợp.', note: 'Doanh thu cộng ThanhTien sau giảm giá. Nhân viên chưa có hóa đơn vẫn hiển thị bằng 0.',
    filters: [{ key: 'from', label: 'Từ ngày', type: 'date' }, { key: 'to', label: 'Đến hết ngày', type: 'date' }],
    columns: [
      { label: 'Mã', key: 'MaNV' }, { label: 'Họ tên', key: 'HoTen' },
      { label: 'Chức vụ', render: row => row.LaNhanVienHeThong ? badge('Nhân viên hệ thống') : row.ChucVu },
      { label: 'Trạng thái', key: 'TrangThai' }, { label: 'Số hóa đơn', numeric: true, render: row => number(row.SoHoaDon) }, { label: 'Thực thu', numeric: true, render: row => money(row.DoanhThu) }
    ]
  });
}

export function promotionConditions(value = {}, hasUnknown = false) {
  const conditions = [
    ['DonHangToiThieu', 'Đơn tối thiểu', money], ['DiemToiThieu', 'Điểm tối thiểu', number], ['GiamToiDa', 'Giảm tối đa', money],
    ['MaDM', 'Mã danh mục', String], ['SoLuongToiThieu', 'Số lượng tối thiểu', number]
  ].filter(([key]) => value[key] !== undefined);
  const lines = conditions.map(([key, label, format]) => el('li', { text: `${label}: ${format(value[key])}` }));
  if (hasUnknown) lines.push(el('li', { text: 'Có điều kiện ngoài danh sách hỗ trợ, chưa diễn giải đầy đủ.' }));
  return lines.length ? el('ul', { className: 'condition-list' }, lines) : 'Không có điều kiện bổ sung';
}

export function renderPromotions(container, context) {
  const isAdmin = authState()?.user?.role === 'Quản trị';

  const baseColumns = [
    { label: 'Mã', render: row => el('strong', { style: 'color:var(--primary);', text: row.MaKM }) },
    { label: 'Chương trình', key: 'TenKM' },
    { label: 'Loại', key: 'LoaiKhuyenMai' },
    { label: 'Giá trị', render: row => row.LoaiKhuyenMai === 'Phần trăm' ? `${number(row.GiaTri)}%` : money(row.GiaTri) },
    { label: 'Bắt đầu (VN)', render: row => date(row.NgayBatDau) },
    { label: 'Kết thúc (UTC)', render: row => promotionEndDate(row.NgayKetThuc) },
    { label: 'Điều kiện', render: row => promotionConditions(row.DieuKien, row.CoDieuKienChuaHoTro) },
    { label: 'Hiện tại', render: row => badge(row.TrangThaiTinhToan) },
    { label: 'Trạng thái gốc', key: 'TrangThai' }
  ];

  return renderReadList(container, context, {
    kind: 'promotions',
    path: '/khuyen-mai',
    api: '/api/khuyen-mai',
    title: 'Khuyến mãi & Mã giảm giá',
    eyebrow: 'CHƯƠNG TRÌNH ƯU ĐÃI',
    description: 'Quản lý các chương trình khuyến mãi và mã coupon giảm giá trên toàn hệ thống và cửa hàng online.',
    placeholder: 'Ví dụ: KM003 hoặc CHAOBANMOI',
    tableTitle: 'Danh sách khuyến mãi',
    emptyText: 'Không có chương trình khuyến mãi nào phù hợp.',
    note: 'So sánh trực tiếp NgayBatDau ≤ hiện tại ≤ NgayKetThuc. Mã đang áp dụng sẽ tự động kích hoạt trên web Shop.',
    headerActions: isAdmin ? (load) => [
      el('button', {
        type: 'button',
        className: 'button primary',
        style: 'background: #da3011; border-color: #da3011; color: white;',
        onClick: () => openPromotionModal(null, load)
      }, ['+ Tạo mã khuyến mãi'])
    ] : null,
    filters: [
      {
        key: 'trangThai',
        label: 'Trạng thái tính toán',
        options: [
          ['', 'Tất cả'],
          ['sap-dien-ra', 'Sắp diễn ra'],
          ['dang-ap-dung', 'Đang áp dụng'],
          ['da-ket-thuc', 'Đã kết thúc']
        ]
      }
    ],
    columns: isAdmin ? [
      ...baseColumns,
      {
        label: 'Thao tác',
        render: row => el('div', { style: 'display:flex;gap:6px;' }, [
          el('button', {
            type: 'button',
            className: 'button',
            style: 'padding:4px 8px;min-height:30px;font-size:11px;',
            onClick: () => openPromotionModal(row, () => window.dispatchEvent(new HashChangeEvent('hashchange')))
          }, ['Sửa']),
          el('button', {
            type: 'button',
            className: 'button',
            style: 'padding:4px 8px;min-height:30px;font-size:11px;color:#dc2626;border-color:#fca5a5;',
            onClick: async () => {
              if (!confirm(`Bạn có chắc chắn muốn xóa hoặc dừng mã ưu đãi ${row.MaKM}?`)) return;
              try {
                const res = await del(`/api/khuyen-mai/${encodeURIComponent(row.MaKM)}`);
                alert(res.message || 'Thao tác thành công!');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              } catch (err) {
                alert('Lỗi: ' + (err.message || 'Không thể xóa mã.'));
              }
            }
          }, ['Xóa'])
        ])
      }
    ] : baseColumns
  });
}

/**
 * Modal tạo / chỉnh sửa mã khuyến mãi
 */
export async function openPromotionModal(promotion = null, onSuccess) {
  const isEdit = Boolean(promotion);
  const overlay = el('div', { className: 'modal-overlay' });

  // Inputs
  const inMaKM = el('input', { type: 'text', value: promotion?.MaKM || '', placeholder: 'VD: GIAM20K, CHAOBANMOI...', disabled: isEdit, required: true });
  const inTenKM = el('input', { type: 'text', value: promotion?.TenKM || '', placeholder: 'VD: Giảm 20.000đ cho đơn hàng từ 100.000đ', required: true });
  
  const inLoai = el('select', {}, [
    el('option', { value: 'Phần trăm', text: 'Giảm theo Phần trăm (%)' }),
    el('option', { value: 'Số tiền', text: 'Giảm theo Số tiền cố định (VNĐ)' })
  ]);
  if (promotion?.LoaiKhuyenMai) inLoai.value = promotion.LoaiKhuyenMai;

  const inGiaTri = el('input', { type: 'number', min: '1', step: 'any', value: promotion?.GiaTri ?? 10, required: true });
  const giaTriHelp = el('small', { style: 'color:var(--muted);font-size:11px;', text: inLoai.value === 'Phần trăm' ? 'Nhập số % giảm (từ 1 đến 100)' : 'Nhập số tiền giảm (VNĐ)' });

  inLoai.addEventListener('change', () => {
    giaTriHelp.textContent = inLoai.value === 'Phần trăm' ? 'Nhập số % giảm (từ 1 đến 100)' : 'Nhập số tiền giảm (VNĐ)';
    giamToiDaGroup.style.display = inLoai.value === 'Phần trăm' ? 'flex' : 'none';
  });

  const inDonHangToiThieu = el('input', { type: 'number', min: '0', step: '10000', value: promotion?.DieuKien?.DonHangToiThieu ?? 0, placeholder: '0 = Không giới hạn' });
  const inGiamToiDa = el('input', { type: 'number', min: '0', step: '5000', value: promotion?.DieuKien?.GiamToiDa ?? 50000, placeholder: 'Mức giảm tối đa (VNĐ)' });
  const giamToiDaGroup = el('div', { className: 'form-group', style: inLoai.value === 'Phần trăm' ? 'display:flex;' : 'display:none;' }, [
    el('label', { text: 'Mức giảm tối đa (VNĐ)' }),
    inGiamToiDa
  ]);

  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const inNgayBatDau = el('input', { type: 'date', value: promotion?.NgayBatDau ? new Date(promotion.NgayBatDau).toISOString().split('T')[0] : today, required: true });
  const inNgayKetThuc = el('input', { type: 'date', value: promotion?.NgayKetThuc ? new Date(promotion.NgayKetThuc).toISOString().split('T')[0] : nextMonth, required: true });

  const inTrangThai = el('select', {}, [
    el('option', { value: 'Đang áp dụng', text: 'Đang áp dụng' }),
    el('option', { value: 'Sắp diễn ra', text: 'Sắp diễn ra' }),
    el('option', { value: 'Đã kết thúc', text: 'Đã kết thúc' })
  ]);
  if (promotion?.TrangThai) inTrangThai.value = promotion.TrangThai;

  const formErr = el('div', { className: 'inline-error', style: 'margin-bottom:14px;padding:8px 12px;', hidden: true });

  const closeBtn = el('button', { type: 'button', className: 'modal-close', onClick: () => overlay.remove() }, ['✕']);
  const cancelBtn = el('button', { type: 'button', className: 'button', onClick: () => overlay.remove() }, ['Hủy bỏ']);
  const submitBtn = el('button', { type: 'submit', className: 'button primary', style: 'background:#da3011;border-color:#da3011;color:white;' }, [
    isEdit ? 'Lưu thay đổi' : 'Tạo mã khuyến mãi'
  ]);

  const modalForm = el('form', { className: 'modal-body' }, [
    formErr,
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Mã ưu đãi (Coupon Code) *' }), inMaKM]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Hình thức giảm giá *' }), inLoai])
    ]),
    el('div', { className: 'form-group' }, [el('label', { text: 'Tên chương trình ưu đãi *' }), inTenKM]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Giá trị ưu đãi *' }), inGiaTri, giaTriHelp]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Đơn hàng tối thiểu (VNĐ)' }), inDonHangToiThieu])
    ]),
    giamToiDaGroup,
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Ngày bắt đầu *' }), inNgayBatDau]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Ngày kết thúc *' }), inNgayKetThuc])
    ]),
    el('div', { className: 'form-group' }, [el('label', { text: 'Trạng thái hoạt động' }), inTrangThai])
  ]);

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formErr.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu...';

    const payload = {
      TenKM: inTenKM.value.trim(),
      LoaiKhuyenMai: inLoai.value,
      GiaTri: Number(inGiaTri.value),
      NgayBatDau: inNgayBatDau.value,
      NgayKetThuc: inNgayKetThuc.value,
      DonHangToiThieu: Number(inDonHangToiThieu.value) || 0,
      TrangThai: inTrangThai.value
    };

    if (inLoai.value === 'Phần trăm' && inGiamToiDa.value) {
      payload.GiamToiDa = Number(inGiamToiDa.value);
    }

    if (!isEdit) {
      payload.MaKM = inMaKM.value.trim().toUpperCase();
    }

    try {
      if (isEdit) {
        await put(`/api/khuyen-mai/${encodeURIComponent(promotion.MaKM)}`, payload);
      } else {
        await post('/api/khuyen-mai', payload);
      }
      overlay.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      formErr.textContent = err.message || 'Lỗi khi lưu mã khuyến mãi.';
      formErr.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Lưu thay đổi' : 'Tạo mã khuyến mãi';
    }
  });

  const modal = el('div', { className: 'modal-card' }, [
    el('div', { className: 'modal-header' }, [
      el('h2', { text: isEdit ? `Chỉnh sửa mã khuyến mãi: ${promotion.MaKM}` : 'Tạo mã khuyến mãi mới' }),
      closeBtn
    ]),
    modalForm,
    el('div', { className: 'modal-footer' }, [cancelBtn, submitBtn])
  ]);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
