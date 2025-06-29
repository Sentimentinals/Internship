require('dotenv').config();
const { sequelize } = require('./config/database');

async function checkDuplicatesAndOptimize() {
    try {
        await sequelize.authenticate();
        console.log('🔍 Kiểm tra trùng lặp URLs/URIs và tối ưu hóa...\n');
        
        // 1. Check duplicate photo paths
        const [duplicates] = await sequelize.query(`
            SELECT 
                photo, 
                COUNT(*) as count,
                GROUP_CONCAT(id) as user_ids,
                GROUP_CONCAT(name) as user_names
            FROM users 
            WHERE photo IS NOT NULL 
            GROUP BY photo 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        `);
        
        console.log('=== 🔄 Duplicate Photo Analysis ===');
        if (duplicates.length > 0) {
            console.log(`❌ Phát hiện ${duplicates.length} trường hợp trùng lặp:`);
            duplicates.forEach(dup => {
                console.log(`\n📸 Photo: ${dup.photo}`);
                console.log(`👥 Users: ${dup.user_names} (IDs: ${dup.user_ids})`);
                console.log(`🔢 Count: ${dup.count} users sử dụng cùng ảnh`);
            });
        } else {
            console.log('✅ Không có trùng lặp photo paths');
        }
        
        // 2. Analyze file distribution
        const [distribution] = await sequelize.query(`
            SELECT 
                CASE 
                    WHEN photo LIKE '/user-photos/%' THEN 'S3 URI'
                    WHEN photo LIKE '/uploads/%' THEN 'Local URI'
                    WHEN photo LIKE '%amazonaws.com%' THEN 'Legacy URL'
                    ELSE 'Unknown'
                END as type,
                COUNT(*) as count,
                GROUP_CONCAT(id) as user_ids
            FROM users 
            WHERE photo IS NOT NULL
            GROUP BY type
            ORDER BY count DESC
        `);
        
        console.log('\n=== 📊 URI Distribution Analysis ===');
        distribution.forEach(dist => {
            console.log(`${dist.type}: ${dist.count} users (IDs: ${dist.user_ids})`);
        });
        
        // 3. Check S3 filename patterns
        const [s3Files] = await sequelize.query(`
            SELECT 
                photo,
                id,
                name,
                SUBSTRING_INDEX(photo, '/', -1) as filename
            FROM users 
            WHERE photo LIKE '/user-photos/%'
            ORDER BY filename
        `);
        
        console.log('\n=== 📁 S3 Files Analysis ===');
        const filenameMap = {};
        s3Files.forEach(file => {
            const filename = file.filename;
            if (!filenameMap[filename]) {
                filenameMap[filename] = [];
            }
            filenameMap[filename].push({
                id: file.id,
                name: file.name,
                uri: file.photo
            });
        });
        
        // Check for same filename used by multiple users
        const duplicateFilenames = Object.entries(filenameMap).filter(([filename, users]) => users.length > 1);
        
        if (duplicateFilenames.length > 0) {
            console.log('⚠️  Phát hiện trùng filename (có thể gây conflict):');
            duplicateFilenames.forEach(([filename, users]) => {
                console.log(`\n📄 Filename: ${filename}`);
                users.forEach(user => {
                    console.log(`   User ${user.id} (${user.name}): ${user.uri}`);
                });
            });
        } else {
            console.log('✅ Không có trùng lặp S3 filenames');
        }
        
        // 4. Database optimization suggestions
        console.log('\n=== 💡 Optimization Recommendations ===');
        
        const [stats] = await sequelize.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(photo) as users_with_photos,
                COUNT(CASE WHEN photo LIKE '/user-photos/%' THEN 1 END) as s3_users,
                COUNT(CASE WHEN photo LIKE '/uploads/%' THEN 1 END) as local_users,
                COUNT(CASE WHEN photo IS NULL THEN 1 END) as users_without_photos
            FROM users
        `);
        
        const stat = stats[0];
        console.log(`📊 Total users: ${stat.total_users}`);
        console.log(`📸 Users với photos: ${stat.users_with_photos}`);
        console.log(`☁️  S3 users: ${stat.s3_users}`);
        console.log(`💾 Local users: ${stat.local_users}`);
        console.log(`👤 Users chưa có ảnh: ${stat.users_without_photos}`);
        
        // Optimization suggestions
        console.log('\n🎯 Suggestions:');
        
        if (duplicateFilenames.length > 0) {
            console.log('1. ⚠️  Rename duplicate filenames để tránh conflict');
        } else {
            console.log('1. ✅ Filenames unique - Good!');
        }
        
        if (stat.local_users > 0 && stat.s3_users > 0) {
            console.log('2. 🔄 Consider migrating local files to S3 cho consistency');
        } else if (stat.s3_users > 0) {
            console.log('2. ✅ S3-focused storage - Good for scalability!');
        }
        
        if (stat.users_without_photos > 0) {
            console.log(`3. 👤 ${stat.users_without_photos} users chưa có ảnh - có thể assign default avatars`);
        } else {
            console.log('3. ✅ Tất cả users đều có ảnh!');
        }
        
        // 5. Performance check
        console.log('\n=== ⚡ Performance Analysis ===');
        const avgPathLength = await sequelize.query(`
            SELECT AVG(LENGTH(photo)) as avg_length 
            FROM users 
            WHERE photo IS NOT NULL
        `);
        
        console.log(`📏 Average URI length: ${Math.round(avgPathLength[0][0].avg_length)} characters`);
        
        if (avgPathLength[0][0].avg_length > 100) {
            console.log('⚠️  URIs khá dài - có thể optimize bằng cách shorten paths');
        } else {
            console.log('✅ URI lengths reasonable');
        }
        
        console.log('\n🎉 Analysis hoàn thành!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkDuplicatesAndOptimize(); 