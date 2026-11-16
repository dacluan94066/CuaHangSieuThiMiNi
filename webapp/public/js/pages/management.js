import { el, icon, loading, empty, errorBox, table, badge, pager, setConnectionState } from '../ui.js';
import { money, number, date, dateTime, promotionEndDate } from '../format.js';
import { authState } from '../auth-session.js';
import { get, post, put, del } from '../api.js';

export function renderEmployees(container, { signal }) {
  const isAdmin = authState()?.user?.role === 'Quản trị';
  let activeTab = 'staff'; // 'staff' | 'customers'
  let queryText = '';

  const content = el('div', { className: 'list-content', 'aria-live': 'polite' });
  const updated = el('p', { className: 'summary-note' });

  const tabStaffBtn = el('button', {
    type: 'button',
    className: 'button primary',
    style: 'background: var(--primary); border-color: var(--primary); color: white;',
    onClick: () => switchTab('staff')
  }, ['👥 Tài khoản Nhân sự & Phân quyền']);

  const tabCustomerBtn = el('button', {
    type: 'button',
    className: 'button',
    onClick: () => switchTab('customers')
  }, ['🛒 Tài khoản Khách hàng Online']);

  const tabsWrap = el('div', { style: 'display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;' }, [
    tabStaffBtn,
    tabCustomerBtn
  ]);

  const searchInput = el('input', {
    type: 'search',
    placeholder: 'Tìm theo Mã, Tên đăng nhập, Họ tên, SĐT, Chức vụ...',
    style: 'max-width:400px;flex:1;',
    value: queryText
  });
  searchInput.addEventListener('input', () => {
    queryText = searchInput.value;
    load();
  });

  const searchForm = el('div', { className: 'filters', style: 'margin-bottom:18px;' }, [
    el('div', { className: 'field search-field', style: 'flex:1;' }, [
      el('label', { text: 'Tìm kiếm nhân sự / tài khoản' }),
      searchInput
    ]),
    el('button', {
      type: 'button',
      className: 'button',
      text: 'Đặt lại',
      onClick: () => {
        searchInput.value = queryText = '';
        load();
      }
    })
  ]);

  const addBtn = isAdmin ? el('button', {
    type: 'button',
    className: 'button primary',
    style: 'background: #da3011; border-color: #da3011; color: white;',
    onClick: () => openEmployeeModal(null, load)
  }, ['+ Thêm nhân viên & Cấp tài khoản']) : null;

  const refreshBtn = el('button', {
    type: 'button',
    className: 'button',
    onClick: load
  }, [icon('refresh'), 'Làm mới']);

  const heading = el('div', { className: 'page-heading' }, [
    el('div', {}, [
      el('span', { className: 'welcome-label', text: 'QUẢN TRỊ HỆ THỐNG' }),
      el('h1', { text: 'Nhân sự & Tài khoản' }),
      el('p', { text: 'Quản lý hồ sơ nhân viên, phân quyền vai trò (RBAC) và theo dõi tài khoản khách hàng.' })
    ]),
    el('div', { style: 'display:flex;gap:10px;align-items:center;' }, [
      ...(addBtn ? [addBtn] : []),
      refreshBtn
    ])
  ]);

  container.replaceChildren(
    heading,
    tabsWrap,
    searchForm,
    el('section', { className: 'card list-card' }, [content]),
    updated
  );

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'staff') {
      tabStaffBtn.className = 'button primary';
      tabStaffBtn.style = 'background: var(--primary); border-color: var(--primary); color: white;';
      tabCustomerBtn.className = 'button';
      tabCustomerBtn.style = '';
      if (addBtn) addBtn.style.display = 'inline-flex';
    } else {
      tabCustomerBtn.className = 'button primary';
      tabCustomerBtn.style = 'background: var(--primary); border-color: var(--primary); color: white;';
      tabStaffBtn.className = 'button';
      tabStaffBtn.style = '';
      if (addBtn) addBtn.style.display = 'none';
    }
    load();
  }

  function getRoleBadge(vaiTro) {
    let cls = 'badge-role-banhang';
    if (vaiTro === 'Quản trị') cls = 'badge-role-quantri';
    else if (vaiTro === 'Thu ngân') cls = 'badge-role-thungan';
    else if (vaiTro === 'Kho') cls = 'badge-role-kho';
    return el('span', { className: `badge ${cls}`, text: vaiTro || 'Chưa có' });
  }

  async function load() {
    content.replaceChildren(loading());
    setConnectionState('loading');

    try {
      if (activeTab === 'staff') {
        const res = await get('/api/nhan-vien', { q: queryText }, { signal });
        const items = res.data || [];

        const columns = [
          { label: 'Mã NV', render: row => el('strong', { style: 'color:var(--primary);', text: row.MaNV }) },
          {
            label: 'Tên đăng nhập',
            render: row => el('div', {}, [
              el('strong', { style: 'display:block;font-size:13px;color:#1e293b;', text: row.TenDangNhap }),
              el('small', {
                style: `font-size:10px;color:${row.TrangThaiTaiKhoan === 'Hoạt động' ? '#16a34a' : '#94a3b8'};`,
                text: row.TrangThaiTaiKhoan
              })
            ])
          },
          { label: 'Vai trò (Role)', render: row => getRoleBadge(row.VaiTro) },
          {
            label: 'Họ tên & Chức vụ',
            render: row => el('div', { className: 'table-product' }, [
              el('strong', { text: row.HoTen }),
              el('small', { text: row.ChucVu })
            ])
          },
          {
            label: 'Liên hệ',
            render: row => el('div', {}, [
              el('span', { style: 'display:block;font-size:12px;', text: row.SDT }),
              el('small', { style: 'color:var(--muted);', text: row.Email })
            ])
          },
          { label: 'Lương cơ bản', numeric: true, render: row => money(row.Luong) },
          { label: 'Trạng thái', render: row => badge(row.TrangThai) },
          {
            label: 'Doanh số bán',
            numeric: true,
            render: row => `${number(row.SoHoaDon)} đơn · ${money(row.DoanhThu)}`
          },
          ...(isAdmin ? [{
            label: 'Thao tác',
            render: row => {
              if (row.MaNV === 'NV_ONLINE') return el('span', { style: 'color:var(--muted);font-size:11px;', text: 'Hệ thống' });
              return el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;' }, [
                el('button', {
                  type: 'button',
                  className: 'button',
                  style: 'padding:4px 8px;min-height:30px;font-size:11px;',
                  onClick: () => openEmployeeModal(row, load)
                }, ['Sửa']),
                el('button', {
                  type: 'button',
                  className: 'button',
                  style: 'padding:4px 8px;min-height:30px;font-size:11px;color:#2563eb;',
                  onClick: () => openPasswordResetModal(row, load)
                }, ['Đổi MK']),
                ...(row.MaNV !== 'NV001' ? [
                  el('button', {
                    type: 'button',
                    className: 'button',
                    style: 'padding:4px 8px;min-height:30px;font-size:11px;color:#dc2626;border-color:#fca5a5;',
                    onClick: async () => {
                      if (!confirm(`Bạn có chắc chắn muốn khóa tài khoản / xóa nhân viên [${row.MaNV}] ${row.HoTen}?`)) return;
                      try {
                        const r = await del(`/api/nhan-vien/${encodeURIComponent(row.MaNV)}`);
                        alert(r.message || 'Thao tác thành công!');
                        load();
                      } catch (err) {
                        alert('Lỗi: ' + (err.message || 'Không thể xóa nhân viên.'));
                      }
                    }
                  }, ['Khóa/Xóa'])
                ] : [])
              ]);
            }
          }] : [])
        ];

        content.replaceChildren(
          el('div', { className: 'list-toolbar' }, [
            el('h2', { className: 'card-title', text: 'Danh sách nhân sự & Tài khoản' }),
            el('span', { className: 'muted', text: `${items.length} nhân viên` })
          ]),
          items.length ? table(columns, items, 'Danh sách nhân sự') : empty('Không tìm thấy nhân viên phù hợp.')
        );
        updated.textContent = `Cập nhật lúc ${dateTime(new Date())} · Mã hóa mật khẩu bảo mật scrypt.`;
      } else {
        // Customers Tab
        const res = await get('/api/tai-khoan-khach-hang', {}, { signal });
        const items = res.data || [];

        const customerColumns = [
          { label: 'Mã TKKH', render: row => el('strong', { style: 'color:var(--primary);', text: row.MaTKKH }) },
          { label: 'Mã KH', key: 'MaKH' },
          { label: 'SĐT (Tài khoản)', render: row => el('strong', { text: row.SDT }) },
          { label: 'Họ tên khách hàng', key: 'HoTen' },
          { label: 'Email', key: 'Email' },
          { label: 'Điểm tích lũy', numeric: true, render: row => `${number(row.DiemTichLuy)} điểm` },
          { label: 'Trạng thái', render: row => badge(row.TrangThai) },
          { label: 'Ngày đăng ký', render: row => row.NgayTao ? date(row.NgayTao) : 'Chưa rõ' }
        ];

        content.replaceChildren(
          el('div', { className: 'list-toolbar' }, [
            el('h2', { className: 'card-title', text: 'Tài khoản khách hàng trực tuyến' }),
            el('span', { className: 'muted', text: `${items.length} tài khoản thành viên` })
          ]),
          items.length ? table(customerColumns, items, 'Danh sách tài khoản khách hàng') : empty('Chưa có tài khoản khách hàng nào.')
        );
        updated.textContent = `Cập nhật lúc ${dateTime(new Date())} · Dữ liệu thành viên đăng ký từ web Storefront.`;
      }
      setConnectionState('connected');
    } catch (err) {
      if (err.name !== 'AbortError') {
        content.replaceChildren(errorBox(err.message, load));
        setConnectionState('failed');
      }
    }
  }

  load();
}

/**
 * Modal tạo / chỉnh sửa thông tin nhân viên & tài khoản
 */
export async function openEmployeeModal(emp = null, onSuccess) {
  const isEdit = Boolean(emp);
  const overlay = el('div', { className: 'modal-overlay' });

  const inMaNV = el('input', { type: 'text', value: emp?.MaNV || '', placeholder: 'VD: NV007', disabled: isEdit, required: true });
  const inHoTen = el('input', { type: 'text', value: emp?.HoTen || '', placeholder: 'VD: Nguyễn Văn A', required: true });
  const inSDT = el('input', { type: 'tel', value: emp?.SDT === 'Chưa cập nhật' ? '' : (emp?.SDT || ''), placeholder: 'VD: 0912345678' });
  const inEmail = el('input', { type: 'email', value: emp?.Email === 'Chưa cập nhật' ? '' : (emp?.Email || ''), placeholder: 'VD: an@minimart.vn' });
  
  const inChucVu = el('select', {}, [
    el('option', { value: 'Nhân viên bán hàng', text: 'Nhân viên bán hàng' }),
    el('option', { value: 'Thu ngân', text: 'Thu ngân' }),
    el('option', { value: 'Nhân viên kho', text: 'Nhân viên kho' }),
    el('option', { value: 'Quản lý', text: 'Quản lý' })
  ]);
  if (emp?.ChucVu) inChucVu.value = emp.ChucVu;

  const inLuong = el('input', { type: 'number', min: '0', step: '500000', value: emp?.Luong ?? 8000000, required: true });

  const inTenDangNhap = el('input', { type: 'text', value: emp?.TenDangNhap === 'Chưa cấp' ? '' : (emp?.TenDangNhap || ''), placeholder: 'VD: thungan_an', disabled: isEdit, required: !isEdit });
  const inMatKhau = el('input', { type: 'password', placeholder: isEdit ? 'Để trống nếu không đổi mật khẩu' : 'Mật khẩu ít nhất 6 ký tự', required: !isEdit });

  const inVaiTro = el('select', {}, [
    el('option', { value: 'Bán hàng', text: 'Bán hàng (Xem SP, HĐ, Cảnh báo kho)' }),
    el('option', { value: 'Thu ngân', text: 'Thu ngân (Duyệt đơn Online, Thanh toán)' }),
    el('option', { value: 'Kho', text: 'Kho (Quản lý tồn kho, Phiếu nhập, Giá nhập)' }),
    el('option', { value: 'Quản trị', text: 'Quản trị (Toàn quyền hệ thống & Báo cáo)' })
  ]);
  if (emp?.VaiTro && emp.VaiTro !== 'Chưa phân quyền') inVaiTro.value = emp.VaiTro;

  const inTrangThai = el('select', {}, [
    el('option', { value: 'Đang làm', text: 'Đang làm' }),
    el('option', { value: 'Đã nghỉ', text: 'Đã nghỉ' })
  ]);
  if (emp?.TrangThai) inTrangThai.value = emp.TrangThai;

  const inTrangThaiTK = el('select', {}, [
    el('option', { value: 'Hoạt động', text: 'Hoạt động' }),
    el('option', { value: 'Tạm khóa', text: 'Tạm khóa' })
  ]);
  if (emp?.TrangThaiTaiKhoan) inTrangThaiTK.value = emp.TrangThaiTaiKhoan;

  const formErr = el('div', { className: 'inline-error', style: 'margin-bottom:14px;padding:8px 12px;', hidden: true });

  const closeBtn = el('button', { type: 'button', className: 'modal-close', onClick: () => overlay.remove() }, ['✕']);
  const cancelBtn = el('button', { type: 'button', className: 'button', onClick: () => overlay.remove() }, ['Hủy bỏ']);
  const submitBtn = el('button', { type: 'submit', className: 'button primary', style: 'background:#da3011;border-color:#da3011;color:white;' }, [
    isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên & Cấp tài khoản'
  ]);

  const modalForm = el('form', { className: 'modal-body' }, [
    formErr,
    el('div', { style: 'font-weight:700;font-size:14px;color:var(--primary);margin-bottom:10px;', text: '1. HỒ SƠ NHÂN SỰ' }),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Mã nhân viên *' }), inMaNV]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Họ và tên *' }), inHoTen])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Số điện thoại' }), inSDT]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Email' }), inEmail])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Chức danh công việc *' }), inChucVu]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Lương cơ bản (VNĐ) *' }), inLuong])
    ]),
    el('div', { style: 'font-weight:700;font-size:14px;color:var(--primary);margin:16px 0 10px;', text: '2. TÀI KHOẢN & PHÂN QUYỀN HỆ THỐNG' }),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Tên đăng nhập *' }), inTenDangNhap]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Vai trò (Role) *' }), inVaiTro])
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { text: isEdit ? 'Đặt lại mật khẩu mới (Bỏ trống nếu giữ nguyên)' : 'Mật khẩu đăng nhập ban đầu *' }),
      inMatKhau
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [el('label', { text: 'Trạng thái nhân sự' }), inTrangThai]),
      el('div', { className: 'form-group' }, [el('label', { text: 'Trạng thái tài khoản' }), inTrangThaiTK])
    ])
  ]);

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formErr.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu...';

    const payload = {
      HoTen: inHoTen.value.trim(),
      SDT: inSDT.value.trim(),
      Email: inEmail.value.trim(),
      ChucVu: inChucVu.value,
      Luong: Number(inLuong.value),
      VaiTro: inVaiTro.value,
      TrangThai: inTrangThai.value,
      TrangThaiTaiKhoan: inTrangThaiTK.value
    };

    if (inMatKhau.value.trim()) {
      payload.MatKhau = inMatKhau.value.trim();
    }

    if (!isEdit) {
      payload.MaNV = inMaNV.value.trim().toUpperCase();
      payload.TenDangNhap = inTenDangNhap.value.trim().toLowerCase();
    }

    try {
      if (isEdit) {
        await put(`/api/nhan-vien/${encodeURIComponent(emp.MaNV)}`, payload);
      } else {
        await post('/api/nhan-vien', payload);
      }
      overlay.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      formErr.textContent = err.message || 'Lỗi khi lưu nhân viên.';
      formErr.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên & Cấp tài khoản';
    }
  });

  const modal = el('div', { className: 'modal-card' }, [
    el('div', { className: 'modal-header' }, [
      el('h2', { text: isEdit ? `Chỉnh sửa nhân sự: [${emp.MaNV}] ${emp.HoTen}` : 'Thêm nhân viên mới & Cấp tài khoản' }),
      closeBtn
    ]),
    modalForm,
    el('div', { className: 'modal-footer' }, [cancelBtn, submitBtn])
  ]);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/**
 * Modal đặt lại mật khẩu nhanh cho nhân viên
 */
export async function openPasswordResetModal(emp, onSuccess) {
  const overlay = el('div', { className: 'modal-overlay' });
  const inPassword = el('input', { type: 'password', placeholder: 'Nhập mật khẩu mới (ít nhất 6 ký tự)', required: true });
  const formErr = el('div', { className: 'inline-error', style: 'margin-bottom:14px;padding:8px 12px;', hidden: true });

  const closeBtn = el('button', { type: 'button', className: 'modal-close', onClick: () => overlay.remove() }, ['✕']);
  const cancelBtn = el('button', { type: 'button', className: 'button', onClick: () => overlay.remove() }, ['Hủy']);
  const submitBtn = el('button', { type: 'submit', className: 'button primary', style: 'background:#da3011;border-color:#da3011;color:white;' }, ['Xác nhận đổi MK']);

  const modalForm = el('form', { className: 'modal-body' }, [
    formErr,
    el('p', { style: 'font-size:13px;color:#334155;margin:0 0 14px;', text: `Đặt lại mật khẩu cho tài khoản "${emp.TenDangNhap}" (Nhân viên: ${emp.HoTen}).` }),
    el('div', { className: 'form-group' }, [
      el('label', { text: 'Mật khẩu mới *' }),
      inPassword
    ])
  ]);

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mk = inPassword.value.trim();
    if (mk.length < 6) {
      formErr.textContent = 'Mật khẩu phải từ 6 ký tự trở lên.';
      formErr.hidden = false;
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu...';
    try {
      await put(`/api/nhan-vien/${encodeURIComponent(emp.MaNV)}`, { MatKhau: mk });
      alert(`Đã đặt lại mật khẩu cho tài khoản ${emp.TenDangNhap} thành công!`);
      overlay.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      formErr.textContent = err.message || 'Lỗi khi đặt lại mật khẩu.';
      formErr.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đổi MK';
    }
  });

  const modal = el('div', { className: 'modal-card', style: 'max-width:440px;' }, [
    el('div', { className: 'modal-header' }, [
      el('h2', { text: `Đổi mật khẩu: ${emp.TenDangNhap}` }),
      closeBtn
    ]),
    modalForm,
    el('div', { className: 'modal-footer' }, [cancelBtn, submitBtn])
  ]);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
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
