const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadToS3, deleteFromS3, testS3Connection } = require('./aws-s3');

// Load environment variables
require('dotenv').config();

// Upload mode từ environment variable
const UPLOAD_MODE = process.env.UPLOAD_MODE || 'local'; // 'local' hoặc 's3'

// Cấu hình multer cho local storage (hoặc temp storage cho S3)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Thư mục lưu file (local) hoặc temp (S3)
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: uuid + extension
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// Cấu hình multer cho memory storage (dành cho S3)
const memoryStorage = multer.memoryStorage();

// File filter - chỉ cho phép file ảnh
const fileFilter = (req, file, cb) => {
  // Kiểm tra mimetype
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh (jpg, png, gif, webp)'), false);
  }
};

// Cấu hình upload với storage phù hợp
const upload = multer({
  storage: UPLOAD_MODE === 's3' ? memoryStorage : storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // Default 5MB
    files: 1 // Chỉ cho phép upload 1 file
  }
});

// Middleware để handle lỗi upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn! Kích thước tối đa 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ được upload 1 file'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Field name không hợp lệ. Sử dụng "photo"'
      });
    }
  }
  
  if (error.message.includes('Chỉ cho phép upload file ảnh')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  // Lỗi khác
  return res.status(500).json({
    success: false,
    message: 'Lỗi upload file'
  });
};

// Process uploaded file based on mode
const processUploadedFile = async (file) => {
  if (!file) {
    throw new Error('Không có file được upload');
  }

  if (UPLOAD_MODE === 's3') {
    // Upload to S3
    const s3Result = await uploadToS3(file, file.originalname);
    
    if (!s3Result.success) {
      throw new Error(`S3 Upload failed: ${s3Result.error}`);
    }
    
    return {
      mode: 's3',
      filename: s3Result.data.key,
      url: `/${s3Result.data.key}`,
      size: s3Result.data.size,
      mimetype: s3Result.data.mimetype,
      originalName: s3Result.data.originalName,
      bucket: s3Result.data.bucket,
      etag: s3Result.data.etag,
      s3Key: s3Result.data.key
    };
  } else {
    // Local storage
    return {
      mode: 'local',
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
      path: file.path
    };
  }
};

// Delete uploaded file based on mode
const deleteUploadedFile = async (photoUrl) => {
  if (!photoUrl) return { success: true };

  if (photoUrl.startsWith('/user-photos/')) {
    // S3 URI path format - Remove leading slash để get S3 key
    const s3Key = photoUrl.substring(1);
    const deleteResult = await deleteFromS3(s3Key);
    return deleteResult;
  } else if (UPLOAD_MODE === 's3' && photoUrl.includes('amazonaws.com')) {
    // Legacy S3 full URL format - Extract S3 key from URL
    const urlParts = photoUrl.split('/');
    const key = urlParts.slice(-2).join('/'); // user-photos/uuid.ext
    
    const deleteResult = await deleteFromS3(key);
    return deleteResult;
  } else if (photoUrl.startsWith('/uploads/')) {
    // Local file deletion
    const fs = require('fs');
    const filePath = path.join(process.cwd(), 'uploads', path.basename(photoUrl));
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Local file delete error:', error);
      return { success: false, error: error.message };
    }
  }
  
  return { success: true };
};

// Get upload mode info
const getUploadInfo = async () => {
  const info = {
    mode: UPLOAD_MODE,
    maxFileSize: process.env.MAX_FILE_SIZE || '5MB',
    supportedFormats: ['JPG', 'PNG', 'GIF', 'WEBP']
  };

  if (UPLOAD_MODE === 's3') {
    const s3Test = await testS3Connection();
    info.s3Status = s3Test;
  }

  return info;
};

// Middleware upload single file với field name "photo"
const uploadSingle = upload.single('photo');

// Process uploaded file with forced mode
const processUploadedFileLocal = async (file) => {
  if (!file) {
    throw new Error('Không có file được upload');
  }

  // Force local storage mode
  return {
    mode: 'local',
    filename: file.filename,
    url: `/uploads/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
    originalName: file.originalname,
    path: file.path
  };
};

// Force local upload multer config
const localUpload = multer({
  storage: storage, // Always use disk storage for local
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // Default 5MB
    files: 1 // Chỉ cho phép upload 1 file
  }
});

const uploadSingleLocal = localUpload.single('photo');

module.exports = {
  uploadSingle,
  uploadSingleLocal,
  handleUploadError,
  processUploadedFile,
  processUploadedFileLocal,
  deleteUploadedFile,
  getUploadInfo,
  UPLOAD_MODE
}; 