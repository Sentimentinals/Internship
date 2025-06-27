const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import database
const { initDatabase } = require('./config/init-db');
const { sequelize } = require('./config/database');
const User = require('./models/User');

// Import upload config
const { 
  uploadSingle, 
  uploadSingleLocal,
  handleUploadError, 
  processUploadedFile, 
  processUploadedFileLocal,
  deleteUploadedFile, 
  getUploadInfo, 
  UPLOAD_MODE 
} = require('./config/upload');

// Import các modules mới
const analytics = require('./config/analytics');
const batchOperations = require('./tools/batch-operations');

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
      'POST /users/:id/upload-photo': 'Upload ảnh đại diện cho user',
      'POST /users/:id/upload-photo-local': 'Force local upload'
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

// API Users - POST /users/:id/upload-photo
app.post('/users/:id/upload-photo', uploadSingle, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Kiểm tra user có tồn tại không
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Kiểm tra file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file ảnh được upload'
      });
    }

    // Process uploaded file
    const result = await processUploadedFile(req.file, req.file.originalname);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Upload ảnh thất bại',
        error: result.error
      });
    }

    // Xóa ảnh cũ nếu có
    if (user.photo) {
      await deleteUploadedFile(user.photo);
    }

    // Cập nhật database với đường dẫn ảnh mới
    await user.update({
      photo: result.data.url
    });

    // Lấy thông tin user đã cập nhật
    const updatedUser = await User.findByPk(userId);

    res.json({
      success: true,
      message: `Upload ảnh đại diện thành công (${result.data.mode})`,
      data: {
        user: updatedUser,
        photo: result.data
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi upload ảnh',
      error: error.message
    });
  }
});

// API Get User Photo - GET /users/:id/photo
app.get('/users/:id/photo', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Kiểm tra user có tồn tại không
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    if (!user.photo) {
      return res.status(404).json({
        success: false,
        message: 'User chưa có ảnh đại diện'
      });
    }

    // Nếu là local file, redirect đến static file
    if (!user.photo.includes('amazonaws.com')) {
      return res.redirect(user.photo);
    }

    // Nếu là S3 file, tạo presigned URL mới
    try {
      const { generatePresignedUrl } = require('./config/aws-s3');
      
      // Extract key từ URL cũ
      const urlParts = user.photo.split('/');
      const key = `user-photos/${urlParts[urlParts.length - 1].split('?')[0]}`;
      
      const presignedResult = await generatePresignedUrl(key, 3600); // 1 hour
      
      if (presignedResult.success) {
        return res.redirect(presignedResult.url);
      } else {
        return res.status(500).json({
          success: false,
          message: 'Không thể tạo URL xem ảnh',
          error: presignedResult.error
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo URL xem ảnh',
        error: error.message
      });
    }

  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy ảnh',
      error: error.message
    });
  }
});

// Serve static files từ thư mục uploads (cho cả local và S3 mode)
// Cần thiết cho hybrid system: có thể có cả local và S3 files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// API Users - POST /users/:id/upload-photo-local (Force local upload)
app.post('/users/:id/upload-photo-local', uploadSingleLocal, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Kiểm tra user có tồn tại không
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Kiểm tra file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file ảnh được upload'
      });
    }

    // Process uploaded file with forced local mode
    const result = await processUploadedFileLocal(req.file);

    // Xóa ảnh cũ nếu có (chỉ xóa local files)
    if (user.photo && user.photo.startsWith('/uploads/')) {
      await deleteUploadedFile(user.photo);
    }

    // Cập nhật database với đường dẫn ảnh local
    await user.update({
      photo: result.url
    });

    // Lấy thông tin user đã cập nhật
    const updatedUser = await User.findByPk(userId);

    res.json({
      success: true,
      message: `Upload ảnh đại diện thành công (LOCAL mode - forced)`,
      data: {
        user: updatedUser,
        photo: result
      }
    });

  } catch (error) {
    console.error('Upload local error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi upload ảnh local',
      error: error.message
    });
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Analytics API endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        // Update storage stats trước khi trả về
        const [users] = await sequelize.query('SELECT * FROM users');
        await analytics.updateStorageStats(users);
        
        const analyticsData = analytics.getAnalytics();
        const dailyStats = analytics.getDailyStats(7);
        
        res.json({
            ...analyticsData,
            dailyStats
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy analytics data'
        });
    }
});

// Batch operations API endpoints
app.post('/api/batch/migrate-all-s3', async (req, res) => {
    try {
        const result = await batchOperations.migrateAllToS3(sequelize);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Lỗi migration: ${error.message}`
        });
    }
});

app.post('/api/batch/cleanup-unused', async (req, res) => {
    try {
        const result = await batchOperations.cleanupUnusedFiles(sequelize);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Lỗi cleanup: ${error.message}`
        });
    }
});

app.post('/api/batch/bulk-assign-s3', async (req, res) => {
    try {
        const result = await batchOperations.bulkAssignS3Photos(sequelize);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Lỗi bulk assign: ${error.message}`
        });
    }
});

app.post('/api/batch/verify-integrity', async (req, res) => {
    try {
        const result = await batchOperations.verifyFileIntegrity(sequelize);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Lỗi verification: ${error.message}`
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
      'POST /users/:id/upload-photo',
      'POST /users/:id/upload-photo-local'
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
  console.log(`   POST /users/:id/upload-photo-local - Force local upload`);
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