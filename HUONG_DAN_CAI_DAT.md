# 🚀 Hướng dẫn cài đặt và chạy ứng dụng

## 📦 Bước 1: Cài đặt Node.js

### Cách 1: Download từ trang chính thức (Khuyên dùng)
1. Vào trang https://nodejs.org/
2. Download phiên bản LTS (Long Term Support) - khuyên dùng
3. Chạy file installer và làm theo hướng dẫn
4. Restart Command Prompt/PowerShell sau khi cài đặt

### Cách 2: Sử dụng Chocolatey (nếu đã có)
```powershell
choco install nodejs
```

### Cách 3: Sử dụng Winget
```powershell
winget install OpenJS.NodeJS
```

## ✅ Bước 2: Kiểm tra cài đặt thành công

Mở Command Prompt hoặc PowerShell mới và chạy:

```bash
node --version
npm --version
```

Nếu thấy hiển thị số phiên bản thì đã cài đặt thành công!

## 🏃‍♂️ Bước 3: Chạy ứng dụng

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy ứng dụng ở chế độ development
```bash
npm run dev
```

Hoặc chạy ở chế độ production:
```bash
npm start
```

### 3. Mở trình duyệt
Vào địa chỉ: `http://localhost:3001`

## 🧪 Test các API endpoints

### Sử dụng trình duyệt web:
- `http://localhost:3001/` - Giới thiệu JavaScript
- `http://localhost:3001/express` - Giới thiệu Express
- `http://localhost:3001/project` - Thông tin project
- `http://localhost:3001/users` - Danh sách users

### Sử dụng Postman hoặc cURL:

**Lấy danh sách users:**
```bash
curl http://localhost:3001/users
```

**Tạo user mới:**
```bash
curl -X POST http://localhost:3001/users ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Nguyễn Văn D\",\"email\":\"d@example.com\",\"age\":32}"
```

**Cập nhật user:**
```bash
curl -X PUT http://localhost:3001/users/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Nguyễn Văn A Updated\",\"age\":26}"
```

**Xóa user:**
```bash
curl -X DELETE http://localhost:3001/users/1
```

## 🎯 Các tính năng đã hoàn thành

✅ **Giới thiệu ngôn ngữ JavaScript** - Endpoint `/`
✅ **Giới thiệu Express.js** - Endpoint `/express`  
✅ **Tạo project Node.js Express** - Endpoint `/project`
✅ **API Users GET** - Lấy danh sách users
✅ **API Users POST** - Tạo user mới
✅ **API Users PUT** - Cập nhật user theo ID
✅ **API Users DELETE** - Xóa user theo ID

## 🔧 Troubleshooting

### Lỗi "npm not recognized"
- Node.js chưa được cài đặt hoặc chưa được thêm vào PATH
- Restart Command Prompt/PowerShell sau khi cài đặt Node.js

### Lỗi "Port 3001 already in use"
- Thay đổi port trong file `.env`: `PORT=3001`
- Hoặc tắt ứng dụng khác đang sử dụng port 3001

### Lỗi CORS
- Ứng dụng đã cấu hình CORS, nhưng nếu gặp vấn đề, check lại frontend URL

## 🌟 Bước tiếp theo với AWS

Sau khi ứng dụng chạy thành công, bạn có thể:

1. **Học AWS SDK**: Cài đặt `npm install aws-sdk`
2. **Tạo AWS Account**: Đăng ký tài khoản AWS miễn phí
3. **IAM Roles**: Tạo user và roles cho API access
4. **DynamoDB**: Thay thế memory storage bằng database thực
5. **Lambda**: Deploy ứng dụng lên serverless
6. **API Gateway**: Quản lý API endpoints
7. **CloudWatch**: Monitor và logging

Happy coding! 🚀 