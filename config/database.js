const { Sequelize } = require('sequelize');

// Tạo connection tạm để tạo database với UTF-8
const createDatabaseIfNotExists = async () => {
  const tempSequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '1111',
    // Không chỉ định database để có thể tạo database
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    logging: false
  });

  try {
    // Tạo database với charset UTF-8 hỗ trợ tiếng Việt
    await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS \`nodejs_cloud_api\` 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci;`);
    console.log('✅ Database "nodejs_cloud_api" đã được tạo với UTF-8 support!');
    await tempSequelize.close();
  } catch (error) {
    console.error('❌ Lỗi tạo database:', error.message);
    await tempSequelize.close();
    throw error;
  }
};

// Cấu hình database chính - MySQL 8.0 với UTF-8 full support
const sequelize = new Sequelize({
  // Cho MySQL local (development)
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'nodejs_cloud_api',
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '1111', // Mật khẩu MySQL của bạn
  
  // Cấu hình đặc biệt cho MySQL 8.0 với UTF-8 support
  dialectOptions: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    // Đảm bảo kết nối sử dụng UTF-8
    typeCast: function (field, next) {
      if (field.type === 'VAR_STRING') {
        return field.string();
      }
      return next();
    }
  },
  
  // Cho AWS RDS (production) - sẽ dùng sau
  // host: process.env.RDS_HOSTNAME,
  // port: process.env.RDS_PORT || 3306,
  // database: process.env.RDS_DB_NAME,
  // username: process.env.RDS_USERNAME,
  // password: process.env.RDS_PASSWORD,
  
  // Cấu hình pool connection
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // Logging
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Timezone
  timezone: '+07:00',
  
  // Define options với UTF-8 support
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
});

// Test connection và tạo database nếu chưa có
const testConnection = async () => {
  try {
    // Tạo database trước
    await createDatabaseIfNotExists();
    
    // Thử kết nối với database đã tạo
    await sequelize.authenticate();
    console.log('✅ Kết nối MySQL 8.0 với UTF-8 support thành công!');
    
    // Set connection charset to UTF-8
    await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    console.log('✅ Đã set UTF-8 encoding cho connection!');
    
  } catch (error) {
    console.error('❌ Lỗi kết nối MySQL:', error.message);
    console.log('💡 Gợi ý:');
    console.log('   - Kiểm tra MySQL service có chạy không');
    console.log('   - Kiểm tra username/password (hiện tại: root/1111)');
    console.log('   - MySQL có đang chạy trên port 3306 không?');
  }
};

module.exports = {
  sequelize,
  testConnection
}; 