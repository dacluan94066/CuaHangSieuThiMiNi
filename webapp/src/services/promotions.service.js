export async function createPromotion(db, body) {
  const kmColl = await db.collection('KhuyenMai');
  const maKM = (body.MaKM || '').trim().toUpperCase();
  if (!maKM || !/^[A-Za-z0-9_-]{2,50}$/.test(maKM)) {
    throw new Error('Mã khuyến mãi phải từ 2-50 ký tự chữ, số hoặc gạch nối (ví dụ: CHAOBANMOI, KM005).');
  }

  const existing = await kmColl.findOne({ MaKM: maKM });
  if (existing) {
    throw new Error(`Mã khuyến mãi ${maKM} đã tồn tại trong hệ thống.`);
  }

  const tenKM = (body.TenKM || '').trim();
  if (!tenKM) throw new Error('Tên chương trình khuyến mãi không được để trống.');

  const loai = body.LoaiKhuyenMai === 'Số tiền' ? 'Số tiền' : 'Phần trăm';
  let giaTri = Number(body.GiaTri);
  if (isNaN(giaTri) || giaTri <= 0) {
    throw new Error('Giá trị khuyến mãi phải là số dương lớn hơn 0.');
  }
  if (loai === 'Phần trăm' && (giaTri < 1 || giaTri > 100)) {
    throw new Error('Khuyến mãi theo phần trăm phải từ 1% đến 100%.');
  }

  if (!body.NgayBatDau || !body.NgayKetThuc) {
    throw new Error('Vui lòng chọn ngày bắt đầu và ngày kết thúc ưu đãi.');
  }

  const ngayBatDau = new Date(`${body.NgayBatDau}T00:00:00.000Z`);
  const ngayKetThuc = new Date(`${body.NgayKetThuc}T23:59:59.999Z`);
  if (isNaN(ngayBatDau.getTime()) || isNaN(ngayKetThuc.getTime())) {
    throw new Error('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ.');
  }
  if (ngayBatDau > ngayKetThuc) {
    throw new Error('Ngày bắt đầu phải trước ngày kết thúc.');
  }

  const dieuKien = {};
  if (body.DonHangToiThieu !== undefined && Number(body.DonHangToiThieu) > 0) {
    dieuKien.DonHangToiThieu = Number(body.DonHangToiThieu);
  }
  if (loai === 'Phần trăm' && body.GiamToiDa !== undefined && Number(body.GiamToiDa) > 0) {
    dieuKien.GiamToiDa = Number(body.GiamToiDa);
  }
  if (body.DiemToiThieu !== undefined && Number(body.DiemToiThieu) > 0) {
    dieuKien.DiemToiThieu = Number(body.DiemToiThieu);
  }
  if (body.MaDM) {
    dieuKien.MaDM = body.MaDM.trim();
  }

  const doc = {
    MaKM: maKM,
    TenKM: tenKM,
    LoaiKhuyenMai: loai,
    GiaTri: giaTri,
    NgayBatDau: ngayBatDau,
    NgayKetThuc: ngayKetThuc,
    DieuKien: dieuKien,
    TrangThai: body.TrangThai || 'Đang áp dụng'
  };

  await kmColl.insertOne(doc);
  return doc;
}

export async function updatePromotion(db, maKM, body) {
  const kmColl = await db.collection('KhuyenMai');
  const existing = await kmColl.findOne({ MaKM: maKM });
  if (!existing) throw new Error(`Không tìm thấy mã khuyến mãi ${maKM}.`);

  const update = {};
  if (body.TenKM !== undefined) {
    const t = (body.TenKM || '').trim();
    if (!t) throw new Error('Tên chương trình không được để trống.');
    update.TenKM = t;
  }
  if (body.LoaiKhuyenMai !== undefined) {
    update.LoaiKhuyenMai = body.LoaiKhuyenMai === 'Số tiền' ? 'Số tiền' : 'Phần trăm';
  }
  if (body.GiaTri !== undefined) {
    const v = Number(body.GiaTri);
    if (isNaN(v) || v <= 0) throw new Error('Giá trị khuyến mãi phải là số dương.');
    update.GiaTri = v;
  }
  if (body.NgayBatDau) {
    const d = new Date(`${body.NgayBatDau}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) update.NgayBatDau = d;
  }
  if (body.NgayKetThuc) {
    const d = new Date(`${body.NgayKetThuc}T23:59:59.999Z`);
    if (!isNaN(d.getTime())) update.NgayKetThuc = d;
  }
  if (body.TrangThai !== undefined) {
    update.TrangThai = body.TrangThai;
  }

  if (body.DonHangToiThieu !== undefined || body.GiamToiDa !== undefined) {
    const dieuKien = { ...(existing.DieuKien || {}) };
    if (body.DonHangToiThieu !== undefined) dieuKien.DonHangToiThieu = Number(body.DonHangToiThieu);
    if (body.GiamToiDa !== undefined) dieuKien.GiamToiDa = Number(body.GiamToiDa);
    update.DieuKien = dieuKien;
  }

  await kmColl.updateOne({ MaKM: maKM }, { $set: update });
  return kmColl.findOne({ MaKM: maKM });
}

export async function deletePromotion(db, maKM) {
  const kmColl = await db.collection('KhuyenMai');
  const existing = await kmColl.findOne({ MaKM: maKM });
  if (!existing) throw new Error(`Không tìm thấy mã khuyến mãi ${maKM}.`);

  const hoadonColl = await db.collection('HoaDon');
  const inOrders = await hoadonColl.countDocuments({ MaKM: maKM }, { limit: 1 });

  if (inOrders > 0) {
    await kmColl.updateOne({ MaKM: maKM }, { $set: { TrangThai: 'Đã kết thúc' } });
    return {
      deleted: false,
      softDeleted: true,
      status: 'Đã kết thúc',
      message: `Mã ${maKM} đã từng được khách sử dụng trên hóa đơn nên hệ thống chuyển trạng thái sang "Đã kết thúc" để bảo đảm toàn vẹn dữ liệu.`
    };
  }

  await kmColl.deleteOne({ MaKM: maKM });
  return { deleted: true, message: `Đã xóa mã khuyến mãi ${maKM} thành công.` };
}
