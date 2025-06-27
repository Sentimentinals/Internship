require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const User = require('./models/User');
const { uploadToS3, generatePresignedUrl } = require('./config/aws-s3');
const { initDatabase } = require('./config/init-db');

async function migrateUser(userId, targetMode) {
    console.log(`🔄 Bắt đầu migrate User ID ${userId} sang ${targetMode.toUpperCase()}...`);
    
    try {
        // Khởi tạo database connection
        await initDatabase();
        
        // Lấy thông tin user
        const user = await User.findByPk(userId);
        if (!user) {
            console.log(`❌ Không tìm thấy User ID ${userId}`);
            return;
        }
        
        if (!user.photo) {
            console.log(`❌ User ID ${userId} chưa có ảnh`);
            return;
        }
        
        const isS3 = user.photo.includes('amazonaws.com');
        const isLocal = user.photo.startsWith('/uploads/');
        const currentMode = isS3 ? 's3' : 'local';
        
        console.log(`📁 User ID ${userId} - ${user.name}`);
        console.log(`   Current: ${currentMode.toUpperCase()}`);
        console.log(`   Target: ${targetMode.toUpperCase()}`);
        console.log(`   Photo: ${user.photo}`);
        
        // Kiểm tra đã ở target mode chưa
        if (currentMode === targetMode) {
            console.log(`✅ User ID ${userId} đã ở ${targetMode.toUpperCase()} mode rồi!`);
            return;
        }
        
        if (targetMode === 's3') {
            // LOCAL → S3
            await migrateLocalToS3(user);
        } else if (targetMode === 'local') {
            // S3 → LOCAL
            await migrateS3ToLocal(user);
        } else {
            console.log(`❌ Target mode không hợp lệ: ${targetMode}`);
            console.log(`📖 Chỉ hỗ trợ: 's3' hoặc 'local'`);
            return;
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
    
    process.exit(0);
}

async function migrateLocalToS3(user) {
    console.log(`\n📤 LOCAL → S3 Migration`);
    
    if (!user.photo.startsWith('/uploads/')) {
        console.log(`❌ Ảnh không phải local file: ${user.photo}`);
        return;
    }
    
    // Đường dẫn file local
    const localPath = path.join(__dirname, user.photo);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(localPath)) {
        console.log(`❌ File không tồn tại: ${localPath}`);
        return;
    }
    
    // Đọc file
    const fileBuffer = fs.readFileSync(localPath);
    const stats = fs.statSync(localPath);
    const ext = path.extname(localPath);
    const originalName = `user-${user.id}-migrated${ext}`;
    
    // Tạo file object giống multer
    const file = {
        buffer: fileBuffer,
        size: stats.size,
        mimetype: getMimeType(ext),
        originalname: originalName
    };
    
    // Upload lên S3
    console.log(`   📤 Uploading to S3...`);
    const result = await uploadToS3(file, originalName);
    
    if (result.success) {
        // Backup thông tin cũ
        const oldPhoto = user.photo;
        
        // Cập nhật database với S3 URL
        await user.update({
            photo: result.data.url
        });
        
        console.log(`   ✅ Migration thành công!`);
        console.log(`   Old (Local): ${oldPhoto}`);
        console.log(`   New (S3): ${result.data.url}`);
        
        // Tùy chọn: Xóa file local
        console.log(`\n🗑️  Có thể xóa file local để tiết kiệm không gian:`);
        console.log(`   rm "${localPath}"`);
        
    } else {
        console.log(`   ❌ Upload S3 thất bại: ${result.error}`);
    }
}

async function migrateS3ToLocal(user) {
    console.log(`\n📥 S3 → LOCAL Migration`);
    
    if (!user.photo.includes('amazonaws.com')) {
        console.log(`❌ Ảnh không phải S3 file: ${user.photo}`);
        return;
    }
    
    try {
        // Extract key từ S3 URL
        const urlParts = user.photo.split('/');
        const keyWithParams = urlParts[urlParts.length - 1];
        const key = `user-photos/${keyWithParams.split('?')[0]}`;
        
        // Tạo presigned URL để download
        console.log(`   📤 Tạo download URL...`);
        const presignedResult = await generatePresignedUrl(key, 3600);
        
        if (!presignedResult.success) {
            console.log(`   ❌ Không thể tạo download URL: ${presignedResult.error}`);
            return;
        }
        
        // Download file từ S3
        console.log(`   📥 Downloading từ S3...`);
        const ext = path.extname(keyWithParams.split('?')[0]);
        const filename = `${require('uuid').v4()}${ext}`;
        const localPath = path.join(__dirname, 'uploads', filename);
        
        // Đảm bảo thư mục uploads tồn tại
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        await downloadFile(presignedResult.url, localPath);
        
        // Backup thông tin cũ
        const oldPhoto = user.photo;
        const newPhoto = `/uploads/${filename}`;
        
        // Cập nhật database với local path
        await user.update({
            photo: newPhoto
        });
        
        console.log(`   ✅ Migration thành công!`);
        console.log(`   Old (S3): ${oldPhoto}`);
        console.log(`   New (Local): ${newPhoto}`);
        console.log(`   File path: ${localPath}`);
        
    } catch (error) {
        console.log(`   ❌ S3 → Local migration failed: ${error.message}`);
    }
}

function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(destination, () => {}); // Xóa file lỗi
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function getMimeType(ext) {
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
}

// Lấy arguments từ command line
const userId = process.argv[2];
const targetMode = process.argv[3];

if (!userId || !targetMode) {
    console.log('❌ Thiếu tham số');
    console.log('📖 Cách sử dụng: node migrate-user-storage.js <USER_ID> <TARGET_MODE>');
    console.log('📖 TARGET_MODE: "s3" hoặc "local"');
    console.log('');
    console.log('🔄 Ví dụ:');
    console.log('   node migrate-user-storage.js 4 s3      # Local → S3');
    console.log('   node migrate-user-storage.js 4 local   # S3 → Local');
    console.log('   node migrate-user-storage.js 1 local   # S3 → Local');
    console.log('   node migrate-user-storage.js 2 s3      # Local → S3');
    process.exit(1);
}

if (!['s3', 'local'].includes(targetMode.toLowerCase())) {
    console.log('❌ TARGET_MODE không hợp lệ');
    console.log('📖 Chỉ hỗ trợ: "s3" hoặc "local"');
    process.exit(1);
}

// Chạy migration
migrateUser(parseInt(userId), targetMode.toLowerCase()); 