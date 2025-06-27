require('dotenv').config();
const User = require('./models/User');
const { generatePresignedUrl, listS3Objects } = require('./config/aws-s3');
const { initDatabase } = require('./config/init-db');

async function assignS3PhotoToUser(userId, s3Key) {
    console.log(`🔗 Gán ảnh S3 cho User ID ${userId}...`);
    
    try {
        // Khởi tạo database connection
        await initDatabase();
        
        // Lấy thông tin user
        const user = await User.findByPk(userId);
        if (!user) {
            console.log(`❌ Không tìm thấy User ID ${userId}`);
            return;
        }
        
        console.log(`👤 User: ${user.name} (${user.email})`);
        
        // Validate S3 key format
        if (!s3Key.startsWith('user-photos/')) {
            s3Key = `user-photos/${s3Key}`;
        }
        
        console.log(`📁 S3 Key: ${s3Key}`);
        
        // Tạo presigned URL để kiểm tra file tồn tại
        console.log(`🔍 Kiểm tra file tồn tại trên S3...`);
        const presignedResult = await generatePresignedUrl(s3Key, 3600);
        
        if (!presignedResult.success) {
            console.log(`❌ File không tồn tại hoặc lỗi S3: ${presignedResult.error}`);
            console.log(`💡 Gợi ý: Kiểm tra lại tên file hoặc dùng lệnh list để xem files có sẵn`);
            return;
        }
        
        // Backup ảnh cũ
        const oldPhoto = user.photo;
        if (oldPhoto) {
            console.log(`📸 Ảnh cũ: ${oldPhoto}`);
        } else {
            console.log(`📸 User chưa có ảnh`);
        }
        
        // Tạo fake S3 URL pattern để endpoint /users/:id/photo có thể xử lý
        // Pattern: https://bucket.s3.region.amazonaws.com/key?params
        const fakeS3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}?assigned=true`;
        
        // Cập nhật database với S3 URL pattern
        await user.update({
            photo: fakeS3Url
        });
        
        console.log(`✅ Gán ảnh thành công!`);
        console.log(`📁 S3 Key: ${s3Key}`);
        console.log(`📸 Database URL: ${fakeS3Url}`);
        console.log(`🔗 Xem ảnh: http://localhost:3001/users/${userId}/photo`);
        console.log(`💡 URL sẽ được tự động refresh mỗi lần xem`);
        
    } catch (error) {
        console.error('❌ Assign photo error:', error);
    }
    
    process.exit(0);
}

async function listS3Photos() {
    console.log(`📋 Danh sách ảnh có sẵn trên S3 bucket...`);
    
    try {
        // List objects trong bucket (nếu function có sẵn)
        if (typeof listS3Objects === 'function') {
            const listResult = await listS3Objects('user-photos/');
            
            if (listResult.success && listResult.data.length > 0) {
                console.log(`\n📁 Found ${listResult.data.length} files:`);
                listResult.data.forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.key} (${file.size} bytes)`);
                });
            } else {
                console.log(`📭 Không có file nào trong bucket hoặc lỗi list: ${listResult.error}`);
            }
        } else {
            console.log(`⚠️  Function listS3Objects chưa được implement`);
            console.log(`💡 Bạn có thể check AWS S3 Console để xem files có sẵn`);
        }
        
    } catch (error) {
        console.log(`❌ List error: ${error.message}`);
    }
}

// Lấy arguments từ command line
const command = process.argv[2];
const userId = process.argv[3];
const s3Key = process.argv[4];

if (!command) {
    console.log('❌ Thiếu command');
    console.log('📖 Cách sử dụng:');
    console.log('');
    console.log('🔗 Gán ảnh S3 cho user:');
    console.log('   node assign-s3-photo.js assign <USER_ID> <S3_KEY>');
    console.log('');
    console.log('📋 List ảnh có sẵn:');
    console.log('   node assign-s3-photo.js list');
    console.log('');
    console.log('💡 Ví dụ:');
    console.log('   node assign-s3-photo.js list');
    console.log('   node assign-s3-photo.js assign 5 "user-1-migrated.png"');
    console.log('   node assign-s3-photo.js assign 5 "abc123.jpg"');
    console.log('');
    console.log('📝 Note: S3_KEY có thể có hoặc không có prefix "user-photos/"');
    process.exit(1);
}

if (command === 'list') {
    listS3Photos();
} else if (command === 'assign') {
    if (!userId || !s3Key) {
        console.log('❌ Thiếu tham số');
        console.log('📖 Cách sử dụng: node assign-s3-photo.js assign <USER_ID> <S3_KEY>');
        console.log('💡 Ví dụ: node assign-s3-photo.js assign 5 "user-1-migrated.png"');
        process.exit(1);
    }
    
    assignS3PhotoToUser(parseInt(userId), s3Key);
} else {
    console.log('❌ Command không hợp lệ');
    console.log('📖 Chỉ hỗ trợ: "list" hoặc "assign"');
    process.exit(1);
} 