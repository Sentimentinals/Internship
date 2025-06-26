const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import database
const { initDatabase } = require('./config/init-db');
const User = require('./models/User');

// Import upload config
const { 
  uploadSingle, 
  handleUploadError, 
  processUploadedFile, 
  deleteUploadedFile, 
  getUploadInfo, 
  UPLOAD_MODE 
} = require('./config/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Khởi tạo database khi start server
initDatabase().catch(error => {
  console.error('❌ Không thể khởi tạo database:', error);
});

// Route chính - Giới thiệu ngôn ngữ JavaScript trong lập trình Node.js
app.get('/', async (req, res) => {
  // Get upload info
  const uploadInfo = await getUploadInfo();
  
  res.json({
    message: 'Chào mừng đến với Node.js API Server!',
    description: 'Giới thiệu ngôn ngữ JavaScript trong lập trình Node.js',
    features: [
      'JavaScript là ngôn ngữ lập trình động',
      'Node.js cho phép chạy JavaScript trên server',
      'Express.js là framework web nhanh và linh hoạt',
      'Hỗ trợ xây dựng RESTful API',
      'Dễ dàng tích hợp với cloud services như AWS',
      '🆕 Đã kết nối với MySQL Database!',
      `📸 Upload Mode: ${uploadInfo.mode.toUpperCase()}`
    ],
    endpoints: {
      'GET /': 'Giới thiệu ngôn ngữ JavaScript',
      'GET /express': 'Giới thiệu Express.js',
      'GET /project': 'Thông tin về project Node.js Express',
      'GET /upload-info': 'Thông tin cấu hình upload (local/S3)',
      'GET /users': 'Lấy danh sách users từ database',
      'POST /users': 'Tạo user mới vào database',
      'PUT /users/:id': 'Cập nhật user theo ID',
      'DELETE /users/:id': 'Xóa user theo ID (auto reorder)',
      'POST /users/reorder': 'Reorder tất cả user IDs thủ công',
      'POST /users/:id/upload-photo': 'Upload ảnh đại diện cho user'
    },
    uploadInfo
  });
});

// Giới thiệu Express.js
app.get('/express', (req, res) => {
  res.json({
    framework: 'Express.js',
    description: 'Giới thiệu Express.js - Web framework cho Node.js',
    features: [
      'Framework web tối giản và linh hoạt',
      'Hỗ trợ middleware mạnh mẽ',
      'Routing đơn giản và hiệu quả',
      'Hỗ trợ template engines',
      'Dễ dàng xây dựng API RESTful',
      'Cộng đồng lớn và tài liệu phong phú'
    ],
    version: require('./package.json').dependencies.express,
    documentation: 'https://expressjs.com/'
  });
});

// Thông tin về project
app.get('/project', async (req, res) => {
  const uploadInfo = await getUploadInfo();
  
  res.json({
    projectName: 'Node.js Express Cloud API',
    description: 'Tạo project Node.js Express để học cloud và tích hợp AWS',
    technologies: [
      'Node.js - Runtime environment',
      'Express.js - Web framework', 
      'MySQL + Sequelize - Database ORM',
      'JavaScript ES6+ - Programming language',
      'RESTful API - Architecture pattern',
      'JSON - Data format',
      uploadInfo.mode === 's3' ? 'AWS S3 - Cloud storage' : 'Local Storage - File system'
    ],
    purpose: 'Học cách xây dựng API để tích hợp với cloud services',
    currentProgress: uploadInfo.mode === 's3' ? 
      'Ngày 3: ✅ Đã tích hợp AWS S3 upload!' : 
      'Ngày 2: ✅ Đã có upload ảnh local!',
    nextSteps: uploadInfo.mode === 's3' ? [
      'Ngày 4: Test toàn bộ S3 integration',
      'Ngày 5: Deploy lên cloud với S3',
      'Ngày 6: Monitoring và optimization'
    ] : [
      'Ngày 3: Tích hợp AWS S3 để upload ảnh lên cloud',
      'Ngày 4: Thay thế local storage bằng S3 URLs',
      'Ngày 5: Test toàn bộ API và deploy lên cloud'
    ],
    uploadInfo
  });
});

// Endpoint thông tin upload configuration
app.get('/upload-info', async (req, res) => {
  try {
    const uploadInfo = await getUploadInfo();
    
    res.json({
      success: true,
      message: 'Thông tin cấu hình upload',
      data: uploadInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin upload',
      error: error.message
    });
  }
});

// API Users - GET /users (Lấy danh sách users từ database)
app.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    res.json({
      success: true,
      message: 'Lấy danh sách users từ database thành công',
      data: users,
      total: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách users',
      error: error.message
    });
  }
});

// API Users - POST /users (Tạo user mới vào database)
app.post('/users', async (req, res) => {
  try {
    const { name, email, age } = req.body;
    
    // Validation cơ bản
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Tên và email là bắt buộc'
      });
    }

    // Sử dụng method tùy chỉnh để tạo user với validation
    const result = await User.createWithValidation({
      name,
      email,
      age: age || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: 'Tạo user mới vào database thành công',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo user',
      error: error.message
    });
  }
});

// API Users - PUT /users/:id (Cập nhật user trong database)
app.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, age } = req.body;

    // Tìm user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    // Cập nhật user
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (age !== undefined) updateData.age = age;

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Cập nhật user trong database thành công',
      data: user
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Email đã tồn tại'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật user',
      error: error.message
    });
  }
});

// API Users - DELETE /users/:id (Xóa user khỏi database với reorder ID)
app.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Sử dụng method deleteWithReorder
    const result = await User.deleteWithReorder(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa user',
      error: error.message
    });
  }
});

// API Users - POST /users/:id/upload-photo (Upload ảnh đại diện cho user - Hybrid Local/S3)
app.post('/users/:id/upload-photo', (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Kiểm tra user tồn tại trước
  User.findByPk(userId).then(user => {
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }
    
    // Thực hiện upload
    uploadSingle(req, res, async (err) => {
      if (err) {
        return handleUploadError(err, req, res);
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file ảnh để upload'
        });
      }
      
      let oldPhotoUrl = user.photo; // Lưu URL ảnh cũ để xóa sau
      
      try {
        // Process uploaded file (local hoặc S3)
        const fileResult = await processUploadedFile(req.file);
        
        // Cập nhật photo URL vào database
        await user.update({ photo: fileResult.url });
        
        // Xóa ảnh cũ nếu có (sau khi upload thành công)
        if (oldPhotoUrl) {
          try {
            await deleteUploadedFile(oldPhotoUrl);
          } catch (deleteError) {
            console.warn('⚠️ Không thể xóa ảnh cũ:', deleteError.message);
          }
        }
        
        // Trả về thông tin ảnh đã upload
        res.json({
          success: true,
          message: `Upload ảnh đại diện thành công (${fileResult.mode})`,
          data: {
            user: user,
            photo: {
              mode: fileResult.mode,
              filename: fileResult.filename,
              originalName: fileResult.originalName,
              size: fileResult.size,
              mimetype: fileResult.mimetype,
              url: fileResult.url,
              ...(fileResult.mode === 's3' && {
                bucket: fileResult.bucket,
                etag: fileResult.etag
              }),
              ...(fileResult.mode === 'local' && {
                localPath: fileResult.path
              })
            }
          }
        });
        
      } catch (error) {
        // Xóa file đã upload nếu có lỗi database (chỉ cho local)
        if (req.file && req.file.path && UPLOAD_MODE === 'local') {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkError) {
            console.warn('⚠️ Không thể xóa file temp:', unlinkError.message);
          }
        }
        
        res.status(500).json({
          success: false,
          message: 'Lỗi khi upload ảnh',
          error: error.message
        });
      }
    });
    
  }).catch(error => {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra user',
      error: error.message
    });
  });
});

// Serve static files từ thư mục uploads (chỉ cho local mode)
if (UPLOAD_MODE === 'local') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// API Users - POST /users/reorder (Reorder tất cả user IDs)
app.post('/users/reorder', async (req, res) => {
  try {
    console.log('🔄 Yêu cầu reorder user IDs từ API...');
    
    const result = await User.reorderIds();
    
    res.json({
      success: true,
      message: result.message,
      newCount: result.newCount || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi reorder user IDs',
      error: error.message
    });
  }
});

// Middleware xử lý lỗi 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy endpoint này',
    availableEndpoints: [
      'GET /',
      'GET /express', 
      'GET /project',
      'GET /upload-info',
      'GET /users',
      'POST /users',
      'PUT /users/:id',
      'DELETE /users/:id',
      'POST /users/reorder',
      'POST /users/:id/upload-photo'
    ]
  });
});

// Khởi động server
app.listen(PORT, async () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📚 Các API endpoints có sẵn:`);
  console.log(`   GET  /           - Giới thiệu ngôn ngữ JavaScript`);
  console.log(`   GET  /express    - Giới thiệu Express.js`);
  console.log(`   GET  /project    - Thông tin project`);
  console.log(`   GET  /upload-info - Thông tin cấu hình upload`);
  console.log(`   GET  /users      - Lấy danh sách users từ DB`);
  console.log(`   POST /users      - Tạo user mới vào DB (auto reorder)`);
  console.log(`   PUT  /users/:id  - Cập nhật user trong DB`);
  console.log(`   DELETE /users/:id - Xóa user khỏi DB (auto reorder)`);
  console.log(`   POST /users/reorder - Reorder tất cả user IDs`);
  console.log(`   POST /users/:id/upload-photo - Upload ảnh đại diện`);
  console.log(`💾 Database: MySQL + Sequelize ORM`);
  console.log(`🔄 Auto ID Reorder: Enabled`);
  
  // Show upload info
  try {
    const uploadInfo = await getUploadInfo();
    console.log(`📸 Upload Mode: ${uploadInfo.mode.toUpperCase()}`);
    
    if (uploadInfo.mode === 's3') {
      if (uploadInfo.s3Status && uploadInfo.s3Status.success) {
        console.log(`☁️  AWS S3: Connected to ${uploadInfo.s3Status.bucket} (${uploadInfo.s3Status.region})`);
      } else {
        console.log(`❌ AWS S3: Connection failed - ${uploadInfo.s3Status?.error || 'Unknown error'}`);
        console.log(`⚠️  Fallback to local mode required`);
      }
    } else {
      console.log(`💾 Local Storage: ${path.join(__dirname, 'uploads')}`);
    }
  } catch (error) {
    console.log(`⚠️  Upload info error: ${error.message}`);
  }
});

module.exports = app; 