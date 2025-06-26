# 🚀 Node.js Express CRUD API với Auto Reorder và AWS S3 Integration

Hệ thống API CRUD hoàn chỉnh với **Node.js + Express + MySQL + AWS S3**, hỗ trợ **Auto ID Reorder** và **Hybrid Upload System** (Local/S3).

## 📋 **TÍNH NĂNG CHÍNH**

### ✅ **CRUD Operations**
- **Create** - Tạo user mới với auto reorder IDs
- **Read** - Lấy danh sách users với pagination
- **Update** - Cập nhật thông tin user
- **Delete** - Xóa user với auto reorder IDs

### 📸 **Upload System**
- **Hybrid Storage**: Local storage hoặc AWS S3 
- **Auto-switching**: Đổi mode qua environment variable
- **File Validation**: Chỉ cho phép ảnh (JPG, PNG, GIF, WEBP)
- **Size Limit**: Tối đa 5MB per file
- **UUID Naming**: Tên file unique tránh conflict

### 🔄 **Auto ID Reorder**
- Tự động sắp xếp lại IDs khi xóa user
- Đảm bảo IDs liên tục [1,2,3...n]
- Thread-safe với database transactions

### 🌍 **UTF-8 Support**
- Hỗ trợ hoàn hảo tiếng Việt
- Database charset: utf8mb4
- API response với UTF-8 encoding

## 🛠️ **CÔNG NGHỆ SỬ DỤNG**

- **Backend**: Node.js + Express.js
- **Database**: MySQL + Sequelize ORM  
- **Storage**: Local + AWS S3 SDK v3
- **Upload**: Multer middleware
- **Environment**: dotenv
- **CLI Tools**: Custom scripts

## 📦 **CÀI ĐẶT**

### 1. **Clone Repository**
```bash
git clone <repository-url>
cd nodejs-express-crud-api
```

### 2. **Cài đặt Dependencies**
```bash
npm install
```

### 3. **Cấu hình Database**
```sql
-- Tạo database MySQL
CREATE DATABASE user_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. **Cấu hình Environment Variables**
```bash
# Copy từ template
cp config/env.example .env

# Chỉnh sửa .env với thông tin database của bạn
DB_HOST=localhost
DB_USER=root  
DB_PASSWORD=your_password
DB_NAME=user_management
```

### 5. **Khởi động Server**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3001`

## 🔧 **CẤU HÌNH AWS S3 (OPTIONAL)**

Để sử dụng AWS S3 thay vì local storage:

### 1. **Cấu hình AWS Credentials**
```env
# Trong file .env
UPLOAD_MODE=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key  
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-bucket-name
```

### 2. **Xem Hướng dẫn Chi tiết**
Đọc file `aws-s3-setup-guide.md` để setup AWS S3 từ A-Z.

## 📋 **API ENDPOINTS**

### **Thông tin System**
- `GET /` - Giới thiệu hệ thống
- `GET /express` - Thông tin Express.js
- `GET /project` - Chi tiết project
- `GET /upload-info` - Cấu hình upload hiện tại

### **Users CRUD**
- `GET /users` - Lấy danh sách users
- `POST /users` - Tạo user mới
- `PUT /users/:id` - Cập nhật user
- `DELETE /users/:id` - Xóa user (auto reorder)
- `POST /users/reorder` - Reorder IDs thủ công

### **File Upload**
- `POST /users/:id/upload-photo` - Upload ảnh đại diện

## 🧪 **TESTING & TOOLS**

### **Kiểm tra S3 Status**
```bash
# Detailed analysis
node check-s3-status.js

# Quick check với PowerShell  
powershell -ExecutionPolicy Bypass -File check-s3.ps1
```

### **CLI Management**
```bash
# Interactive CLI
node scripts/cli.js

# PowerShell helpers
./add-user.ps1
./test-reorder.ps1
```

### **Test Upload**
```bash
# Test hybrid upload system
node test-hybrid-upload.js
```

## 📊 **TRẠNG THÁI PROJECT**

### **✅ Hoàn thành**
- ✅ MySQL Database với UTF-8 support
- ✅ CRUD API với auto reorder
- ✅ Local file upload system  
- ✅ AWS S3 integration (SDK v3)
- ✅ Hybrid upload system (Local/S3)
- ✅ CLI management tools
- ✅ PowerShell helper scripts
- ✅ Comprehensive documentation
- ✅ Testing utilities

### **📈 Database Stats**
- **Users**: 11 users với IDs liên tục [1-11]
- **Photos**: 3 users có ảnh (100% local storage)
- **Storage**: Ready for S3 migration

## 🏗️ **KIẾN TRÚC PROJECT**

```
📂 nodejs-express-crud-api/
├── 📂 config/           # Cấu hình
│   ├── aws-s3.js       # AWS S3 client & functions
│   ├── database.js     # Database connection  
│   ├── init-db.js      # Database initialization
│   ├── upload.js       # Hybrid upload system
│   └── env.example     # Environment template
├── 📂 models/          # Data models
│   └── User.js         # User model với validation
├── 📂 scripts/         # CLI tools
│   ├── cli.js          # Interactive CLI (100 lines)
│   └── utils.js        # Utility functions (282 lines)
├── 📂 uploads/         # Local file storage
├── 📄 server.js        # Main server (442 lines)
├── 📄 package.json     # Dependencies
├── 📄 check-s3-status.js # S3 status checker
├── 📄 check-s3.ps1     # PowerShell quick check
├── 📄 add-user.ps1     # PowerShell add user
├── 📄 test-reorder.ps1 # PowerShell test reorder
├── 📄 aws-s3-setup-guide.md # AWS S3 setup guide (322 lines)
└── 📄 README.md        # This file
```

## 🎯 **NEXT STEPS**

### **Ngay lập tức:**
1. 🔄 Test toàn bộ API endpoints
2. 📸 Test upload system (local mode)
3. 🧪 Run analysis scripts

### **Tương lai gần:**
1. ☁️ Setup AWS S3 với credentials thật
2. 🔄 Migrate existing photos từ local lên S3  
3. 🚀 Deploy lên cloud platform

### **Advanced Features:**
1. 🖼️ Image resizing/thumbnails
2. 📊 Analytics và monitoring
3. 🔐 Authentication & authorization
4. 📱 Mobile API integration

## 🤝 **ĐÓNG GÓP**

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## 📞 **LIÊN HỆ & HỖ TRỢ**

- **Documentation**: Xem `aws-s3-setup-guide.md` cho AWS setup
- **CLI Help**: Chạy `node scripts/cli.js` để interactive help
- **API Testing**: Import Postman collection (tạo từ endpoints)

## 📝 **LICENSE**

MIT License - Xem file LICENSE để biết chi tiết.

---

**🎉 Happy Coding!** 🚀 Built with ❤️ using Node.js + Express + MySQL + AWS S3 