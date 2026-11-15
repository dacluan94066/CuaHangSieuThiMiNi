// S1 — CHỈ REVIEW, người dùng tự chạy trong Studio 3T, đúng DB Test.
// KHÔNG dùng load() file 01–07 gốc. Không drop, không seed, không đặt lại dữ liệu.
(function () {
  var ALLOWED = ["QLSieuThiMini", "QLSieuThiMini_Test"];
  if (ALLOWED.indexOf(db.getName()) === -1) throw new Error("DỪNG: phải chọn đúng database QLSieuThiMini hoặc QLSieuThiMini_Test trước khi chạy.");
  var DB_NAME = db.getName();
  var manifest = {
  "validators": {
    "TaiKhoanKhachHang": {
      "$jsonSchema": {
        "bsonType": "object",
        "additionalProperties": false,
        "required": [
          "MaTKKH",
          "MaKH",
          "SDT",
          "MatKhauBam",
          "Salt",
          "ThamSoBam",
          "TrangThai",
          "MaYeuCauDangKy",
          "NgayTao",
          "NgayCapNhat"
        ],
        "properties": {
          "_id": {
            "bsonType": "objectId"
          },
          "MaTKKH": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "MaKH": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "SDT": {
            "bsonType": "string",
            "pattern": "^0[0-9]{9}$"
          },
          "MatKhauBam": {
            "bsonType": "string",
            "pattern": "^[A-Za-z0-9+/]{86}==$"
          },
          "Salt": {
            "bsonType": "string",
            "pattern": "^[A-Za-z0-9+/]{22}==$"
          },
          "ThamSoBam": {
            "bsonType": "object",
            "additionalProperties": false,
            "required": [
              "algorithm",
              "version",
              "N",
              "r",
              "p",
              "keylen"
            ],
            "properties": {
              "algorithm": {
                "enum": [
                  "scrypt"
                ]
              },
              "version": {
                "enum": [
                  1
                ]
              },
              "N": {
                "enum": [
                  131072
                ]
              },
              "r": {
                "enum": [
                  8
                ]
              },
              "p": {
                "enum": [
                  1
                ]
              },
              "keylen": {
                "enum": [
                  64
                ]
              }
            }
          },
          "TrangThai": {
            "enum": [
              "DangTao",
              "HoatDong"
            ]
          },
          "MaYeuCauDangKy": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "NgayTao": {
            "bsonType": "date"
          },
          "NgayCapNhat": {
            "bsonType": "date"
          }
        }
      }
    },
    "YeuCauCuaHang": {
      "$jsonSchema": {
        "bsonType": "object",
        "additionalProperties": false,
        "required": [
          "MaYeuCau",
          "Loai",
          "MaKH",
          "TrangThai",
          "Buoc",
          "NgayTao",
          "NgayCapNhat"
        ],
        "properties": {
          "_id": {
            "bsonType": "objectId"
          },
          "MaYeuCau": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "Loai": {
            "enum": [
              "DANG_KY",
              "DAT_HANG"
            ]
          },
          "MaKH": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "MaTKKH": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "TrangThai": {
            "enum": [
              "DANG_XU_LY",
              "HOAN_TAT",
              "THAT_BAI",
              "CAN_PHUC_HOI"
            ]
          },
          "Buoc": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "NgayTao": {
            "bsonType": "date"
          },
          "NgayCapNhat": {
            "bsonType": "date"
          },
          "MaChongGuiTrung": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "MaBaoGia": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "MaHD": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "DauVanTay": {
            "bsonType": "string",
            "pattern": "^[a-f0-9]{64}$"
          },
          "Loi": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "GiuHang": {
            "bsonType": "array",
            "items": {
              "bsonType": "object",
              "required": [
                "MaYeuCau",
                "SoLuong"
              ],
              "additionalProperties": false,
              "properties": {
                "MaYeuCau": {
                  "bsonType": "string",
                  "minLength": 1,
                  "maxLength": 50
                },
                "SoLuong": {
                  "bsonType": [
                    "int",
                    "long"
                  ],
                  "minimum": 1,
                  "maximum": 99
                }
              }
            }
          },
          "Snapshot": {
            "bsonType": "object"
          }
        }
      }
    }
  },
  "extensions": {
    "SanPham": {
      "$jsonSchema": {
        "bsonType": "object",
        "properties": {
          "GiuChoOnline": {
            "bsonType": "array",
            "items": {
              "bsonType": "object",
              "required": [
                "MaYeuCau",
                "SoLuong"
              ],
              "additionalProperties": false,
              "properties": {
                "MaYeuCau": {
                  "bsonType": "string",
                  "minLength": 1,
                  "maxLength": 50
                },
                "SoLuong": {
                  "bsonType": [
                    "int",
                    "long"
                  ],
                  "minimum": 1,
                  "maximum": 99
                }
              }
            }
          }
        }
      }
    },
    "KhachHang": {
      "$jsonSchema": {
        "bsonType": "object",
        "properties": {
          "NguonTao": {
            "enum": [
              "ONLINE"
            ]
          },
          "MaYeuCauDangKy": {
            "bsonType": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "DiemDaCongOnline": {
            "bsonType": "array",
            "uniqueItems": true,
            "items": {
              "bsonType": "string",
              "minLength": 1,
              "maxLength": 50
            }
          }
        }
      }
    },
    "HoaDon": {
      "$or": [
        {
          "NguonDon": {
            "$ne": "ONLINE"
          }
        },
        {
          "$jsonSchema": {
            "bsonType": "object",
            "required": [
              "NguonDon",
              "TrangThaiDon",
              "DiaChiGiao",
              "MaChongGuiTrung",
              "MaBaoGia",
              "ThanhToanGiaLap",
              "TrangThaiThanhToan",
              "MaGiaoDichGiaLap",
              "DiemDuocCong",
              "TrangThaiTichDiem"
            ],
            "properties": {
              "NguonDon": {
                "enum": [
                  "ONLINE"
                ]
              },
              "TrangThaiDon": {
                "enum": [
                  "Đã xác nhận"
                ]
              },
              "DiaChiGiao": {
                "bsonType": "object",
                "additionalProperties": false,
                "required": [
                  "HoTenNguoiNhan",
                  "SDTNguoiNhan",
                  "DiaChi"
                ],
                "properties": {
                  "HoTenNguoiNhan": {
                    "bsonType": "string",
                    "minLength": 1,
                    "maxLength": 100
                  },
                  "SDTNguoiNhan": {
                    "bsonType": "string",
                    "pattern": "^0[0-9]{9}$"
                  },
                  "DiaChi": {
                    "bsonType": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                }
              },
              "MaChongGuiTrung": {
                "bsonType": "string",
                "minLength": 1,
                "maxLength": 50
              },
              "MaBaoGia": {
                "bsonType": "string",
                "minLength": 1,
                "maxLength": 50
              },
              "ThanhToanGiaLap": {
                "enum": [
                  true
                ]
              },
              "TrangThaiThanhToan": {
                "enum": [
                  "Đã thanh toán giả lập"
                ]
              },
              "MaGiaoDichGiaLap": {
                "bsonType": "string",
                "minLength": 1,
                "maxLength": 50
              },
              "DiemDuocCong": {
                "bsonType": [
                  "int",
                  "long"
                ],
                "minimum": 0
              },
              "TrangThaiTichDiem": {
                "enum": [
                  "ChoXuLy",
                  "DaCong"
                ]
              }
            }
          }
        }
      ]
    }
  },
  "indexes": [
    {
      "collection": "TaiKhoanKhachHang",
      "key": {
        "MaTKKH": 1
      },
      "options": {
        "name": "uq_TaiKhoanKhachHang_MaTKKH",
        "unique": true
      }
    },
    {
      "collection": "TaiKhoanKhachHang",
      "key": {
        "MaKH": 1
      },
      "options": {
        "name": "uq_TaiKhoanKhachHang_MaKH",
        "unique": true
      }
    },
    {
      "collection": "TaiKhoanKhachHang",
      "key": {
        "SDT": 1
      },
      "options": {
        "name": "uq_TaiKhoanKhachHang_SDT",
        "unique": true
      }
    },
    {
      "collection": "YeuCauCuaHang",
      "key": {
        "MaYeuCau": 1
      },
      "options": {
        "name": "uq_YeuCauCuaHang_MaYeuCau",
        "unique": true
      }
    },
    {
      "collection": "YeuCauCuaHang",
      "key": {
        "MaKH": 1,
        "MaChongGuiTrung": 1
      },
      "options": {
        "name": "uq_YeuCauCuaHang_MaKH_MaChongGuiTrung",
        "unique": true,
        "partialFilterExpression": {
          "Loai": "DAT_HANG",
          "MaChongGuiTrung": {
            "$type": "string"
          }
        }
      }
    },
    {
      "collection": "HoaDon",
      "key": {
        "MaKH": 1,
        "MaChongGuiTrung": 1
      },
      "options": {
        "name": "uq_HoaDonOnline_MaKH_MaChongGuiTrung",
        "unique": true,
        "partialFilterExpression": {
          "NguonDon": "ONLINE",
          "MaChongGuiTrung": {
            "$type": "string"
          }
        }
      }
    },
    {
      "collection": "YeuCauCuaHang",
      "key": {
        "MaKH": 1,
        "MaBaoGia": 1
      },
      "options": {
        "name": "uq_YeuCauCuaHang_MaKH_MaBaoGia",
        "unique": true,
        "partialFilterExpression": {
          "Loai": "DAT_HANG",
          "MaBaoGia": {
            "$type": "string"
          }
        }
      }
    },
    {
      "collection": "HoaDon",
      "key": {
        "MaKH": 1,
        "MaBaoGia": 1
      },
      "options": {
        "name": "uq_HoaDonOnline_MaKH_MaBaoGia",
        "unique": true,
        "partialFilterExpression": {
          "NguonDon": "ONLINE",
          "MaBaoGia": {
            "$type": "string"
          }
        }
      }
    },
    {
      "collection": "YeuCauCuaHang",
      "key": {
        "TrangThai": 1,
        "NgayTao": 1
      },
      "options": {
        "name": "idx_YeuCauCuaHang_PhucHoi"
      }
    }
  ],
  "baseCollections": [
    "DanhMuc",
    "NhaCungCap",
    "SanPham",
    "KhachHang",
    "NhanVien",
    "TaiKhoan",
    "KhuyenMai",
    "HoaDon",
    "PhieuNhap"
  ],
  "baseUniqueIndexes": [
    {
      "collection": "KhachHang",
      "key": {
        "MaKH": 1
      },
      "options": {
        "name": "uq_KhachHang_MaKH",
        "unique": true
      }
    },
    {
      "collection": "KhachHang",
      "key": {
        "SDT": 1
      },
      "options": {
        "name": "uq_KhachHang_SDT",
        "unique": true
      }
    },
    {
      "collection": "HoaDon",
      "key": {
        "MaHD": 1
      },
      "options": {
        "name": "uq_HoaDon_MaHD",
        "unique": true
      }
    },
    {
      "collection": "NhanVien",
      "key": {
        "MaNV": 1
      },
      "options": {
        "name": "uq_NhanVien_MaNV",
        "unique": true
      }
    }
  ]
};
  function canonical(value) {
    if (Array.isArray(value)) return JSON.stringify(value.map(function (x) { return JSON.parse(canonical(x)); }));
    if (value && typeof value === "object") {
      var result = {};
      Object.keys(value).sort().forEach(function (key) { result[key] = JSON.parse(canonical(value[key])); });
      return JSON.stringify(result);
    }
    return JSON.stringify(value);
  }
  function sameIndex(actual, expected) {
    return actual && JSON.stringify(actual.key) === JSON.stringify(expected.key)
      && Boolean(actual.unique) === Boolean(expected.options.unique)
      && canonical(actual.partialFilterExpression || {}) === canonical(expected.options.partialFilterExpression || {})
      && !actual.sparse && !actual.hidden && actual.expireAfterSeconds === undefined && !actual.collation;
  }
  var infos = db.getCollectionInfos({});
  var byName = {};
  infos.forEach(function (info) { byName[info.name] = info; });
  manifest.baseCollections.forEach(function (name) {
    if (!byName[name] || byName[name].type !== "collection") throw new Error("DỪNG: thiếu collection gốc " + name + ". Hãy restore đúng bản sao, không chạy lại 01–07.");
  });
  var createPlans = []; var extensionPlans = []; var indexPlans = [];
  Object.keys(manifest.validators).forEach(function (name) {
    var validator = manifest.validators[name]; var info = byName[name];
    if (!info) { createPlans.push({ name: name, validator: validator }); return; }
    if (info.type !== "collection" || canonical(info.options.validator || {}) !== canonical(validator)
      || (info.options.validationLevel || "strict") !== "strict" || (info.options.validationAction || "error") !== "error") throw new Error("DỪNG: schema collection mới bị xung đột: " + name);
    if (db.getCollection(name).countDocuments({ $nor: [validator] }) > 0) throw new Error("DỪNG: dữ liệu không đúng schema: " + name);
  });
  Object.keys(manifest.extensions).forEach(function (name) {
    var info = byName[name]; var previous = info.options.validator; var extension = manifest.extensions[name];
    if (!previous || !Object.keys(previous).length || (info.options.validationLevel || "strict") !== "strict"
      || (info.options.validationAction || "error") !== "error") throw new Error("DỪNG: thiếu validator gốc nghiêm ngặt: " + name);
    var already = Array.isArray(previous.$and) && previous.$and.some(function (part) { return canonical(part) === canonical(extension); });
    var validator = already ? previous : { $and: [previous, extension] };
    if (db.getCollection(name).countDocuments({ $nor: [validator] }) > 0) throw new Error("DỪNG: dữ liệu hiện có xung đột schema mở rộng: " + name);
    if (!already) extensionPlans.push({ name: name, validator: validator });
  });
  manifest.baseUniqueIndexes.forEach(function (expected) {
    var actual = db.getCollection(expected.collection).getIndexes().filter(function (idx) { return idx.name === expected.options.name; })[0];
    if (!sameIndex(actual, expected)) throw new Error("DỪNG: thiếu/xung đột index gốc " + expected.options.name);
  });
  manifest.indexes.forEach(function (expected) {
    var indexes = byName[expected.collection] ? db.getCollection(expected.collection).getIndexes() : [];
    var actual = indexes.filter(function (idx) { return idx.name === expected.options.name; })[0];
    if (actual) {
      if (!sameIndex(actual, expected)) throw new Error("DỪNG: xung đột index " + expected.options.name);
      return;
    }
    if (indexes.some(function (idx) { return JSON.stringify(idx.key) === JSON.stringify(expected.key); })) throw new Error("DỪNG: đã có index cùng key khác tên/đặc tả: " + expected.options.name);
    if (expected.options.unique && byName[expected.collection]) {
      var group = {}; Object.keys(expected.key).forEach(function (key) { group[key] = "$" + key; });
      var pipeline = [];
      if (expected.options.partialFilterExpression) pipeline.push({ $match: expected.options.partialFilterExpression });
      pipeline.push({ $group: { _id: group, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 1 });
      if (db.getCollection(expected.collection).aggregate(pipeline).toArray().length) throw new Error("DỪNG: dữ liệu trùng cho index " + expected.options.name);
    }
    indexPlans.push(expected);
  });
  // All conflict checks above are reads. Writes start only here, manually invoked.
  print("Đích đã xác nhận: " + DB_NAME + "; tạo " + createPlans.length + " collection, mở rộng " + extensionPlans.length + " validator, tạo " + indexPlans.length + " index.");
  createPlans.forEach(function (plan) { db.createCollection(plan.name, { validator: plan.validator, validationLevel: "strict", validationAction: "error" }); });
  extensionPlans.forEach(function (plan) {
    var result = db.runCommand({ collMod: plan.name, validator: plan.validator, validationLevel: "strict", validationAction: "error" });
    if (result.ok !== 1) throw new Error("DỪNG: không mở rộng được validator " + plan.name);
  });
  indexPlans.forEach(function (plan) { db.getCollection(plan.collection).createIndex(plan.key, plan.options); });
  print("Hoàn tất schema/index. Chạy lại không đặt lại dữ liệu; tiếp theo review/chạy 02_online_employee.js.");
}());
