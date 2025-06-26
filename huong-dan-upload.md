# 📸 HƯỚNG DẪN UPLOAD ẢNH CỦA BẠN

## 🎯 Server Information
- **API Server**: http://localhost:3001
- **Upload Endpoint**: POST /users/:id/upload-photo
- **Field Name**: photo
- **Supported Formats**: JPG, PNG, GIF, WEBP
- **Max Size**: 5MB

## 📋 Cách 1: Sử dụng Postman (Khuyến nghị)

### Bước 1: Cài đặt Postman
- Download tại: https://www.postman.com/downloads/
- Hoặc sử dụng Postman Web: https://web.postman.com/

### Bước 2: Tạo Request
1. Tạo **New Request**
2. Chọn method: **POST**
3. URL: `http://localhost:3001/users/1/upload-photo`
   (Thay `1` bằng ID user bạn muốn upload)

### Bước 3: Cấu hình Body
1. Chọn tab **Body**
2. Chọn **form-data**
3. Thêm field:
   - **Key**: `photo` (type: File)
   - **Value**: Click "Select Files" và chọn ảnh của bạn

### Bước 4: Send Request
- Click **Send**
- Xem kết quả trong Response

## 📋 Cách 2: Sử dụng curl (Command Line)

### Windows PowerShell:
```powershell
# Thay "C:\path\to\your\image.jpg" bằng đường dẫn ảnh thật của bạn
curl.exe -X POST "http://localhost:3001/users/1/upload-photo" -F "photo=@C:\Users\YourName\Pictures\your-image.jpg"
```

### Windows Command Prompt:
```cmd
curl -X POST "http://localhost:3001/users/1/upload-photo" -F "photo=@C:\path\to\your\image.jpg"
```

## 📋 Cách 3: Tạo HTML Form đơn giản

### File: upload-form.html
```html
<!DOCTYPE html>
<html>
<head>
    <title>Upload Ảnh Đại Diện</title>
    <meta charset="UTF-8">
</head>
<body>
    <h2>📸 Upload Ảnh Đại Diện</h2>
    <form action="http://localhost:3001/users/1/upload-photo" method="POST" enctype="multipart/form-data">
        <p>
            <label>Chọn ảnh (JPG, PNG, GIF, WEBP - Max 5MB):</label><br>
            <input type="file" name="photo" accept="image/*" required>
        </p>
        <p>
            <button type="submit">📤 Upload Ảnh</button>
        </p>
    </form>
    
    <h3>📋 Danh Sách Users:</h3>
    <p>Thay số <strong>1</strong> trong URL form bằng ID user bạn muốn:</p>
    <ul id="userList">Loading...</ul>
    
    <script>
        // Load danh sách users
        fetch('http://localhost:3001/users')
            .then(res => res.json())
            .then(data => {
                const userList = document.getElementById('userList');
                userList.innerHTML = data.data.map(user => 
                    `<li>ID: ${user.id} - ${user.name} (${user.email}) - Ảnh: ${user.photo || 'Chưa có'}</li>`
                ).join('');
            })
            .catch(err => {
                document.getElementById('userList').innerHTML = '<li>❌ Lỗi load users</li>';
            });
    </script>
</body>
</html>
```

## 📋 Cách 4: Sử dụng JavaScript (Web)

```javascript
// Tạo form upload với JavaScript
const uploadPhoto = async (userId, fileInput) => {
    const formData = new FormData();
    formData.append('photo', fileInput.files[0]);
    
    try {
        const response = await fetch(`http://localhost:3001/users/${userId}/upload-photo`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Upload thành công!');
            console.log('URL ảnh:', result.data.photo.url);
            console.log('Xem ảnh tại:', `http://localhost:3001${result.data.photo.url}`);
        } else {
            console.error('❌ Upload thất bại:', result.message);
        }
    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
};

// Sử dụng:
// const fileInput = document.getElementById('photoInput');
// uploadPhoto(1, fileInput);
```

## 🔍 Kiểm Tra Kết Quả

### 1. Xem danh sách users:
```
GET http://localhost:3001/users
```

### 2. Xem ảnh đã upload:
```
http://localhost:3001/uploads/filename.jpg
```

### 3. Kiểm tra với CLI:
```bash
node scripts/cli.js list
```

## ⚠️ Lưu Ý Quan Trọng

1. **Server phải đang chạy**: `npm start`
2. **File size**: Tối đa 5MB
3. **File types**: Chỉ file ảnh (jpg, png, gif, webp)
4. **User ID**: Phải tồn tại trong database
5. **CORS**: Đã được cấu hình cho local development

## 🎯 Ví Dụ Thực Tế

### Bước 1: Kiểm tra users có sẵn
```bash
node scripts/cli.js list
```

### Bước 2: Chọn ảnh từ máy tính
- Chuẩn bị file ảnh (.jpg, .png, .gif, .webp)
- Kích thước < 5MB

### Bước 3: Upload bằng Postman
1. POST http://localhost:3001/users/1/upload-photo
2. Body → form-data → photo → Select Files
3. Chọn ảnh → Send

### Bước 4: Xem kết quả
- Response sẽ có URL ảnh
- Copy URL vào browser để xem ảnh
- Hoặc dùng CLI: `node scripts/cli.js list`

## 🎉 Thành Công!

Sau khi upload, bạn sẽ thấy:
- ✅ Response JSON với thông tin ảnh
- ✅ File được lưu trong folder `uploads/`
- ✅ Database được cập nhật với URL ảnh
- ✅ Có thể xem ảnh qua browser 