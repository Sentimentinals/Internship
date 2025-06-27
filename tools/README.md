# 🛠️ Management Tools

Thư mục này chứa các tools và scripts để quản lý hệ thống upload ảnh.

## 📋 Danh sách Tools

### 1. **assign-s3-photo.js**
Gán ảnh S3 có sẵn cho user cụ thể.

```bash
node tools/assign-s3-photo.js
```

**Chức năng:**
- List tất cả ảnh S3 có sẵn
- Chọn user để gán ảnh
- Cập nhật database với S3 URL

### 2. **migrate-user-storage.js**
Di chuyển ảnh của user từ local lên S3.

```bash
node tools/migrate-user-storage.js
```

**Chức năng:**
- Upload ảnh local lên S3
- Cập nhật database
- Giữ nguyên file local (backup)

### 3. **batch-operations.js** ⭐ MỚI
Module xử lý các thao tác hàng loạt thông qua Dashboard Web UI.

**Chức năng:**
- 🔄 **Migrate All to S3**: Di chuyển tất cả ảnh local lên S3
- 🗑️ **Cleanup Unused Files**: Xóa files không sử dụng trong uploads/
- 📸 **Bulk Assign S3 Photos**: Gán ảnh S3 cho users chưa có ảnh
- 🔍 **Verify File Integrity**: Kiểm tra tính toàn vẹn files

## 🌐 Dashboard Web Interface

Truy cập qua: `http://localhost:3000/dashboard`

### Features Dashboard:
- **📈 Analytics Tab**: Xem thống kê upload, storage, performance
- **⚡ Batch Operations Tab**: Thực hiện các thao tác hàng loạt
- **📊 Real-time Charts**: Biểu đồ upload theo ngày
- **📋 Operation Logs**: Theo dõi tiến trình real-time

### API Endpoints:
```
GET  /api/analytics              # Lấy thống kê analytics
POST /api/batch/migrate-all-s3   # Migration tất cả lên S3
POST /api/batch/cleanup-unused   # Cleanup files không dùng
POST /api/batch/bulk-assign-s3   # Auto assign S3 photos
POST /api/batch/verify-integrity # Verify file integrity
```

## 🚀 Cách sử dụng

### Command Line Tools:
```bash
# Gán ảnh S3 cho user
node tools/assign-s3-photo.js

# Migrate user specific
node tools/migrate-user-storage.js
```

### Web Dashboard:
1. Start server: `npm start`
2. Mở browser: `http://localhost:3000/dashboard`
3. Chọn tab **Analytics** hoặc **Batch Operations**
4. Click nút để thực hiện thao tác

## 📝 Lưu ý

- **Backup quan trọng**: Các thao tác batch có thể ảnh hưởng nhiều data
- **Kiểm tra S3 config**: Đảm bảo AWS credentials đã được cấu hình
- **Monitor logs**: Theo dõi operation logs để kiểm tra lỗi
- **Test trước**: Thử với dữ liệu nhỏ trước khi chạy bulk operations

## 🔧 Cấu hình môi trường

Đảm bảo các biến môi trường đã được set:
```env
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

## 📊 Monitoring

Dashboard cung cấp:
- **Upload statistics**: Tổng uploads, tỷ lệ thành công
- **Storage breakdown**: Local vs S3 files
- **Performance metrics**: Thời gian upload trung bình
- **Daily trends**: Upload trends 7 ngày gần nhất
- **Real-time progress**: Progress bars cho batch operations 