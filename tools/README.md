# Tools - Scripts Tiện Ích

Thư mục này chứa các script tiện ích để quản lý hệ thống upload ảnh hybrid (S3 + Local).

## Danh sách Scripts

### 1. `assign-s3-photo.js`
**Chức năng**: Gán ảnh đã có sẵn trên S3 bucket cho user mà không cần upload lại.

**Cách sử dụng**:
```bash
# Xem danh sách ảnh có sẵn trên S3
node tools/assign-s3-photo.js list

# Gán ảnh cho user
node tools/assign-s3-photo.js assign <userId> <s3FileName>
```

**Ví dụ**:
```bash
node tools/assign-s3-photo.js list
node tools/assign-s3-photo.js assign 5 "avatar-sample.jpg"
```

### 2. `migrate-user-storage.js`
**Chức năng**: Migrate ảnh user giữa Local Storage và AWS S3 (2 chiều).

**Cách sử dụng**:
```bash
# Migrate từ Local lên S3
node tools/migrate-user-storage.js <userId> local-to-s3 [--delete-local]

# Migrate từ S3 về Local  
node tools/migrate-user-storage.js <userId> s3-to-local

# Auto-detect và migrate ngược lại
node tools/migrate-user-storage.js <userId> auto
```

**Ví dụ**:
```bash
node tools/migrate-user-storage.js 4 local-to-s3 --delete-local
node tools/migrate-user-storage.js 3 s3-to-local
node tools/migrate-user-storage.js 2 auto
```

## Lưu ý
- Các script cần file `.env` với cấu hình AWS S3 và Database
- Chạy từ thư mục gốc của project (không phải từ trong thư mục tools)
- Backup database trước khi chạy migration scripts 