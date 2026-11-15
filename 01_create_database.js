// ================================================================
// 01_create_database.js
// Khởi tạo CSDL QLSieuThiMini và 9 collection.
// Chạy file này sẽ làm mới CHỈ 9 collection bên dưới, không xóa database khác.
// ================================================================

db = db.getSiblingDB("QLSieuThiMini");

var TEN_COLLECTION = [
    "DanhMuc", "SanPham", "NhaCungCap", "KhachHang", "NhanVien",
    "TaiKhoan", "HoaDon", "PhieuNhap", "KhuyenMai"
];

// Cho phép chạy lại toàn bộ bài thực hành mà không lỗi trùng dữ liệu.
// Lưu ý: chỉ chạy bước này khi muốn tạo lại dữ liệu demo từ đầu.
TEN_COLLECTION.forEach(function (ten) {
    if (db.getCollectionNames().indexOf(ten) !== -1) {
        db.getCollection(ten).drop();
    }
});

// Danh mục sản phẩm.
db.createCollection("DanhMuc", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaDM", "TenDM", "TrangThai"],
            properties: {
                MaDM: { bsonType: "string" },
                TenDM: { bsonType: "string" },
                MoTa: { bsonType: "string" },
                TrangThai: { bsonType: "string" }
            }
        }
    }
});

// Nhà cung cấp hàng hóa.
db.createCollection("NhaCungCap", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaNCC", "TenNCC", "SDT", "TrangThai"],
            properties: {
                MaNCC: { bsonType: "string" }, TenNCC: { bsonType: "string" },
                SDT: { bsonType: "string" }, Email: { bsonType: "string" },
                DiaChi: { bsonType: "string" }, TrangThai: { bsonType: "string" }
            }
        }
    }
});

// Sản phẩm tham chiếu danh mục và nhà cung cấp qua MaDM, MaNCC.
db.createCollection("SanPham", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaSP", "TenSP", "MaDM", "MaNCC", "DonGiaNhap", "DonGiaBan", "SoLuongTon", "DonViTinh", "TrangThai"],
            properties: {
                MaSP: { bsonType: "string" }, TenSP: { bsonType: "string" },
                MaDM: { bsonType: "string" }, MaNCC: { bsonType: "string" },
                DonGiaNhap: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                DonGiaBan: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                SoLuongTon: { bsonType: ["int", "long"], minimum: 0 },
                DonViTinh: { bsonType: "string" }, HanSuDung: { bsonType: "date" },
                TrangThai: { bsonType: "string" }
            }
        }
    }
});

db.createCollection("KhachHang", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaKH", "HoTen", "SDT", "DiemTichLuy", "NgayDangKy"],
            properties: {
                MaKH: { bsonType: "string" }, HoTen: { bsonType: "string" },
                SDT: { bsonType: "string" }, Email: { bsonType: "string" },
                DiaChi: { bsonType: "string" },
                DiemTichLuy: { bsonType: ["int", "long"], minimum: 0 },
                NgayDangKy: { bsonType: "date" }
            }
        }
    }
});

db.createCollection("NhanVien", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaNV", "HoTen", "ChucVu", "Luong", "NgayVaoLam", "TrangThai"],
            properties: {
                MaNV: { bsonType: "string" }, HoTen: { bsonType: "string" },
                SDT: { bsonType: "string" }, Email: { bsonType: "string" },
                ChucVu: { bsonType: "string" },
                Luong: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                NgayVaoLam: { bsonType: "date" }, TrangThai: { bsonType: "string" }
            }
        }
    }
});

db.createCollection("TaiKhoan", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["TenDangNhap", "MatKhau", "VaiTro", "MaNV", "TrangThai"],
            properties: {
                TenDangNhap: { bsonType: "string" }, MatKhau: { bsonType: "string" },
                VaiTro: { bsonType: "string" }, MaNV: { bsonType: "string" },
                TrangThai: { bsonType: "string" }
            }
        }
    }
});

db.createCollection("KhuyenMai", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaKM", "TenKM", "LoaiKhuyenMai", "GiaTri", "NgayBatDau", "NgayKetThuc", "DieuKien", "TrangThai"],
            properties: {
                MaKM: { bsonType: "string" }, TenKM: { bsonType: "string" },
                LoaiKhuyenMai: { bsonType: "string" },
                GiaTri: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                NgayBatDau: { bsonType: "date" }, NgayKetThuc: { bsonType: "date" },
                DieuKien: { bsonType: "object" }, TrangThai: { bsonType: "string" }
            }
        }
    }
});

// Hóa đơn nhúng mảng ChiTiet để đọc trọn một giao dịch trong một document.
db.createCollection("HoaDon", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaHD", "MaKH", "MaNV", "NgayLap", "ChiTiet", "TongTien", "GiamGia", "ThanhTien", "PhuongThucThanhToan"],
            properties: {
                MaHD: { bsonType: "string" }, MaKH: { bsonType: "string" },
                MaNV: { bsonType: "string" }, MaKM: { bsonType: "string" },
                NgayLap: { bsonType: "date" },
                ChiTiet: {
                    bsonType: "array", minItems: 1,
                    items: {
                        bsonType: "object",
                        required: ["MaSP", "TenSP", "SoLuong", "DonGia", "ThanhTien"],
                        properties: {
                            MaSP: { bsonType: "string" }, TenSP: { bsonType: "string" },
                            SoLuong: { bsonType: ["int", "long"], minimum: 1 },
                            DonGia: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                            ThanhTien: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 }
                        }
                    }
                },
                TongTien: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                GiamGia: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                ThanhTien: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                PhuongThucThanhToan: { bsonType: "string" }
            }
        }
    }
});

// Phiếu nhập cũng nhúng ChiTiet vì các dòng hàng luôn thuộc về một phiếu.
db.createCollection("PhieuNhap", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["MaPN", "MaNCC", "MaNV", "NgayNhap", "ChiTiet", "TongTien"],
            properties: {
                MaPN: { bsonType: "string" }, MaNCC: { bsonType: "string" },
                MaNV: { bsonType: "string" }, NgayNhap: { bsonType: "date" },
                ChiTiet: {
                    bsonType: "array", minItems: 1,
                    items: {
                        bsonType: "object",
                        required: ["MaSP", "TenSP", "SoLuong", "DonGiaNhap", "ThanhTien"],
                        properties: {
                            MaSP: { bsonType: "string" }, TenSP: { bsonType: "string" },
                            SoLuong: { bsonType: ["int", "long"], minimum: 1 },
                            DonGiaNhap: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
                            ThanhTien: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 }
                        }
                    }
                },
                TongTien: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 }
            }
        }
    }
});

print("Đã tạo database QLSieuThiMini với 9 collection:");
printjson(db.getCollectionNames().sort());
