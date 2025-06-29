const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// S3 client setup
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * Migrate tất cả local files lên S3
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} - Operation result
 */
async function migrateAllToS3(sequelize) {
    try {
        const results = {
            processed: 0,
            migrated: 0,
            errors: 0,
            details: []
        };

        // Get all users với local photos
        const [users] = await sequelize.query(`
            SELECT id, name, photo 
            FROM users 
            WHERE photo IS NOT NULL 
            AND photo NOT LIKE '%amazonaws.com%' 
            AND photo LIKE '/uploads/%'
        `);

        console.log(`🔄 Found ${users.length} users with local photos to migrate`);
        results.details.push(`Tìm thấy ${users.length} users có ảnh local`);

        for (const user of users) {
            results.processed++;
            
            try {
                const localPath = path.join(process.cwd(), user.photo);
                
                if (!fs.existsSync(localPath)) {
                    results.errors++;
                    results.details.push(`❌ File không tồn tại: ${user.photo} (User ${user.id})`);
                    continue;
                }

                // Read file
                const fileBuffer = fs.readFileSync(localPath);
                const fileName = path.basename(user.photo);
                const s3Key = `user-photos/${Date.now()}-${fileName}`;

                // Upload to S3
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: s3Key,
                    Body: fileBuffer,
                    ContentType: 'image/jpeg'
                };

                await s3Client.send(new PutObjectCommand(uploadParams));

                // Update database với URI path thay vì full URL
                const uriPath = `/${s3Key}`;
                await sequelize.query(
                    'UPDATE users SET photo = ? WHERE id = ?',
                    { replacements: [uriPath, user.id] }
                );

                results.migrated++;
                results.details.push(`✅ Migrated User ${user.id} (${user.name}): ${fileName} -> ${uriPath}`);

                // Optional: Delete local file after successful upload
                // fs.unlinkSync(localPath);

            } catch (error) {
                results.errors++;
                results.details.push(`❌ Migration failed User ${user.id}: ${error.message}`);
            }
        }

        return {
            success: true,
            message: `Migration hoàn thành: ${results.migrated}/${results.processed} files`,
            data: results
        };

    } catch (error) {
        console.error('❌ Migration error:', error);
        return {
            success: false,
            message: `Lỗi migration: ${error.message}`,
            data: null
        };
    }
}

/**
 * Cleanup unused files trong thư mục uploads
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} - Operation result
 */
async function cleanupUnusedFiles(sequelize) {
    try {
        const results = {
            scanned: 0,
            deleted: 0,
            errors: 0,
            sizeFreed: 0,
            details: []
        };

        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            return {
                success: true,
                message: 'Thư mục uploads không tồn tại',
                data: results
            };
        }

        // Get all files trong uploads directory
        const files = fs.readdirSync(uploadsDir).filter(file => {
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase());
        });

        results.scanned = files.length;
        results.details.push(`Quét ${files.length} files trong thư mục uploads`);

        // Get all photo paths từ database
        const [dbPhotos] = await sequelize.query('SELECT photo FROM users WHERE photo IS NOT NULL');
        const usedFiles = new Set();
        
        dbPhotos.forEach(row => {
            if (row.photo && row.photo.startsWith('/uploads/')) {
                usedFiles.add(path.basename(row.photo));
            }
        });

        // Check và delete unused files
        for (const file of files) {
            try {
                if (!usedFiles.has(file)) {
                    const filePath = path.join(uploadsDir, file);
                    const stats = fs.statSync(filePath);
                    
                    fs.unlinkSync(filePath);
                    
                    results.deleted++;
                    results.sizeFreed += stats.size;
                    results.details.push(`🗑️ Deleted: ${file} (${formatBytes(stats.size)})`);
                }
            } catch (error) {
                results.errors++;
                results.details.push(`❌ Error deleting ${file}: ${error.message}`);
            }
        }

        return {
            success: true,
            message: `Cleanup hoàn thành: Xóa ${results.deleted} files, tiết kiệm ${formatBytes(results.sizeFreed)}`,
            data: results
        };

    } catch (error) {
        console.error('❌ Cleanup error:', error);
        return {
            success: false,
            message: `Lỗi cleanup: ${error.message}`,
            data: null
        };
    }
}

/**
 * Bulk assign S3 photos cho users chưa có ảnh
 * @param {Object} sequelize - Sequelize instance  
 * @returns {Object} - Operation result
 */
async function bulkAssignS3Photos(sequelize) {
    try {
        const results = {
            usersWithoutPhotos: 0,
            availableS3Photos: 0,
            assigned: 0,
            errors: 0,
            details: []
        };

        // Get users without photos
        const [usersWithoutPhotos] = await sequelize.query(`
            SELECT id, name 
            FROM users 
            WHERE photo IS NULL OR photo = ''
        `);

        results.usersWithoutPhotos = usersWithoutPhotos.length;

        if (usersWithoutPhotos.length === 0) {
            return {
                success: true,
                message: 'Tất cả users đã có ảnh',
                data: results
            };
        }

        // Get available S3 photos
        const listParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: 'user-photos/'
        };

        const s3Objects = await s3Client.send(new ListObjectsV2Command(listParams));
        const availablePhotos = s3Objects.Contents || [];
        
        results.availableS3Photos = availablePhotos.length;
        results.details.push(`Tìm thấy ${usersWithoutPhotos.length} users chưa có ảnh`);
        results.details.push(`Có ${availablePhotos.length} ảnh S3 khả dụng`);

        if (availablePhotos.length === 0) {
            return {
                success: false,
                message: 'Không có ảnh S3 nào để assign',
                data: results
            };
        }

        // Shuffle photos for random assignment
        const shuffledPhotos = [...availablePhotos].sort(() => Math.random() - 0.5);

        // Assign photos to users
        for (let i = 0; i < Math.min(usersWithoutPhotos.length, shuffledPhotos.length); i++) {
            try {
                const user = usersWithoutPhotos[i];
                const photo = shuffledPhotos[i];
                
                // Lưu URI path thay vì full URL
                const uriPath = `/${photo.Key}`;

                await sequelize.query(
                    'UPDATE users SET photo = ? WHERE id = ?',
                    { replacements: [uriPath, user.id] }
                );

                results.assigned++;
                results.details.push(`📸 Assigned ${path.basename(photo.Key)} to User ${user.id} (${user.name}) -> ${uriPath}`);

            } catch (error) {
                results.errors++;
                results.details.push(`❌ Error assigning photo to User ${usersWithoutPhotos[i].id}: ${error.message}`);
            }
        }

        return {
            success: true,
            message: `Assignment hoàn thành: ${results.assigned} users được gán ảnh`,
            data: results
        };

    } catch (error) {
        console.error('❌ Bulk assign error:', error);
        return {
            success: false,
            message: `Lỗi bulk assign: ${error.message}`,
            data: null
        };
    }
}

/**
 * Verify file integrity cho tất cả user photos
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} - Operation result
 */
async function verifyFileIntegrity(sequelize) {
    try {
        const results = {
            checked: 0,
            localValid: 0,
            localInvalid: 0,
            s3Valid: 0,
            s3Invalid: 0,
            errors: 0,
            details: []
        };

        // Get all users với photos
        const [users] = await sequelize.query(`
            SELECT id, name, photo 
            FROM users 
            WHERE photo IS NOT NULL AND photo != ''
        `);

        results.checked = users.length;
        results.details.push(`Kiểm tra ${users.length} user photos`);

        for (const user of users) {
            try {
                if (user.photo.startsWith('/user-photos/')) {
                    // Verify S3 photo bằng URI path
                    const s3Key = user.photo.substring(1); // Remove leading slash
                    
                    try {
                        const listParams = {
                            Bucket: process.env.AWS_S3_BUCKET,
                            Prefix: s3Key,
                            MaxKeys: 1
                        };
                        
                        const result = await s3Client.send(new ListObjectsV2Command(listParams));
                        
                        if (result.Contents && result.Contents.length > 0) {
                            results.s3Valid++;
                            results.details.push(`✅ S3 OK: User ${user.id} - ${path.basename(s3Key)}`);
                        } else {
                            results.s3Invalid++;
                            results.details.push(`❌ S3 Missing: User ${user.id} - ${user.photo}`);
                        }
                    } catch (error) {
                        results.s3Invalid++;
                        results.details.push(`❌ S3 Error: User ${user.id} - ${error.message}`);
                    }
                    
                } else if (user.photo.includes('amazonaws.com')) {
                    // Legacy full URL format - Verify S3 photo
                    try {
                        const s3Key = user.photo.split('.com/')[1];
                        const listParams = {
                            Bucket: process.env.AWS_S3_BUCKET,
                            Prefix: s3Key,
                            MaxKeys: 1
                        };
                        
                        const result = await s3Client.send(new ListObjectsV2Command(listParams));
                        
                        if (result.Contents && result.Contents.length > 0) {
                            results.s3Valid++;
                            results.details.push(`✅ S3 OK (Legacy): User ${user.id} - ${path.basename(s3Key)}`);
                        } else {
                            results.s3Invalid++;
                            results.details.push(`❌ S3 Missing (Legacy): User ${user.id} - ${user.photo}`);
                        }
                    } catch (error) {
                        results.s3Invalid++;
                        results.details.push(`❌ S3 Error (Legacy): User ${user.id} - ${error.message}`);
                    }
                    
                } else if (user.photo.startsWith('/uploads/')) {
                    // Verify local photo
                    const localPath = path.join(process.cwd(), user.photo);
                    
                    if (fs.existsSync(localPath)) {
                        results.localValid++;
                        const stats = fs.statSync(localPath);
                        results.details.push(`✅ Local OK: User ${user.id} - ${path.basename(localPath)} (${formatBytes(stats.size)})`);
                    } else {
                        results.localInvalid++;
                        results.details.push(`❌ Local Missing: User ${user.id} - ${user.photo}`);
                    }
                }
                
            } catch (error) {
                results.errors++;
                results.details.push(`❌ Verify error User ${user.id}: ${error.message}`);
            }
        }

        const totalValid = results.localValid + results.s3Valid;
        const totalInvalid = results.localInvalid + results.s3Invalid;

        return {
            success: true,
            message: `Verification hoàn thành: ${totalValid} valid, ${totalInvalid} invalid`,
            data: results
        };

    } catch (error) {
        console.error('❌ Verify error:', error);
        return {
            success: false,
            message: `Lỗi verification: ${error.message}`,
            data: null
        };
    }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    migrateAllToS3,
    cleanupUnusedFiles,
    bulkAssignS3Photos,
    verifyFileIntegrity
}; 