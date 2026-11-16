import { scrypt, randomBytes, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { ROLES } from '../admin-auth/policy.js';

const derive = promisify(scrypt);
const SCRYPT = Object.freeze({ algorithm: 'scrypt', version: 1, N: 131072, r: 8, p: 1, keylen: 64 });

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return {
    MatKhauBam: key.toString('base64'),
    Salt: salt.toString('base64'),
    ThamSoBam: { ...SCRYPT }
  };
}

export async function listEmployeesWithAccounts(db, query = {}) {
  const nvColl = await db.collection('NhanVien');
  const tkColl = await db.collection('TaiKhoan');
  const hdColl = await db.collection('HoaDon');

  const filter = {};
  if (query.q) {
    const regex = new RegExp(query.q.trim(), 'i');
    filter.$or = [{ MaNV: regex }, { HoTen: regex }, { SDT: regex }, { ChucVu: regex }];
  }

  const employees = await nvColl.find(filter).sort({ MaNV: 1 }).toArray();
  const accounts = await tkColl.find().toArray();
  const accountMap = new Map(accounts.map(a => [a.MaNV, a]));

  // Calculate sales stats
  const sales = await hdColl.aggregate([
    { $group: { _id: '$MaNV', SoHoaDon: { $sum: 1 }, DoanhThu: { $sum: '$ThanhTien' } } }
  ]).toArray();
  const salesMap = new Map(sales.map(s => [s._id, s]));

  const data = employees.map(emp => {
    const acc = accountMap.get(emp.MaNV);
    const sale = salesMap.get(emp.MaNV) || { SoHoaDon: 0, DoanhThu: 0 };
    return {
      MaNV: emp.MaNV,
      HoTen: emp.HoTen,
      SDT: emp.SDT || 'Chưa cập nhật',
      Email: emp.Email || 'Chưa cập nhật',
      ChucVu: emp.ChucVu,
      Luong: emp.Luong || 0,
      NgayVaoLam: emp.NgayVaoLam,
      TrangThai: emp.TrangThai,
      LaNhanVienHeThong: emp.MaNV === 'NV_ONLINE',
      TenDangNhap: acc?.TenDangNhap || 'Chưa cấp',
      VaiTro: acc?.VaiTro || 'Chưa phân quyền',
      TrangThaiTaiKhoan: acc?.TrangThai || 'Chưa có',
      SoHoaDon: sale.SoHoaDon,
      DoanhThu: sale.DoanhThu
    };
  });

  return { data, total: data.length };
}

export async function createEmployee(db, body) {
  const maNV = (body.MaNV || '').trim().toUpperCase();
  if (!maNV || !/^[A-Za-z0-9_-]{2,50}$/.test(maNV)) {
    throw new Error('Mã nhân viên không hợp lệ (2-50 ký tự, ví dụ: NV007).');
  }

  const nvColl = await db.collection('NhanVien');
  const existingNV = await nvColl.findOne({ MaNV: maNV });
  if (existingNV) throw new Error(`Mã nhân viên ${maNV} đã tồn tại trong hệ thống.`);

  const hoTen = (body.HoTen || '').trim();
  if (!hoTen) throw new Error('Họ tên nhân viên không được để trống.');

  const sdt = (body.SDT || '').trim();
  if (sdt && !/^0[0-9]{9}$/.test(sdt)) {
    throw new Error('Số điện thoại phải gồm 10 chữ số bắt đầu bằng số 0.');
  }

  const chucVu = (body.ChucVu || 'Nhân viên bán hàng').trim();
  const luong = Math.max(0, Number(body.Luong) || 0);
  const ngayVaoLam = body.NgayVaoLam ? new Date(`${body.NgayVaoLam}T00:00:00.000Z`) : new Date();

  // Account validation
  const tenDangNhap = (body.TenDangNhap || '').trim().toLowerCase();
  if (!tenDangNhap || !/^[a-z0-9_.-]{3,64}$/.test(tenDangNhap)) {
    throw new Error('Tên đăng nhập phải từ 3-64 ký tự (chữ thường, số, dấu gạch hoặc chấm).');
  }

  const tkColl = await db.collection('TaiKhoan');
  const existingTK = await tkColl.findOne({ TenDangNhap: tenDangNhap });
  if (existingTK) throw new Error(`Tên đăng nhập "${tenDangNhap}" đã có người sử dụng.`);

  const matKhau = body.MatKhau || '';
  if (!matKhau || matKhau.length < 6) {
    throw new Error('Mật khẩu đăng nhập phải từ 6 ký tự trở lên.');
  }

  const vaiTro = body.VaiTro || 'Bán hàng';
  if (!ROLES.includes(vaiTro)) {
    throw new Error(`Vai trò không hợp lệ. Chọn một trong: ${ROLES.join(', ')}.`);
  }

  // 1. Insert NhanVien
  const newNV = {
    MaNV: maNV,
    HoTen: hoTen,
    SDT: sdt,
    Email: (body.Email || '').trim(),
    ChucVu: chucVu,
    Luong: luong,
    NgayVaoLam: ngayVaoLam,
    TrangThai: 'Đang làm'
  };
  await nvColl.insertOne(newNV);

  // 2. Insert TaiKhoan
  const newTK = {
    TenDangNhap: tenDangNhap,
    MatKhau: matKhau,
    VaiTro: vaiTro,
    MaNV: maNV,
    TrangThai: 'Hoạt động'
  };
  await tkColl.insertOne(newTK);

  // 3. Insert TaiKhoanQuanTri
  const tkqtColl = await db.collection('TaiKhoanQuanTri');
  const { MatKhauBam, Salt, ThamSoBam } = await hashPassword(matKhau);
  const newTKQT = {
    MaTKQT: `TKQT_${randomUUID().replace(/-/g, '')}`,
    TenDangNhap: tenDangNhap,
    MaNV: maNV,
    MatKhauBam,
    Salt,
    ThamSoBam,
    ChinhSachMatKhau: 'IMPORT_DEMO',
    TrangThaiBaoMat: 'HoatDong',
    PhienBanXacThuc: 1,
    NgayTao: new Date(),
    NgayCapNhat: new Date()
  };
  await tkqtColl.insertOne(newTKQT);

  return {
    MaNV: maNV,
    HoTen: hoTen,
    TenDangNhap: tenDangNhap,
    VaiTro: vaiTro
  };
}

export async function updateEmployee(db, maNV, body) {
  const nvColl = await db.collection('NhanVien');
  const existingNV = await nvColl.findOne({ MaNV: maNV });
  if (!existingNV) throw new Error(`Không tìm thấy nhân viên ${maNV}.`);

  const nvUpdate = {};
  if (body.HoTen !== undefined) {
    const t = (body.HoTen || '').trim();
    if (!t) throw new Error('Họ tên không được để trống.');
    nvUpdate.HoTen = t;
  }
  if (body.SDT !== undefined) nvUpdate.SDT = body.SDT.trim();
  if (body.Email !== undefined) nvUpdate.Email = body.Email.trim();
  if (body.ChucVu !== undefined) nvUpdate.ChucVu = body.ChucVu.trim();
  if (body.Luong !== undefined) nvUpdate.Luong = Math.max(0, Number(body.Luong) || 0);
  if (body.TrangThai !== undefined) nvUpdate.TrangThai = body.TrangThai;

  if (Object.keys(nvUpdate).length > 0) {
    await nvColl.updateOne({ MaNV: maNV }, { $set: nvUpdate });
  }

  // Update account if provided
  const tkColl = await db.collection('TaiKhoan');
  const tkqtColl = await db.collection('TaiKhoanQuanTri');
  const tkUpdate = {};
  if (body.VaiTro !== undefined) {
    if (!ROLES.includes(body.VaiTro)) throw new Error('Vai trò không hợp lệ.');
    tkUpdate.VaiTro = body.VaiTro;
  }
  if (body.TrangThaiTaiKhoan !== undefined) {
    tkUpdate.TrangThai = body.TrangThaiTaiKhoan;
    await tkqtColl.updateOne(
      { MaNV: maNV },
      { $set: { TrangThaiBaoMat: body.TrangThaiTaiKhoan === 'Hoạt động' ? 'HoatDong' : 'TamKhoa' } }
    );
  }

  // Password reset
  if (body.MatKhau && body.MatKhau.trim()) {
    const mk = body.MatKhau.trim();
    if (mk.length < 6) throw new Error('Mật khẩu mới phải từ 6 ký tự trở lên.');
    tkUpdate.MatKhau = mk;

    const { MatKhauBam, Salt, ThamSoBam } = await hashPassword(mk);
    await tkqtColl.updateOne(
      { MaNV: maNV },
      {
        $set: { MatKhauBam, Salt, ThamSoBam, NgayCapNhat: new Date() },
        $inc: { PhienBanXacThuc: 1 }
      }
    );
  }

  if (Object.keys(tkUpdate).length > 0) {
    await tkColl.updateOne({ MaNV: maNV }, { $set: tkUpdate });
  }

  return { MaNV: maNV, message: 'Cập nhật thành công!' };
}

export async function deleteEmployee(db, maNV) {
  if (maNV === 'NV001' || maNV === 'NV_ONLINE') {
    throw new Error('Không thể xóa tài khoản Quản trị gốc hoặc Tài khoản hệ thống.');
  }

  const nvColl = await db.collection('NhanVien');
  const existingNV = await nvColl.findOne({ MaNV: maNV });
  if (!existingNV) throw new Error(`Không tìm thấy nhân viên ${maNV}.`);

  const hdColl = await db.collection('HoaDon');
  const pnColl = await db.collection('PhieuNhap');
  const inOrders = await hdColl.countDocuments({ MaNV: maNV }, { limit: 1 });
  const inPurchases = await pnColl.countDocuments({ MaNV: maNV }, { limit: 1 });

  const tkColl = await db.collection('TaiKhoan');
  const tkqtColl = await db.collection('TaiKhoanQuanTri');

  if (inOrders > 0 || inPurchases > 0) {
    // Soft delete: Cho thôi việc & Khóa tài khoản
    await nvColl.updateOne({ MaNV: maNV }, { $set: { TrangThai: 'Đã nghỉ' } });
    await tkColl.updateOne({ MaNV: maNV }, { $set: { TrangThai: 'Tạm khóa' } });
    await tkqtColl.updateOne({ MaNV: maNV }, { $set: { TrangThaiBaoMat: 'TamKhoa' } });
    return {
      deleted: false,
      softDeleted: true,
      message: `Nhân viên ${maNV} đã có lịch sử lập hóa đơn/phiếu nhập nên hệ thống đã chuyển sang "Đã nghỉ" và khóa vĩnh viễn tài khoản đăng nhập.`
    };
  }

  // Hard delete if never participated in transactions
  await nvColl.deleteOne({ MaNV: maNV });
  await tkColl.deleteOne({ MaNV: maNV });
  await tkqtColl.deleteOne({ MaNV: maNV });
  return { deleted: true, message: `Đã xóa hoàn toàn hồ sơ và tài khoản nhân viên ${maNV}.` };
}

export async function listCustomerAccounts(db, query = {}) {
  const tkkhColl = await db.collection('TaiKhoanKhachHang');
  const khColl = await db.collection('KhachHang');

  const accounts = await tkkhColl.find().sort({ NgayTao: -1 }).toArray();
  const customers = await khColl.find().toArray();
  const customerMap = new Map(customers.map(c => [c.MaKH, c]));

  const data = accounts.map(a => {
    const c = customerMap.get(a.MaKH);
    return {
      MaTKKH: a.MaTKKH,
      MaKH: a.MaKH,
      SDT: a.SDT,
      HoTen: c?.HoTen || 'Khách hàng Online',
      Email: c?.Email || 'Chưa có',
      DiemTichLuy: c?.DiemTichLuy || 0,
      TrangThai: a.TrangThai === 'HoatDong' ? 'Hoạt động' : 'Tạm khóa',
      NgayTao: a.NgayTao
    };
  });

  return { data, total: data.length };
}
