import { get, post, put, del } from '../api.js';
import { el, loading, empty, errorBox, table, pager, updateQueryHash, detailRow as row, detailSection as section, metricCards, renderReadList, setConnectionState } from '../ui.js';
import { money, number, date, dateTime } from '../format.js';
import { authState } from '../auth-session.js';
import { invoiceColumns } from './invoices.js';

export function renderCustomers(container, context) {
  const role = authState()?.user?.role;
  const canManage = ['Quản trị', 'Thu ngân', 'Bán hàng'].includes(role);
  const isAdmin = role === 'Quản trị';

  const baseColumns = [
    { label: 'Mã khách', render: value => el('a', { href: `#/khach-hang/${encodeURIComponent(value.MaKH)}`, className: 'code-link', text: value.MaKH }) },
    { label: 'Họ tên', render: value => el('a', { href: `#/khach-hang/${encodeURIComponent(value.MaKH)}`, className: 'product-name', text: value.HoTen }) },
    { label: 'Số điện thoại', render: value => el('strong', { text: value.SDT }) },
    { label: 'Email', render: value => value.Email || el('span', { className: 'muted', text: '—' }) },
    { label: 'Địa chỉ', render: value => value.DiaChi || el('span', { className: 'muted', text: '—' }) },
    { label: 'Điểm tích lũy', numeric: true, render: value => `${number(value.DiemTichLuy)} điểm` },
    { label: 'Ngày đăng ký', render: value => date(value.NgayDangKy) }
  ];

  const columns = canManage ? [
    ...baseColumns,
    {
      label: 'Thao tác',
      render: row => el('div', { style: 'display:flex;gap:6px;' }, [
        el('button', {
          type: 'button',
          className: 'button',
          style: 'padding:4px 8px;min-height:30px;font-size:11px;',
          onClick: () => openCustomerModal(row, () => window.dispatchEvent(new HashChangeEvent('hashchange')))
        }, ['Sửa']),
        ...(isAdmin ? [
          el('button', {
            type: 'button',
            className: 'button',
            style: 'padding:4px 8px;min-height:30px;font-size:11px;color:#dc2626;border-color:#fca5a5;',
            onClick: async () => {
              if (!confirm(`Bạn có chắc chắn muốn xóa khách hàng [${row.MaKH}] ${row.HoTen}?`)) return;
              try {
                const res = await del(`/api/khach-hang/${encodeURIComponent(row.MaKH)}`);
                alert(res.message || 'Xóa thành công!');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              } catch (err) {
                alert('Lỗi: ' + (err.message || 'Không thể xóa khách hàng.'));
              }
            }
          }, ['Xóa'])
        ] : [])
      ])
    }
  ] : baseColumns;

  return renderReadList(container, context, {
    kind: 'customers',
    path: '/khach-hang',
    api: '/api/khach-hang',
    title: 'Khách hàng',
    eyebrow: 'THÀNH VIÊN SIÊU THỊ',
    description: 'Quản lý thông tin hồ sơ thành viên, điểm thưởng tích lũy và tra cứu lịch sử mua hàng.',
    placeholder: 'Ví dụ: KH001, Minh Anh hoặc 0901000001',
    tableTitle: 'Danh sách khách hàng',
    emptyText: 'Không có khách hàng phù hợp từ khóa.',
    note: 'Điểm tích lũy thành viên được dùng để áp dụng ưu đãi giảm giá khi thanh toán.',
    headerActions: canManage ? (load) => [
      el('button', {
        type: 'button',
        className: 'button primary',
        style: 'background: #da3011; border-color: #da3011; color: white;',
        onClick: () => openCustomerModal(null, load)
      }, ['+ Thêm khách hàng'])
    ] : null,
    columns
  });
}

export function renderCustomerDetail(container, { signal, code, params }) {
  const role = authState()?.user?.role;
  const canManage = ['Quản trị', 'Thu ngân', 'Bán hàng'].includes(role);
  const isAdmin = role === 'Quản trị';

  const body = el('div', {}, [loading()]);
  let historyController, historyRequest = 0;
  let historyQuery = { page: params.get('page') || 1, limit: params.get('limit') || 10 };
  container.replaceChildren(el('a', { className: 'back-link', href: '#/khach-hang', text: '← Danh sách khách hàng' }), body);

  async function load() {
    body.replaceChildren(loading());
    setConnectionState('loading');
    try {
      const { data, meta } = await get(`/api/khach-hang/${encodeURIComponent(code)}`, {}, { signal });
      if (signal.aborted) return;
      document.title = `${data.MaKH} · Khách hàng · MiniMart`;
      const history = el('div', { className: 'list-content', 'aria-live': 'polite' });

      const editBtn = canManage ? el('button', {
        type: 'button',
        className: 'button',
        style: 'padding:6px 12px;font-size:13px;',
        onClick: () => openCustomerModal(data, load)
      }, ['✏️ Sửa thông tin']) : null;

      const deleteBtn = isAdmin ? el('button', {
        type: 'button',
        className: 'button',
        style: 'padding:6px 12px;font-size:13px;color:#dc2626;border-color:#fca5a5;',
        onClick: async () => {
          if (!confirm(`Bạn có chắc muốn xóa khách hàng [${data.MaKH}] ${data.HoTen}?`)) return;
          try {
            const res = await del(`/api/khach-hang/${encodeURIComponent(data.MaKH)}`);
            alert(res.message || 'Đã xóa khách hàng thành công!');
            window.location.hash = '#/khach-hang';
          } catch (err) {
            alert('Lỗi: ' + (err.message || 'Không thể xóa khách hàng.'));
          }
        }
      }, ['🗑️ Xóa khách hàng']) : null;

      const actionsRow = (editBtn || deleteBtn) ? el('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:10px;' }, [
        ...(editBtn ? [editBtn] : []),
        ...(deleteBtn ? [deleteBtn] : [])
      ]) : null;

      body.replaceChildren(
        el('div', { className: 'page-heading detail-heading' }, [
          el('div', {}, [
            el('span', { className: 'welcome-label', text: data.MaKH }),
            el('h1', { text: data.HoTen }),
            el('p', { text: 'Hồ sơ và thống kê toàn bộ lịch sử mua hàng.' })
          ]),
          ...(actionsRow ? [actionsRow] : [])
        ]),
        metricCards([
          ['Tổng chi tiêu thực thu', money(data.ThongKe.TongChiTieu)],
          ['Số lần mua', number(data.ThongKe.SoLanMua)],
          ['Điểm tích lũy đã lưu', `${number(data.DiemTichLuy)} điểm`]
        ]),
        section('Thông tin thành viên', [
          row('Mã khách hàng', data.MaKH),
          row('Họ tên', data.HoTen),
          row('Số điện thoại', data.SDT),
          row('Email', data.Email || 'Chưa cập nhật'),
          row('Địa chỉ', data.DiaChi || 'Chưa cập nhật'),
          row('Ngày đăng ký', date(data.NgayDangKy))
        ]),
        el('section', { className: 'card list-card transaction-lines', 'aria-label': 'Lịch sử mua hàng' }, [history]),
        el('p', { className: 'summary-note', text: `Đọc lúc ${dateTime(meta.updatedAt)}. Tổng chi tiêu cộng ThanhTien sau giảm giá; điểm tích lũy hiển thị từ hồ sơ khách hàng.` })
      );
      setConnectionState('connected');

      async function loadHistory() {
        historyController?.abort();
        historyController = new AbortController();
        const id = ++historyRequest;
        history.replaceChildren(loading());
        try {
          const response = await get('/api/hoa-don', { ...historyQuery, maKH: data.MaKH }, { signal: historyController.signal });
          if (signal.aborted || id !== historyRequest) return;
          history.replaceChildren(
            el('div', { className: 'list-toolbar' }, [
              el('h2', { className: 'card-title', text: 'Lịch sử mua hàng' }),
              el('span', { className: 'muted', text: `${response.pagination.total} hóa đơn` })
            ]),
            response.data.length
              ? table(invoiceColumns.filter(column => column.label !== 'Khách hàng'), response.data, `Lịch sử mua của ${data.MaKH}`)
              : empty('Khách hàng chưa có hóa đơn trên trang này.'),
            pager(response.pagination, patch => {
              historyQuery = { ...historyQuery, ...patch };
              updateQueryHash(`/khach-hang/${encodeURIComponent(data.MaKH)}`, historyQuery);
              loadHistory();
            })
          );
        } catch (error) {
          if (error.name !== 'AbortError' && !signal.aborted && id === historyRequest) {
            history.replaceChildren(errorBox(error.message, loadHistory));
          }
        }
      }
      loadHistory();
    } catch (error) {
      if (error.name !== 'AbortError' && !signal.aborted) {
        body.replaceChildren(errorBox(error.message, load));
        setConnectionState(error.status === 404 ? 'connected' : 'failed');
      }
    }
  }

  signal.addEventListener('abort', () => historyController?.abort(), { once: true });
  load();
  return () => historyController?.abort();
}

/**
 * Modal thêm mới / chỉnh sửa hồ sơ khách hàng
 */
export async function openCustomerModal(cust = null, onSuccess) {
  const isEdit = Boolean(cust);
  const role = authState()?.user?.role;
  const isAdmin = role === 'Quản trị';

  const overlay = el('div', { className: 'modal-overlay' });

  const inMaKH = el('input', {
    type: 'text',
    value: cust?.MaKH || '',
    placeholder: 'Để trống để tự động sinh mã (VD: KH012)',
    disabled: isEdit
  });

  const inHoTen = el('input', {
    type: 'text',
    value: cust?.HoTen || '',
    placeholder: 'VD: Nguyễn Văn Nam',
    required: true
  });

  const inSDT = el('input', {
    type: 'tel',
    value: cust?.SDT || '',
    placeholder: 'VD: 0901234567 (10 số)',
    required: true
  });

  const inEmail = el('input', {
    type: 'email',
    value: cust?.Email || '',
    placeholder: 'VD: nam@gmail.com'
  });

  const inDiaChi = el('input', {
    type: 'text',
    value: cust?.DiaChi || '',
    placeholder: 'VD: Ninh Kiều, Cần Thơ'
  });

  const inDiem = el('input', {
    type: 'number',
    min: '0',
    step: '1',
    value: cust?.DiemTichLuy ?? 0,
    disabled: !isAdmin
  });

  const formErr = el('div', { className: 'inline-error', style: 'margin-bottom:14px;padding:8px 12px;', hidden: true });

  const closeBtn = el('button', { type: 'button', className: 'modal-close', onClick: () => overlay.remove() }, ['✕']);
  const cancelBtn = el('button', { type: 'button', className: 'button', onClick: () => overlay.remove() }, ['Hủy bỏ']);
  const submitBtn = el('button', {
    type: 'submit',
    className: 'button primary',
    style: 'background:#da3011;border-color:#da3011;color:white;'
  }, [isEdit ? 'Lưu thay đổi' : 'Thêm khách hàng']);

  const modalForm = el('form', { className: 'modal-body' }, [
    formErr,
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [
        el('label', { text: 'Mã khách hàng' }),
        inMaKH,
        el('small', { style: 'color:var(--muted);font-size:11px;', text: isEdit ? 'Mã khách cố định không thể sửa' : 'Hệ thống tự động sinh KHxxx nếu để trống' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { text: 'Họ và tên *' }),
        inHoTen
      ])
    ]),
    el('div', { className: 'form-grid-2' }, [
      el('div', { className: 'form-group' }, [
        el('label', { text: 'Số điện thoại *' }),
        inSDT,
        el('small', { style: 'color:var(--muted);font-size:11px;', text: '10 chữ số bắt đầu bằng 0 (dùng tra cứu khi mua)' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { text: 'Email' }),
        inEmail
      ])
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { text: 'Địa chỉ' }),
      inDiaChi
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { text: 'Điểm tích lũy' }),
      inDiem,
      el('small', { style: 'color:var(--muted);font-size:11px;', text: isAdmin ? 'Quản trị viên có thể điều chỉnh điểm cộng/trừ' : 'Chỉ Quản trị viên mới được sửa điểm thủ công' })
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
      DiaChi: inDiaChi.value.trim()
    };

    if (isAdmin) {
      payload.DiemTichLuy = parseInt(inDiem.value, 10) || 0;
    }

    try {
      if (isEdit) {
        await put(`/api/khach-hang/${encodeURIComponent(cust.MaKH)}`, payload);
      } else {
        if (inMaKH.value.trim()) payload.MaKH = inMaKH.value.trim().toUpperCase();
        await post('/api/khach-hang', payload);
      }
      overlay.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      formErr.textContent = err.message || 'Lỗi khi lưu thông tin khách hàng.';
      formErr.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Lưu thay đổi' : 'Thêm khách hàng';
    }
  });

  const modal = el('div', { className: 'modal-card', style: 'max-width:540px;' }, [
    el('div', { className: 'modal-header' }, [
      el('h2', { text: isEdit ? `Chỉnh sửa khách hàng: ${cust.MaKH}` : 'Thêm khách hàng thành viên mới' }),
      closeBtn
    ]),
    modalForm,
    el('div', { className: 'modal-footer' }, [cancelBtn, submitBtn])
  ]);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  inHoTen.focus();
}
